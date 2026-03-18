using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaasPos.Backend.Data;
using SaasPos.Backend.Models;

namespace SaasPos.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "SUPERADMIN")]
    public class TenantsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TenantsController(AppDbContext context)
        {
            _context = context;
        }

        // GET /api/tenants — lista todos los negocios con stats
        [HttpGet]
        public async Task<IActionResult> GetTenants()
        {
            var tenants = await _context.Tenants
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new
                {
                    t.Id,
                    t.Name,
                    t.Slug,
                    t.Email,
                    t.Phone,
                    t.Plan,
                    t.IsActive,
                    t.CreatedAt,
                    UserCount = _context.Users.Count(u => u.TenantId == t.Id && u.DeletedAt == null),
                    ProductCount = _context.Products.Count(p => p.TenantId == t.Id && p.IsActive),
                    SalesCount = _context.Sales.Count(s => s.TenantId == t.Id),
                    TotalRevenue = _context.Sales
                        .Where(s => s.TenantId == t.Id && s.Status == "PAID")
                        .Sum(s => (decimal?)s.Total) ?? 0
                })
                .ToListAsync();

            return Ok(tenants);
        }

        // GET /api/tenants/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetTenant(Guid id)
        {
            var tenant = await _context.Tenants.FindAsync(id);
            if (tenant == null) return NotFound();
            return Ok(tenant);
        }

        // POST /api/tenants — crear nuevo negocio + usuario ADMIN inicial
        [HttpPost]
        public async Task<IActionResult> CreateTenant([FromBody] CreateTenantRequest request)
        {
            // Slug único
            var slugExists = await _context.Tenants.AnyAsync(t => t.Slug == request.Slug);
            if (slugExists) return Conflict(new { message = "El slug ya está en uso" });

            // Email único del admin
            var emailExists = await _context.Users.AnyAsync(u => u.Email == request.AdminEmail && u.DeletedAt == null);
            if (emailExists) return Conflict(new { message = "El email del administrador ya está en uso" });

            var tenant = new Tenant
            {
                Name = request.Name,
                Slug = request.Slug.ToLower().Trim(),
                Email = request.Email,
                Phone = request.Phone,
                Address = request.Address,
                Plan = request.Plan ?? "FREE",
                IsActive = true
            };
            _context.Tenants.Add(tenant);

            // Crear usuario ADMIN para el nuevo tenant
            var adminRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "ADMIN");
            if (adminRole == null) return StatusCode(500, "Rol ADMIN no encontrado. Ejecuta /api/seed primero.");

            var adminUser = new User
            {
                TenantId = tenant.Id,
                Name = request.AdminName,
                Email = request.AdminEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.AdminPassword),
                RoleId = adminRole.Id,
                IsActive = true
            };
            _context.Users.Add(adminUser);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                tenant = new { tenant.Id, tenant.Name, tenant.Slug, tenant.Plan },
                admin = new { adminUser.Id, adminUser.Name, adminUser.Email }
            });
        }

        // PUT /api/tenants/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTenant(Guid id, [FromBody] UpdateTenantRequest request)
        {
            var tenant = await _context.Tenants.FindAsync(id);
            if (tenant == null) return NotFound();

            // Si cambia el slug, verificar unicidad
            if (tenant.Slug != request.Slug)
            {
                var slugExists = await _context.Tenants.AnyAsync(t => t.Slug == request.Slug && t.Id != id);
                if (slugExists) return Conflict(new { message = "El slug ya está en uso" });
            }

            tenant.Name = request.Name;
            tenant.Slug = request.Slug.ToLower().Trim();
            tenant.Email = request.Email;
            tenant.Phone = request.Phone;
            tenant.Address = request.Address;
            tenant.Plan = request.Plan;
            tenant.IsActive = request.IsActive;
            tenant.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(tenant);
        }

        // DELETE /api/tenants/{id} — desactiva el tenant (soft disable)
        [HttpDelete("{id}")]
        public async Task<IActionResult> DisableTenant(Guid id)
        {
            var tenant = await _context.Tenants.FindAsync(id);
            if (tenant == null) return NotFound();

            tenant.IsActive = false;
            tenant.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Negocio desactivado" });
        }

        // GET /api/tenants/stats — resumen global para el dashboard
        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            var totalTenants = await _context.Tenants.CountAsync();
            var activeTenants = await _context.Tenants.CountAsync(t => t.IsActive);
            var totalUsers = await _context.Users.CountAsync(u => u.DeletedAt == null);
            var totalSales = await _context.Sales.CountAsync(s => s.Status == "PAID");
            var totalRevenue = await _context.Sales
                .Where(s => s.Status == "PAID")
                .SumAsync(s => (decimal?)s.Total) ?? 0;

            var recentTenants = await _context.Tenants
                .OrderByDescending(t => t.CreatedAt)
                .Take(5)
                .Select(t => new { t.Id, t.Name, t.Slug, t.Plan, t.IsActive, t.CreatedAt })
                .ToListAsync();

            return Ok(new
            {
                totalTenants,
                activeTenants,
                totalUsers,
                totalSales,
                totalRevenue,
                recentTenants
            });
        }
    }

    public class CreateTenantRequest
    {
        public string Name { get; set; }
        public string Slug { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string? Plan { get; set; }
        // Admin inicial del negocio
        public string AdminName { get; set; }
        public string AdminEmail { get; set; }
        public string AdminPassword { get; set; }
    }

    public class UpdateTenantRequest
    {
        public string Name { get; set; }
        public string Slug { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string Plan { get; set; }
        public bool IsActive { get; set; }
    }
}
