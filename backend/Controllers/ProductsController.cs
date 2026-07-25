using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaasPos.Backend.Data;
using SaasPos.Backend.Models;
using SaasPos.Backend.Services;
using System.ComponentModel.DataAnnotations;

namespace SaasPos.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ProductsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly InventoryService _inventory;

        public ProductsController(AppDbContext context, InventoryService inventory)
        {
            _context = context;
            _inventory = inventory;
        }

        [HttpGet]
        public async Task<IActionResult> GetProducts()
        {
            var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
            if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                return Unauthorized();

            var products = await _context.Products.Include(p => p.Category)
                .Where(p => p.IsActive && p.TenantId == tenantId)
                .OrderBy(p => p.Name)
                .Select(p => new
                {
                    p.Id,
                    p.TenantId,
                    p.Name,
                    p.Code,
                    p.Sku,
                    p.InternalCode,
                    p.Barcode,
                    p.Price,
                    p.Cost,
                    p.Stock,
                    p.MinStock,
                    p.CategoryId,
                    p.ImageUrl,
                    p.IsActive,
                    p.SaleType,
                    p.DiscountPercentage,
                    p.Status,
                    p.IsPriority,
                    p.ExpirationDate,
                    p.IdealStock,
                    p.WholesalePrice,
                    p.WholesaleMinQty,
                    p.TrackStock,
                    p.CreatedAt,
                    p.UpdatedAt,
                    Category = p.Category != null ? new { p.Category.Id, p.Category.Name } : null,
                    BarcodeCount = _context.ProductBarcodes.Count(b => b.ProductId == p.Id && b.IsActive)
                })
                .ToListAsync();
            
            return Ok(products);
        }

        [HttpGet("categories")]
        public async Task<IActionResult> GetCategories()
        {
            var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
            if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                return Unauthorized();

            var categories = await _context.Categories.Where(c => c.TenantId == tenantId).ToListAsync();
            return Ok(categories);
        }

        // 1. Create Product
        [HttpPost]
        public async Task<IActionResult> CreateProduct([FromBody] ProductDto dto)
        {
             var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
             if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                 return Unauthorized(new { message = "Invalid tenant claim" });

             if (!ModelState.IsValid) return BadRequest(ModelState);
             if (dto.Price <= 0) return BadRequest(new { message = "El precio debe ser mayor a 0" });
             if (dto.Cost < 0) return BadRequest(new { message = "El costo no puede ser negativo" });
             if (dto.Stock < 0) return BadRequest(new { message = "El stock no puede ser negativo" });
             if (dto.MinStock < 0) return BadRequest(new { message = "El stock mínimo no puede ser negativo" });

             // Validate unique codes scoped to this tenant
             if (await _context.Products.AnyAsync(p => p.InternalCode == dto.InternalCode && p.IsActive && p.TenantId == tenantId))
                return BadRequest("Internal Code already exists.");

            var product = new Product
            {
                TenantId = tenantId,
                Name = dto.Name,
                Code = dto.Code ?? dto.InternalCode, // Fallback
                InternalCode = dto.InternalCode,
                Barcode = dto.Barcode,
                Price = dto.Price,
                Cost = dto.Cost,
                Stock = dto.Stock,
                MinStock = dto.MinStock,
                CategoryId = dto.CategoryId,
                ImageUrl = dto.ImageUrl,
                SaleType = dto.SaleType,
                IsActive = true,
                Status = "ACTIVE",
                Sku = dto.InternalCode, // Use internal code as SKU for now
                IdealStock = dto.MinStock * 2, // Default logic or 0
                WholesalePrice = dto.WholesalePrice,
                WholesaleMinQty = dto.WholesaleMinQty,
                ExpirationDate = dto.ExpirationDate,
                TrackStock = dto.TrackStock
            };

            _context.Products.Add(product);
            await _context.SaveChangesAsync();

            // Save barcodes
            if (dto.Barcodes != null && dto.Barcodes.Count > 0)
            {
                var barcodes = dto.Barcodes.Select(b => new ProductBarcode
                {
                    ProductId = product.Id,
                    Barcode = b.Barcode,
                    Description = b.Description,
                    IsActive = true
                }).ToList();
                _context.ProductBarcodes.AddRange(barcodes);
                await _context.SaveChangesAsync();
            }

            return Ok(product);
        }

        // 2. Update Product
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProduct(Guid id, [FromBody] ProductDto dto)
        {
            var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
            if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                return Unauthorized();

            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (dto.Price <= 0) return BadRequest(new { message = "El precio debe ser mayor a 0" });
            if (dto.Cost < 0) return BadRequest(new { message = "El costo no puede ser negativo" });
            if (dto.Stock < 0) return BadRequest(new { message = "El stock no puede ser negativo" });
            if (dto.MinStock < 0) return BadRequest(new { message = "El stock mínimo no puede ser negativo" });

            var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId);
            if (product == null) return NotFound();

            product.Name = dto.Name;
            product.InternalCode = dto.InternalCode;
            product.Barcode = dto.Barcode;
            product.Price = dto.Price;
            product.Cost = dto.Cost;
            product.MinStock = dto.MinStock;
            product.CategoryId = dto.CategoryId;
            product.ImageUrl = dto.ImageUrl;
            product.SaleType = dto.SaleType;
            product.WholesalePrice = dto.WholesalePrice;
            product.WholesaleMinQty = dto.WholesaleMinQty;
            product.ExpirationDate = dto.ExpirationDate;
            product.TrackStock = dto.TrackStock;

            if (!string.IsNullOrEmpty(dto.Status))
            {
                product.Status = dto.Status;
                product.IsActive = dto.Status == "ACTIVE";
            }

            var diff = dto.Stock - product.Stock;
            if (diff != 0)
            {
                var userId = GetUserId();
                var stockBefore = product.Stock;
                product.Stock = dto.Stock;

                _context.StockMovements.Add(new StockMovement
                {
                    ProductId = product.Id,
                    Type = "ADJUSTMENT",
                    Quantity = diff,
                    StockBefore = stockBefore,
                    StockAfter = dto.Stock,
                    Reason = "Manual Edit",
                    UserId = userId,
                    CreatedAt = DateTime.UtcNow
                });
            }

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "Conflicto de concurrencia. Otro usuario modificó este producto. Recargue e intente nuevamente." });
            }
            catch (DbUpdateException ex)
            {
                Console.WriteLine($"[UpdateProduct] DbUpdateException: {ex.InnerException?.Message ?? ex.Message}");
                return BadRequest(new { message = "Error al guardar. Verifique que la categoría exista y los datos sean válidos." });
            }

            if (dto.Barcodes != null)
            {
                var existingBarcodes = await _context.ProductBarcodes
                    .Where(b => b.ProductId == id)
                    .ToListAsync();

                var incomingIds = dto.Barcodes.Where(b => b.Id.HasValue).Select(b => b.Id!.Value).ToHashSet();
                var toRemove = existingBarcodes.Where(b => !incomingIds.Contains(b.Id)).ToList();
                _context.ProductBarcodes.RemoveRange(toRemove);

                foreach (var existing in existingBarcodes.Where(b => incomingIds.Contains(b.Id)))
                {
                    var incoming = dto.Barcodes.First(b => b.Id == existing.Id);
                    existing.Barcode = incoming.Barcode;
                    existing.Description = incoming.Description;
                }

                var newBarcodes = dto.Barcodes.Where(b => !b.Id.HasValue).Select(b => new ProductBarcode
                {
                    ProductId = id,
                    Barcode = b.Barcode,
                    Description = b.Description,
                    IsActive = true
                }).ToList();
                _context.ProductBarcodes.AddRange(newBarcodes);

                try
                {
                    await _context.SaveChangesAsync();
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[UpdateProduct] Barcode sync error: {ex.Message}");
                }
            }

            return Ok(product);
        }

        // 3. Restock
        [HttpPost("{id}/stock")]
        public async Task<IActionResult> AddStock(Guid id, [FromBody] StockUpdateDto dto)
        {
            var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
            if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                return Unauthorized();

            var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId);
            if (product == null) return NotFound();

            if (dto.Quantity <= 0) return BadRequest("Quantity must be positive.");

            var userId = GetUserId();
            await _inventory.AdjustStockAsync(id, dto.Quantity, "RESTOCK", "Restock Endpoint", userId);

            await _context.SaveChangesAsync();
            return Ok(new { newStock = product.Stock });
        }

        // 4. Discount
        [HttpPut("{id}/discount")]
        public async Task<IActionResult> ApplyDiscount(Guid id, [FromBody] DiscountDto dto)
        {
            var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
            if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                return Unauthorized();

            var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId);
            if (product == null) return NotFound();

            if (dto.Percentage < 0 || dto.Percentage > 100) return BadRequest("Invalid percentage.");

            product.DiscountPercentage = dto.Percentage;
            
            await _context.SaveChangesAsync();
            return Ok(new { price = product.Price, discount = product.DiscountPercentage });
        }
        // 5. Toggle Priority
        [HttpPut("{id}/priority")]
        public async Task<IActionResult> TogglePriority(Guid id, [FromBody] PriorityDto dto)
        {
            var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
            if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                return Unauthorized();

            var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId);
            if (product == null) return NotFound();

            product.IsPriority = dto.IsPriority;
            await _context.SaveChangesAsync();
            return Ok(new { isPriority = product.IsPriority });
        }
        // 6. Category CRUD
        [HttpPost("categories")]
        public async Task<IActionResult> CreateCategory([FromBody] CategoryDto dto)
        {
            var tenantClaim = User.FindFirst("tenant_id")?.Value;
            if (string.IsNullOrEmpty(tenantClaim) || !Guid.TryParse(tenantClaim, out var tenantId))
                return Unauthorized(new { message = "Invalid tenant claim" });

            var category = new Category 
            { 
                Name = dto.Name,
                TenantId = tenantId
            };
            _context.Categories.Add(category);
            await _context.SaveChangesAsync();
            return Ok(category);
        }

        [HttpPut("categories/{id}")]
        public async Task<IActionResult> UpdateCategory(Guid id, [FromBody] CategoryDto dto)
        {
            var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
            if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                return Unauthorized();

            var category = await _context.Categories.FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenantId);
            if (category == null) return NotFound();
            
            category.Name = dto.Name;
            await _context.SaveChangesAsync();
            return Ok(category);
        }

        [HttpDelete("categories/{id}")]
        public async Task<IActionResult> DeleteCategory(Guid id)
        {
            var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
            if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                return Unauthorized();

            var category = await _context.Categories.FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenantId);
            if (category == null) return NotFound();

            // Check if used
            if (await _context.Products.AnyAsync(p => p.CategoryId == id))
                return BadRequest("Cannot delete category with products.");

            _context.Categories.Remove(category);
            await _context.SaveChangesAsync();
            return Ok();
        }
        // 7. Delete Product (Soft Delete)
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProduct(Guid id)
        {
            var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
            if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                return Unauthorized();

            var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId);
            if (product == null) return NotFound();

            product.IsActive = false;
            product.Status = "INACTIVE";
            
            await _context.SaveChangesAsync();
            return Ok();
        }

        // 8. Get Barcodes for a Product
        [HttpGet("{id}/barcodes")]
        public async Task<IActionResult> GetBarcodes(Guid id)
        {
            var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
            if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                return Unauthorized();

            var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId);
            if (product == null) return NotFound();

            var barcodes = await _context.ProductBarcodes
                .Where(b => b.ProductId == id && b.IsActive)
                .OrderBy(b => b.CreatedAt)
                .Select(b => new { b.Id, b.Barcode, b.Description, b.CreatedAt })
                .ToListAsync();

            return Ok(barcodes);
        }

        // 9. Add Barcode to Product
        [HttpPost("{id}/barcodes")]
        public async Task<IActionResult> AddBarcode(Guid id, [FromBody] ProductBarcodeDto dto)
        {
            var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
            if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                return Unauthorized();

            var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId);
            if (product == null) return NotFound();

            if (string.IsNullOrWhiteSpace(dto.Barcode))
                return BadRequest(new { message = "El código de barras es obligatorio" });

            // Check duplicate barcode within the same product
            if (await _context.ProductBarcodes.AnyAsync(b => b.ProductId == id && b.Barcode == dto.Barcode && b.IsActive))
                return BadRequest(new { message = "Este código de barras ya existe para este producto" });

            var barcode = new ProductBarcode
            {
                ProductId = id,
                Barcode = dto.Barcode.Trim(),
                Description = dto.Description?.Trim(),
                IsActive = true
            };
            _context.ProductBarcodes.Add(barcode);
            await _context.SaveChangesAsync();

            return Ok(new { barcode.Id, barcode.Barcode, barcode.Description, barcode.CreatedAt });
        }

        // 10. Delete Barcode from Product
        [HttpDelete("{id}/barcodes/{barcodeId}")]
        public async Task<IActionResult> DeleteBarcode(Guid id, Guid barcodeId)
        {
            var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
            if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                return Unauthorized();

            var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId);
            if (product == null) return NotFound();

            var barcode = await _context.ProductBarcodes.FirstOrDefaultAsync(b => b.Id == barcodeId && b.ProductId == id);
            if (barcode == null) return NotFound();

            _context.ProductBarcodes.Remove(barcode);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Código de barras eliminado" });
        }

        private Guid GetUserId()
        {
            var claim = User.FindFirst("id")?.Value;
            return claim != null && Guid.TryParse(claim, out var id) ? id : Guid.Empty;
        }
    }

    public class ProductDto
    {
        [Required] public string Name { get; set; }
        public string? Code { get; set; }
        [Required] public string InternalCode { get; set; }
        public string? Barcode { get; set; }
        public List<ProductBarcodeDto>? Barcodes { get; set; }
        [Range(0.01, double.MaxValue, ErrorMessage = "El precio debe ser mayor a 0")]
        public decimal Price { get; set; }
        [Range(0, double.MaxValue, ErrorMessage = "El costo no puede ser negativo")]
        public decimal Cost { get; set; }
        [Range(0, double.MaxValue, ErrorMessage = "El stock no puede ser negativo")]
        public decimal Stock { get; set; }
        [Range(0, double.MaxValue, ErrorMessage = "El stock mínimo no puede ser negativo")]
        public decimal MinStock { get; set; }
        public Guid CategoryId { get; set; }
        public string? ImageUrl { get; set; }
        public string SaleType { get; set; }
        public string? Status { get; set; }
        [Range(0, double.MaxValue, ErrorMessage = "El precio mayorista no puede ser negativo")]
        public decimal WholesalePrice { get; set; }
        [Range(0, double.MaxValue, ErrorMessage = "La cantidad mínima mayorista no puede ser negativa")]
        public decimal WholesaleMinQty { get; set; }
        public DateTime? ExpirationDate { get; set; }
        public bool TrackStock { get; set; } = true;
    }

    public class ProductBarcodeDto
    {
        public Guid? Id { get; set; }
        [Required] public string Barcode { get; set; } = "";
        public string? Description { get; set; }
    }

    public class StockUpdateDto
    {
        [Range(0.001, double.MaxValue, ErrorMessage = "La cantidad debe ser mayor a 0")]
        public decimal Quantity { get; set; }
    }

    public class DiscountDto
    {
        public decimal Percentage { get; set; }
    }

    public class PriorityDto 
    {
        public bool IsPriority { get; set; }
    }

    public class CategoryDto
    {
        public string Name { get; set; }
    }
}
