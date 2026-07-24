using Microsoft.EntityFrameworkCore;
using SaasPos.Backend.Data;
using SaasPos.Backend.Models;
using SaasPos.Backend.Services;

namespace SaasPos.Backend.Tests
{
    public class CashServiceTests : IDisposable
    {
        private readonly AppDbContext _context;
        private readonly CashService _service;
        private readonly Guid _tenantId = Guid.NewGuid();
        private readonly Guid _userId = Guid.NewGuid();

        public CashServiceTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new AppDbContext(options);
            _service = new CashService(_context);
            SeedData();
        }

        private void SeedData()
        {
            _context.Users.Add(new User
            {
                Id = _userId,
                TenantId = _tenantId,
                Name = "Cashier",
                Email = "cashier@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("test"),
                IsActive = true
            });
            _context.SaveChanges();
        }

        [Fact]
        public async Task OpenRegisterAsync_CreatesNewRegister()
        {
            var result = await _service.OpenRegisterAsync(_userId, 500000, _tenantId);

            Assert.NotNull(result);
            Assert.Equal(_tenantId, result.TenantId);
            Assert.Equal(_userId, result.OpenedByUserId);
            Assert.Equal(500000, result.OpeningAmount);
            Assert.Equal("OPEN", result.Status);
        }

        [Fact]
        public async Task OpenRegisterAsync_AlreadyOpen_ThrowsException()
        {
            await _service.OpenRegisterAsync(_userId, 500000, _tenantId);

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                _service.OpenRegisterAsync(_userId, 100000, _tenantId));
        }

        [Fact]
        public async Task RecordMovementAsync_CreatesMovement()
        {
            var register = await _service.OpenRegisterAsync(_userId, 500000, _tenantId);

            await _service.RecordMovementAsync(new CashMovementRequest
            {
                CashRegisterId = register.Id,
                UserId = _userId,
                Type = "INGRESO",
                Amount = 100000,
                PaymentMethod = "CASH",
                Reason = "Test income"
            });

            var movement = _context.CashMovements.FirstOrDefault();
            Assert.NotNull(movement);
            Assert.Equal("INGRESO", movement.Type);
            Assert.Equal(100000, movement.Amount);
        }

        [Fact]
        public async Task GetSummaryAsync_ReturnsCorrectSummary()
        {
            var register = await _service.OpenRegisterAsync(_userId, 500000, _tenantId);
            await _service.RecordMovementAsync(new CashMovementRequest
            {
                CashRegisterId = register.Id,
                UserId = _userId,
                Type = "INGRESO",
                Amount = 100000,
                PaymentMethod = "CASH",
                Reason = "Test income"
            });

            var summary = await _service.GetSummaryAsync(register.Id);

            Assert.NotNull(summary);
            Assert.Equal(500000, summary.OpeningAmount);
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }
    }
}
