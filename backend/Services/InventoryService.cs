using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SaasPos.Backend.Data;
using SaasPos.Backend.Models;

namespace SaasPos.Backend.Services
{
    public class InventoryService
    {
        private readonly AppDbContext _context;

        public InventoryService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<StockMovement> AdjustStockAsync(Guid productId, decimal quantityChange, string type, string reason, Guid userId, string? referenceId = null)
        {
            // Lock or transaction logic could go here for high concurrency, but relying on EF Core concurrency for MVP
            
            var product = await _context.Products.FindAsync(productId);
            if (product == null) throw new Exception("Product not found");

            // Prevent negative stock
            if (quantityChange < 0 && product.Stock + quantityChange < 0)
                throw new Exception($"Stock insuficiente. Disponible: {product.Stock}");

            var stockBefore = product.Stock;
            product.Stock += quantityChange;
            var stockAfter = product.Stock;

            // Auto-update status if out of stock
            if (product.Stock <= 0 && product.Status == "ACTIVE") 
            {
               // Optional: Change status? Maybe user prefers to keep it ACTIVE but 0 stock.
               // Let's just update the timestamp.
            }

            var movement = new StockMovement
            {
                ProductId = productId,
                Type = type,
                Quantity = quantityChange,
                StockBefore = stockBefore,
                StockAfter = stockAfter,
                Reason = reason,
                ReferenceId = referenceId,
                UserId = userId,
                CreatedAt = DateTime.UtcNow
            };

            _context.StockMovements.Add(movement);
            
            // Save changes here so stock adjustments are always persisted,
            // even when called standalone. EF Core batches multiple SaveChanges
            // in the same request safely within the scoped DbContext.
            await _context.SaveChangesAsync();

            return movement;
        }
    }
}
