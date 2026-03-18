using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaasPos.Backend.Data;
using SaasPos.Backend.Models;
using SaasPos.Backend.Services;

namespace SaasPos.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class InventoryController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly InventoryService _inventory;

        public InventoryController(AppDbContext context, InventoryService inventory)
        {
            _context = context;
            _inventory = inventory;
        }

        // GET: api/inventory/movements
        [HttpGet("movements")]
        public async Task<IActionResult> GetMovements([FromQuery] Guid? productId, [FromQuery] string? type, [FromQuery] int page = 1, [FromQuery] int limit = 50)
        {
            var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
            if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                return Unauthorized();

            var query = _context.StockMovements
                .Where(m => _context.Products.Any(p => p.Id == m.ProductId && p.TenantId == tenantId))
                .AsQueryable();

            if (productId.HasValue)
                query = query.Where(m => m.ProductId == productId);

            if (!string.IsNullOrEmpty(type))
                query = query.Where(m => m.Type == type);

            var total = await query.CountAsync();
            var movements = await query
                .OrderByDescending(m => m.CreatedAt)
                .Skip((page - 1) * limit)
                .Take(limit)
                .Select(m => new 
                {
                    m.Id,
                    m.Type,
                    m.Quantity,
                    m.StockBefore,
                    m.StockAfter,
                    m.Reason,
                    m.CreatedAt,
                    m.ReferenceId,
                    ProductName = _context.Products.Where(p => p.Id == m.ProductId).Select(p => p.Name).FirstOrDefault(),
                    User = _context.Users.Where(u => u.Id == m.UserId).Select(u => u.Name).FirstOrDefault()
                })
                .ToListAsync();

            return Ok(new { data = movements, total, page, limit });
        }

        // POST: api/inventory/adjustment
        [HttpPost("adjustment")]
        public async Task<IActionResult> CreateAdjustment([FromBody] AdjustmentDto dto)
        {
            if (dto.Quantity == 0) return BadRequest("Quantity cannot be zero.");

            var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
            if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                return Unauthorized();

            var product = await _context.Products.FindAsync(dto.ProductId);
            if (product == null || product.TenantId != tenantId)
                return Forbid();

            var claim = User.FindFirst("id")?.Value;
            var userId = claim != null && Guid.TryParse(claim, out var id) ? id : Guid.Empty;

            try 
            {
                var result = await _inventory.AdjustStockAsync(dto.ProductId, dto.Quantity, dto.Type, dto.Reason, userId);
                await _context.SaveChangesAsync();
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }

    public class AdjustmentDto
    {
        public Guid ProductId { get; set; }
        public decimal Quantity { get; set; } // Positive adds, Negative removes
        public string Type { get; set; } // ADJUSTMENT, WASTE, RETURN, PURCHASE
        public string Reason { get; set; }
    }
}
