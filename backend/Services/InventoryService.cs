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
            const int maxRetries = 3;
            for (int attempt = 0; attempt < maxRetries; attempt++)
            {
                try
                {
                    var product = await _context.Products.FindAsync(productId);
                    if (product == null) throw new Exception("Product not found");

                    // Prevent negative stock
                    if (quantityChange < 0 && product.Stock + quantityChange < 0)
                        throw new Exception($"Stock insuficiente. Disponible: {product.Stock}");

                    var stockBefore = product.Stock;
                    product.Stock += quantityChange;
                    var stockAfter = product.Stock;

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
                    await _context.SaveChangesAsync();

                    return movement;
                }
                catch (DbUpdateConcurrencyException)
                {
                    // Retry on concurrency conflict — another request modified the stock
                    _context.ChangeTracker.Clear();
                    if (attempt == maxRetries - 1)
                        throw new Exception("Conflicto de concurrencia al actualizar stock. Intente nuevamente.");
                }
            }

            throw new Exception("Conflicto de concurrencia al actualizar stock.");
        }
    }
}
