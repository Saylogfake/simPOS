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

            return Ok(product);
        }

        // 2. Update Product
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProduct(Guid id, [FromBody] ProductDto dto)
        {
            var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
            if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                return Unauthorized();

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
            // Stock IS NOT modified directly here for logging purposes.
            // Check diff
            var diff = dto.Stock - product.Stock;
            if (diff != 0)
            {
            var userId = GetUserId();
               await _inventory.AdjustStockAsync(product.Id, diff, "ADJUSTMENT", "Manual Edit", userId);
               // Note: AdjustStockAsync updates the entity tracked by _context, so SaveChanges below persists it + the log.
            } 

            if (!string.IsNullOrEmpty(dto.Status))
            {
                product.Status = dto.Status;
                product.IsActive = dto.Status == "ACTIVE";
            } 

            await _context.SaveChangesAsync();
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
        private Guid GetUserId()
        {
            var claim = User.FindFirst("id")?.Value;
            return claim != null && Guid.TryParse(claim, out var id) ? id : Guid.Empty;
        }
    }

    public class ProductDto
    {
        public string Name { get; set; }
        public string? Code { get; set; } // Legacy/Extra
        public string InternalCode { get; set; }
        public string? Barcode { get; set; }
        public decimal Price { get; set; }
        public decimal Cost { get; set; }
        public decimal Stock { get; set; }
        public decimal MinStock { get; set; }
        public Guid CategoryId { get; set; }
        public string? ImageUrl { get; set; }
        public string SaleType { get; set; } // UNIT, WEIGHT
        public string? Status { get; set; } // ACTIVE, INACTIVE, OUT_OF_STOCK
        public decimal WholesalePrice { get; set; }
        public decimal WholesaleMinQty { get; set; }
        public DateTime? ExpirationDate { get; set; }
        public bool TrackStock { get; set; } = true;
    }

    public class StockUpdateDto
    {
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
