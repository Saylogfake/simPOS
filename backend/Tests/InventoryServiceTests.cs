using Microsoft.EntityFrameworkCore;
using SaasPos.Backend.Data;
using SaasPos.Backend.Models;
using SaasPos.Backend.Services;

namespace SaasPos.Backend.Tests
{
    public class InventoryServiceTests : IDisposable
    {
        private readonly AppDbContext _context;
        private readonly InventoryService _service;
        private readonly Guid _tenantId = Guid.NewGuid();
        private readonly Guid _userId = Guid.NewGuid();

        public InventoryServiceTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new AppDbContext(options);
            _service = new InventoryService(_context);
            SeedData();
        }

        private void SeedData()
        {
            var product = new Product
            {
                Id = Guid.NewGuid(),
                TenantId = _tenantId,
                Name = "Test Product",
                InternalCode = "T001",
                Sku = "T001",
                Price = 10000,
                Cost = 8000,
                Stock = 50,
                MinStock = 5,
                IsActive = true,
                TrackStock = true,
                SaleType = "UNIT",
                Status = "ACTIVE"
            };
            _context.Products.Add(product);
            _context.SaveChanges();
        }

        [Fact]
        public async Task AdjustStockAsync_IncreaseStock_UpdatesCorrectly()
        {
            var product = _context.Products.First();
            var result = await _service.AdjustStockAsync(
                product.Id, 10, "PURCHASE", "Restock", _userId);

            var updated = _context.Products.First(p => p.Id == product.Id);
            Assert.Equal(60, updated.Stock);
            Assert.Equal(50, result.StockBefore);
            Assert.Equal(60, result.StockAfter);
        }

        [Fact]
        public async Task AdjustStockAsync_DecreaseStock_UpdatesCorrectly()
        {
            var product = _context.Products.First();
            var result = await _service.AdjustStockAsync(
                product.Id, -5, "SALE", "Sale", _userId);

            var updated = _context.Products.First(p => p.Id == product.Id);
            Assert.Equal(45, updated.Stock);
            Assert.Equal(50, result.StockBefore);
            Assert.Equal(45, result.StockAfter);
        }

        [Fact]
        public async Task AdjustStockAsync_NegativeStock_ThrowsException()
        {
            var product = _context.Products.First();
            await Assert.ThrowsAsync<Exception>(() =>
                _service.AdjustStockAsync(product.Id, -100, "SALE", "Sale", _userId));
        }

        [Fact]
        public async Task AdjustStockAsync_ProductNotFound_ThrowsException()
        {
            await Assert.ThrowsAsync<Exception>(() =>
                _service.AdjustStockAsync(Guid.NewGuid(), 10, "PURCHASE", "Restock", _userId));
        }

        [Fact]
        public async Task AdjustStockAsync_CreatesStockMovement()
        {
            var product = _context.Products.First();
            await _service.AdjustStockAsync(product.Id, 5, "ADJUSTMENT", "Manual fix", _userId);

            var movement = _context.StockMovements.FirstOrDefault();
            Assert.NotNull(movement);
            Assert.Equal(product.Id, movement.ProductId);
            Assert.Equal("ADJUSTMENT", movement.Type);
            Assert.Equal(5, movement.Quantity);
            Assert.Equal(_userId, movement.UserId);
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }
    }
}
