using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaasPos.Backend.Data;
using SaasPos.Backend.Models;
using System.Text.Json;

namespace SaasPos.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "ADMIN,SUPERVISOR,CAJERO")]
    public class OpticalQuotesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private Guid TenantId => Guid.Parse(User.FindFirst("tenant_id")?.Value ?? Guid.Empty.ToString());
        private Guid UserId => Guid.Parse(User.FindFirst("id")?.Value ?? Guid.Empty.ToString());

        public OpticalQuotesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var quotes = await _context.OpticalQuotes
                .Where(x => x.TenantId == TenantId)
                .OrderByDescending(x => x.CreatedAt)
                .Include(x => x.Customer)
                .ToListAsync();
            return Ok(quotes);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var quote = await _context.OpticalQuotes
                .Include(x => x.Customer)
                .FirstOrDefaultAsync(x => x.Id == id && x.TenantId == TenantId);
            if (quote == null) return NotFound();
            return Ok(quote);
        }

        [HttpPost("prescription")]
        public async Task<IActionResult> SavePrescription([FromBody] OpticalPrescription request)
        {
            var pres = new OpticalPrescription
            {
                TenantId = TenantId,
                OdEsfera = request.OdEsfera,
                OdCilindro = request.OdCilindro,
                OdEje = request.OdEje,
                OdAdicion = request.OdAdicion,
                OiEsfera = request.OiEsfera,
                OiCilindro = request.OiCilindro,
                OiEje = request.OiEje,
                OiAdicion = request.OiAdicion,
            };
            _context.OpticalPrescriptions.Add(pres);
            await _context.SaveChangesAsync();
            return Ok(pres);
        }

        [HttpPost("calculate")]
        public async Task<IActionResult> CalculateQuote([FromBody] CalculateQuoteRequest request)
        {
            var result = new CalculateQuoteResult();

            // Obtener datos de configuración
            var lensType = await _context.LensTypes
                .FirstOrDefaultAsync(x => x.Id == request.LensTypeId && x.TenantId == TenantId);
            if (lensType == null)
                return BadRequest(new { message = "Tipo de lente no encontrado" });

            result.LensTypeBasePrice = lensType.BasePrice;
            result.LensTypeName = lensType.Name;

            // Índice
            if (request.LensIndexId.HasValue)
            {
                var index = await _context.LensIndexes
                    .FirstOrDefaultAsync(x => x.Id == request.LensIndexId && x.TenantId == TenantId);
                if (index != null)
                {
                    result.LensIndexName = index.Name;
                    result.LensIndexAdditionalPrice = index.AdditionalPrice;
                }
            }

            // Rangos de graduación - usa la esfera con mayor valor absoluto (soporta valores negativos)
            var ranges = await _context.GraduationRanges
                .Where(x => x.TenantId == TenantId && x.IsActive)
                .OrderBy(x => x.MinValue)
                .ToListAsync();

            if (ranges.Any())
            {
                var odAbs = Math.Abs(request.OdEsfera);
                var oiAbs = Math.Abs(request.OiEsfera);
                var maxEsfera = Math.Max(odAbs, oiAbs);
                var matchedRange = ranges.FirstOrDefault(r => maxEsfera >= Math.Abs(r.MinValue) && maxEsfera <= Math.Abs(r.MaxValue));
                if (matchedRange != null)
                {
                    result.GraduationCost = matchedRange.AdditionalCost;
                    result.GraduationRangeName = $"{matchedRange.MinValue} a {matchedRange.MaxValue}";
                }
            }

            // Extras
            decimal extrasTotal = 0;
            var extraNames = new List<string>();
            if (request.ExtraIds != null && request.ExtraIds.Any())
            {
                var extras = await _context.LensExtras
                    .Where(x => request.ExtraIds.Contains(x.Id) && x.TenantId == TenantId && x.IsActive)
                    .ToListAsync();
                foreach (var extra in extras)
                {
                    extrasTotal += extra.Price;
                    extraNames.Add(extra.Name);
                }
            }
            result.ExtrasTotalCost = extrasTotal;
            result.ExtraNames = extraNames;

            // Marco
            decimal framePrice = 0;
            decimal lensBasePrice = result.LensTypeBasePrice;
            if (request.FrameProductId.HasValue)
            {
                var product = await _context.Products
                    .FirstOrDefaultAsync(x => x.Id == request.FrameProductId && x.TenantId == TenantId);
                if (product != null)
                {
                    framePrice = product.Price;
                    result.FrameCode = product.InternalCode;
                    result.FrameDescription = product.Name;
                    result.FramePrice = framePrice;
                }

                // Aplicar regla de precio especial de lente según marco
                var frameRule = await _context.FrameLensRules
                    .FirstOrDefaultAsync(x => x.TenantId == TenantId
                        && x.LensTypeId == request.LensTypeId
                        && x.FrameProductId == request.FrameProductId
                        && x.IsActive);
                if (frameRule != null)
                {
                    lensBasePrice = frameRule.SpecialPrice;
                    result.LensTypeBasePrice = lensBasePrice;
                    result.FrameLensRuleApplied = true;
                    result.FrameLensRuleLabel = $"Precio especial combo: {lensBasePrice}";
                }
            }

            // Calcular subtotal
            var subtotal = framePrice
                + lensBasePrice
                + result.GraduationCost
                + result.LensIndexAdditionalPrice
                + result.ExtrasTotalCost;
            result.Subtotal = subtotal;

            // Aplicar reglas promocionales
            var now = DateTime.UtcNow;
            var activeRules = await _context.PromotionalRules
                .Where(x => x.TenantId == TenantId && x.IsActive
                    && (!x.StartDate.HasValue || x.StartDate <= now)
                    && (!x.EndDate.HasValue || x.EndDate >= now))
                .ToListAsync();

            var appliedRules = new List<AppliedRuleInfo>();
            decimal totalDiscount = 0;

            foreach (var rule in activeRules)
            {
                var discount = ApplyRule(rule, request, result);
                if (discount > 0)
                {
                    totalDiscount += discount;
                    appliedRules.Add(new AppliedRuleInfo
                    {
                        RuleId = rule.Id,
                        RuleName = rule.Name,
                        DiscountAmount = discount,
                    });
                }
            }

            result.DiscountAmount = totalDiscount;
            result.Total = Math.Max(0, subtotal - totalDiscount);
            result.AppliedRules = appliedRules;

            return Ok(result);
        }

        [HttpGet("lens-product")]
        public async Task<IActionResult> GetLensProduct()
        {
            // Busca o crea un producto genérico "SERVICIO ÓPTICO" para el tenant
            var existing = await _context.Products
                .FirstOrDefaultAsync(x => x.TenantId == TenantId && x.Name == "SERVICIO ÓPTICO");
            if (existing != null)
                return Ok(new { id = existing.Id, name = existing.Name, price = existing.Price });

            // Crear automáticamente si no existe
            var category = await _context.Categories
                .FirstOrDefaultAsync(x => x.TenantId == TenantId);
            var lensProduct = new Product
            {
                TenantId = TenantId,
                Name = "SERVICIO ÓPTICO",
                Sku = "OPTIC-" + Guid.NewGuid().ToString().Substring(0, 8),
                InternalCode = "OPTIC",
                Price = 0,
                Cost = 0,
                Stock = 9999,
                MinStock = 0,
                CategoryId = category?.Id ?? Guid.Empty,
                IsActive = true,
                SaleType = "UNIT",
                TrackStock = false,
                Status = "ACTIVE",
            };
            _context.Products.Add(lensProduct);
            await _context.SaveChangesAsync();
            return Ok(new { id = lensProduct.Id, name = lensProduct.Name, price = lensProduct.Price });
        }

        [HttpPost("calculate-lens-only")]
        public async Task<IActionResult> CalculateLensOnly([FromBody] CalculateLensOnlyRequest request)
        {
            var result = new CalculateLensOnlyResult();

            // Tipo de lente
            var lensType = await _context.LensTypes
                .FirstOrDefaultAsync(x => x.Id == request.LensTypeId && x.TenantId == TenantId);
            if (lensType == null)
                return BadRequest(new { message = "Tipo de lente no encontrado" });

            decimal lensPrice = lensType.BasePrice;
            result.LensTypeName = lensType.Name;

            // Índice
            if (request.LensIndexId.HasValue)
            {
                var index = await _context.LensIndexes
                    .FirstOrDefaultAsync(x => x.Id == request.LensIndexId && x.TenantId == TenantId);
                if (index != null)
                {
                    result.LensIndexName = index.Name;
                    lensPrice += index.AdditionalPrice;
                }
            }

            // Graduación
            var ranges = await _context.GraduationRanges
                .Where(x => x.TenantId == TenantId && x.IsActive)
                .OrderBy(x => x.MinValue)
                .ToListAsync();
            if (ranges.Any())
            {
                var odAbs = Math.Abs(request.OdEsfera);
                var oiAbs = Math.Abs(request.OiEsfera);
                var maxEsfera = Math.Max(odAbs, oiAbs);
                var matchedRange = ranges.FirstOrDefault(r => maxEsfera >= Math.Abs(r.MinValue) && maxEsfera <= Math.Abs(r.MaxValue));
                if (matchedRange != null)
                {
                    result.GraduationRangeName = $"{matchedRange.MinValue} a {matchedRange.MaxValue}";
                    lensPrice += matchedRange.AdditionalCost;
                }
            }

            // Extras (como toggle buttons: UV, antirreflejo, etc.)
            if (request.ExtraIds != null && request.ExtraIds.Any())
            {
                var extras = await _context.LensExtras
                    .Where(x => request.ExtraIds.Contains(x.Id) && x.TenantId == TenantId && x.IsActive)
                    .ToListAsync();
                foreach (var extra in extras)
                {
                    lensPrice += extra.Price;
                    result.ExtraNames.Add(extra.Name);
                }
            }

            // Aplicar regla de FrameLensRule si viene frameProductId
            if (request.FrameProductId.HasValue)
            {
                var frameRule = await _context.FrameLensRules
                    .FirstOrDefaultAsync(x => x.TenantId == TenantId
                        && x.LensTypeId == request.LensTypeId
                        && x.FrameProductId == request.FrameProductId
                        && x.IsActive);
                if (frameRule != null)
                {
                    lensPrice = lensPrice - lensType.BasePrice + frameRule.SpecialPrice;
                    result.FrameLensRuleApplied = true;
                    result.FrameLensRuleLabel = $"Precio especial combo: {frameRule.SpecialPrice}";
                }
            }

            result.TotalPrice = lensPrice;
            return Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> CreateQuote([FromBody] CreateQuoteRequest request)
        {
            var pres = new OpticalPrescription
            {
                TenantId = TenantId,
                OdEsfera = request.OdEsfera,
                OdCilindro = request.OdCilindro,
                OdEje = request.OdEje,
                OdAdicion = request.OdAdicion,
                OiEsfera = request.OiEsfera,
                OiCilindro = request.OiCilindro,
                OiEje = request.OiEje,
                OiAdicion = request.OiAdicion,
            };
            _context.OpticalPrescriptions.Add(pres);
            await _context.SaveChangesAsync();

            var quote = new OpticalQuote
            {
                TenantId = TenantId,
                CustomerId = request.CustomerId,
                FrameProductId = request.FrameProductId,
                FrameCode = request.FrameCode,
                FrameDescription = request.FrameDescription,
                FrameBrand = request.FrameBrand,
                FramePrice = request.FramePrice,
                LensTypeId = request.LensTypeId,
                LensTypeName = request.LensTypeName,
                LensTypeBasePrice = request.LensTypeBasePrice,
                LensIndexId = request.LensIndexId,
                LensIndexName = request.LensIndexName,
                LensIndexAdditionalPrice = request.LensIndexAdditionalPrice,
                PrescriptionId = pres.Id,
                ExtraIds = JsonSerializer.Serialize(request.ExtraIds ?? new List<Guid>()),
                ExtrasTotalCost = request.ExtrasTotalCost,
                Subtotal = request.Subtotal,
                DiscountAmount = request.DiscountAmount,
                Total = request.Total,
                AppliedRules = JsonSerializer.Serialize(request.AppliedRules ?? new List<AppliedRuleInfo>()),
                Status = "QUOTE",
            };
            _context.OpticalQuotes.Add(quote);
            await _context.SaveChangesAsync();

            return Ok(quote);
        }

        [HttpPut("{id}/convert")]
        public async Task<IActionResult> ConvertToSale(Guid id)
        {
            var quote = await _context.OpticalQuotes
                .FirstOrDefaultAsync(x => x.Id == id && x.TenantId == TenantId);
            if (quote == null) return NotFound();
            if (quote.Status != "QUOTE")
                return BadRequest(new { message = "La cotización ya fue convertida o cancelada" });

            // Crear la venta
            var sale = new Sale
            {
                TenantId = TenantId,
                UserId = UserId,
                CustomerId = quote.CustomerId,
                Total = quote.Total,
                Tax = 0,
                Discount = quote.DiscountAmount,
                PaymentStatus = "PENDING",
                Status = "OPEN",
            };
            _context.Sales.Add(sale);

            // Si hay marco, agregarlo como item
            if (quote.FrameProductId.HasValue)
            {
                var saleItem = new SaleItem
                {
                    SaleId = sale.Id,
                    ProductId = quote.FrameProductId.Value,
                    Quantity = 1,
                    Price = quote.FramePrice ?? 0,
                    Subtotal = quote.FramePrice ?? 0,
                    DiscountApplied = 0,
                };
                _context.SaleItems.Add(saleItem);
            }

            quote.Status = "CONVERTED";
            quote.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { saleId = sale.Id, quote });
        }

        [HttpPut("{id}/cancel")]
        public async Task<IActionResult> CancelQuote(Guid id)
        {
            var quote = await _context.OpticalQuotes
                .FirstOrDefaultAsync(x => x.Id == id && x.TenantId == TenantId);
            if (quote == null) return NotFound();
            quote.Status = "CANCELLED";
            quote.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(quote);
        }

        // ═══════════════════════════════════════════════
        //  PRIVATE HELPERS
        // ═══════════════════════════════════════════════

        private decimal ApplyRule(PromotionalRule rule, CalculateQuoteRequest request, CalculateQuoteResult result)
        {
            switch (rule.RuleType)
            {
                case "FREE_EXTRA":
                    if (request.ExtraIds != null && !string.IsNullOrEmpty(rule.TargetId))
                    {
                        var targetExtraId = Guid.Parse(rule.TargetId);
                        if (request.ExtraIds.Contains(targetExtraId))
                        {
                            var extra = _context.LensExtras.FirstOrDefault(x => x.Id == targetExtraId);
                            if (extra != null) return extra.Price;
                        }
                    }
                    break;

                case "DISCOUNT_LENS":
                    if (request.LensTypeId == Guid.Parse(rule.TargetId ?? Guid.Empty.ToString()))
                    {
                        if (decimal.TryParse(rule.BenefitValue, out var discPct))
                            return result.LensTypeBasePrice * discPct / 100;
                    }
                    break;

                case "DISCOUNT_FRAME":
                    if (request.FrameProductId == Guid.Parse(rule.TargetId ?? Guid.Empty.ToString()))
                    {
                        if (decimal.TryParse(rule.BenefitValue, out var discPct))
                            return (result.FramePrice ?? 0) * discPct / 100;
                    }
                    break;

                case "SPECIAL_COMBO":
                    if (request.FrameProductId == Guid.Parse(rule.TargetId ?? Guid.Empty.ToString())
                        && request.LensTypeId == Guid.Parse(rule.ConditionValue ?? Guid.Empty.ToString()))
                    {
                        if (decimal.TryParse(rule.BenefitValue, out var specialPrice))
                            return (result.FramePrice ?? 0) + result.LensTypeBasePrice - specialPrice;
                    }
                    break;

                case "DISCOUNT_TOTAL":
                    if (decimal.TryParse(rule.BenefitValue, out var totalDiscPct))
                        return result.Subtotal * totalDiscPct / 100;
                    break;
            }
            return 0;
        }
    }

    // ═══════════════════════════════════════════════════
    //  REQUEST / RESPONSE DTOs
    // ═══════════════════════════════════════════════════

    public class CalculateQuoteRequest
    {
        public Guid LensTypeId { get; set; }
        public Guid? LensIndexId { get; set; }
        public Guid? FrameProductId { get; set; }
        public List<Guid>? ExtraIds { get; set; }
        public decimal OdEsfera { get; set; }
        public decimal OdCilindro { get; set; }
        public decimal OdEje { get; set; }
        public decimal OdAdicion { get; set; }
        public decimal OiEsfera { get; set; }
        public decimal OiCilindro { get; set; }
        public decimal OiEje { get; set; }
        public decimal OiAdicion { get; set; }
    }

    public class CalculateQuoteResult
    {
        public string LensTypeName { get; set; } = "";
        public decimal LensTypeBasePrice { get; set; }
        public string? LensIndexName { get; set; }
        public decimal LensIndexAdditionalPrice { get; set; }
        public string? GraduationRangeName { get; set; }
        public decimal GraduationCost { get; set; }
        public decimal ExtrasTotalCost { get; set; }
        public List<string> ExtraNames { get; set; } = new();
        public string? FrameCode { get; set; }
        public string? FrameDescription { get; set; }
        public decimal? FramePrice { get; set; }
        public bool FrameLensRuleApplied { get; set; }
        public string? FrameLensRuleLabel { get; set; }
        public decimal Subtotal { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal Total { get; set; }
        public List<AppliedRuleInfo> AppliedRules { get; set; } = new();
    }

    public class AppliedRuleInfo
    {
        public Guid RuleId { get; set; }
        public string RuleName { get; set; } = "";
        public decimal DiscountAmount { get; set; }
    }

    public class CreateQuoteRequest
    {
        public Guid? CustomerId { get; set; }
        public Guid? FrameProductId { get; set; }
        public string? FrameCode { get; set; }
        public string? FrameDescription { get; set; }
        public string? FrameBrand { get; set; }
        public decimal? FramePrice { get; set; }
        public Guid LensTypeId { get; set; }
        public string? LensTypeName { get; set; }
        public decimal LensTypeBasePrice { get; set; }
        public Guid? LensIndexId { get; set; }
        public string? LensIndexName { get; set; }
        public decimal LensIndexAdditionalPrice { get; set; }
        public List<Guid>? ExtraIds { get; set; }
        public decimal ExtrasTotalCost { get; set; }
        public decimal OdEsfera { get; set; }
        public decimal OdCilindro { get; set; }
        public decimal OdEje { get; set; }
        public decimal OdAdicion { get; set; }
        public decimal OiEsfera { get; set; }
        public decimal OiCilindro { get; set; }
        public decimal OiEje { get; set; }
        public decimal OiAdicion { get; set; }
        public decimal Subtotal { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal Total { get; set; }
        public List<AppliedRuleInfo>? AppliedRules { get; set; }
    }

    public class CalculateLensOnlyRequest
    {
        public Guid LensTypeId { get; set; }
        public Guid? LensIndexId { get; set; }
        public Guid? FrameProductId { get; set; }
        public List<Guid>? ExtraIds { get; set; }
        public decimal OdEsfera { get; set; }
        public decimal OdCilindro { get; set; }
        public decimal OdEje { get; set; }
        public decimal OdAdicion { get; set; }
        public decimal OiEsfera { get; set; }
        public decimal OiCilindro { get; set; }
        public decimal OiEje { get; set; }
        public decimal OiAdicion { get; set; }
    }

    public class CalculateLensOnlyResult
    {
        public string LensTypeName { get; set; } = "";
        public string? LensIndexName { get; set; }
        public string? GraduationRangeName { get; set; }
        public List<string> ExtraNames { get; set; } = new();
        public bool FrameLensRuleApplied { get; set; }
        public string? FrameLensRuleLabel { get; set; }
        public decimal TotalPrice { get; set; }
    }
}
