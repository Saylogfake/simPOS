using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using SaasPos.Backend.Controllers;
using SaasPos.Backend.Data;
using SaasPos.Backend.Models;
using Xunit;

namespace SaasPos.Backend.Tests
{
    public class AuthControllerTests : IDisposable
    {
        private readonly AppDbContext _context;
        private readonly AuthController _controller;
        private readonly IConfiguration _configuration;
        private readonly Guid _tenantId = Guid.NewGuid();

        public AuthControllerTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new AppDbContext(options);

            _configuration = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    { "JWT_SECRET", "test-secret-key-minimum-32-characters!!" },
                    { "JWT_ISSUER", "test" },
                    { "JWT_AUDIENCE", "test" },
                    { "JWT_EXPIRES_IN_MINUTES", "60" }
                })
                .Build();

            _controller = new AuthController(_context, _configuration);
            SeedData();
        }

        private void SeedData()
        {
            var role = new Role { Id = Guid.NewGuid(), Name = "ADMIN" };
            _context.Roles.Add(role);

            var passwordHash = BCrypt.Net.BCrypt.HashPassword("password123");
            _context.Users.Add(new User
            {
                Id = Guid.NewGuid(),
                TenantId = _tenantId,
                Name = "Test User",
                Email = "test@example.com",
                PasswordHash = passwordHash,
                RoleId = role.Id,
                IsActive = true,
                Role = role
            });

            _context.Tenants.Add(new Tenant
            {
                Id = _tenantId,
                Name = "Test Tenant",
                Slug = "test-tenant",
                IsActive = true
            });

            _context.SaveChanges();
        }

        [Fact]
        public async Task Login_ValidCredentials_ReturnsToken()
        {
            var request = new LoginRequest { Email = "test@example.com", Password = "password123" };
            var result = await _controller.Login(request);

            var okResult = result as Microsoft.AspNetCore.Mvc.OkObjectResult;
            Assert.NotNull(okResult);
            Assert.NotNull(okResult.Value);
        }

        [Fact]
        public async Task Login_InvalidPassword_ReturnsUnauthorized()
        {
            var request = new LoginRequest { Email = "test@example.com", Password = "wrongpassword" };
            var result = await _controller.Login(request);

            var unauthorizedResult = result as Microsoft.AspNetCore.Mvc.UnauthorizedObjectResult;
            Assert.NotNull(unauthorizedResult);
        }

        [Fact]
        public async Task Login_NonexistentEmail_ReturnsUnauthorized()
        {
            var request = new LoginRequest { Email = "nonexistent@example.com", Password = "password123" };
            var result = await _controller.Login(request);

            var unauthorizedResult = result as Microsoft.AspNetCore.Mvc.UnauthorizedObjectResult;
            Assert.NotNull(unauthorizedResult);
        }

        [Fact]
        public async Task Login_InactiveUser_ReturnsUnauthorized()
        {
            var user = _context.Users.First();
            user.IsActive = false;
            await _context.SaveChangesAsync();

            var request = new LoginRequest { Email = "test@example.com", Password = "password123" };
            var result = await _controller.Login(request);

            var unauthorizedResult = result as Microsoft.AspNetCore.Mvc.UnauthorizedObjectResult;
            Assert.NotNull(unauthorizedResult);
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }
    }
}
