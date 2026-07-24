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
                    t.BusinessType,
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
                LogoUrl = request.LogoUrl,
                BusinessType = request.BusinessType ?? "TIENDA",
                IsActive = true,
                // Branding
                PrimaryColor = request.PrimaryColor ?? "#135bec",
                SecondaryColor = request.SecondaryColor ?? "#6366f1",
                DarkPrimaryColor = request.DarkPrimaryColor ?? "#3b82f6",
                DarkSecondaryColor = request.DarkSecondaryColor ?? "#818cf8",
                // SIFEN / e-Kuatia
                Ruc = request.Ruc,
                RazonSocial = request.RazonSocial,
                NombreFantasia = request.NombreFantasia,
                ActividadEconomicaCodigo = request.ActividadEconomicaCodigo,
                ActividadEconomicaDescripcion = request.ActividadEconomicaDescripcion,
                TipoContribuyente = request.TipoContribuyente ?? 2,
                TipoRegimen = request.TipoRegimen ?? 8,
                TimbradoNumero = request.TimbradoNumero,
                TimbradoFecha = request.TimbradoFecha,
                CodigoEstablecimiento = request.CodigoEstablecimiento ?? "001",
                PuntoExpedicion = request.PuntoExpedicion ?? "001",
                DireccionEstablecimiento = request.DireccionEstablecimiento,
                Departamento = request.Departamento ?? 11,
                DepartamentoDescripcion = request.DepartamentoDescripcion,
                Distrito = request.Distrito ?? 145,
                DistritoDescripcion = request.DistritoDescripcion,
                Ciudad = request.Ciudad ?? 3432,
                CiudadDescripcion = request.CiudadDescripcion,
                TelefonoEstablecimiento = request.TelefonoEstablecimiento,
                EmailEstablecimiento = request.EmailEstablecimiento,
                DenominacionEstablecimiento = request.DenominacionEstablecimiento,
                Csc = request.Csc,
                CscId = request.CscId,
                SifenHabilitado = request.SifenHabilitado ?? false,
                SifenAmbiente = request.SifenAmbiente ?? "test",
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
                tenant = new { tenant.Id, tenant.Name, tenant.Slug, tenant.BusinessType },
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
            tenant.LogoUrl = request.LogoUrl;
            if (request.BusinessType != null) tenant.BusinessType = request.BusinessType;
            tenant.IsActive = request.IsActive;
            // Branding
            tenant.PrimaryColor = request.PrimaryColor ?? tenant.PrimaryColor;
            tenant.SecondaryColor = request.SecondaryColor ?? tenant.SecondaryColor;
            tenant.DarkPrimaryColor = request.DarkPrimaryColor ?? tenant.DarkPrimaryColor;
            tenant.DarkSecondaryColor = request.DarkSecondaryColor ?? tenant.DarkSecondaryColor;
            // SIFEN / e-Kuatia
            tenant.Ruc = request.Ruc;
            tenant.RazonSocial = request.RazonSocial;
            tenant.NombreFantasia = request.NombreFantasia;
            tenant.ActividadEconomicaCodigo = request.ActividadEconomicaCodigo;
            tenant.ActividadEconomicaDescripcion = request.ActividadEconomicaDescripcion;
            tenant.TipoContribuyente = request.TipoContribuyente ?? 2;
            tenant.TipoRegimen = request.TipoRegimen ?? 8;
            tenant.TimbradoNumero = request.TimbradoNumero;
            tenant.TimbradoFecha = request.TimbradoFecha;
            tenant.CodigoEstablecimiento = request.CodigoEstablecimiento ?? "001";
            tenant.PuntoExpedicion = request.PuntoExpedicion ?? "001";
            tenant.DireccionEstablecimiento = request.DireccionEstablecimiento;
            tenant.Departamento = request.Departamento ?? 11;
            tenant.DepartamentoDescripcion = request.DepartamentoDescripcion;
            tenant.Distrito = request.Distrito ?? 145;
            tenant.DistritoDescripcion = request.DistritoDescripcion;
            tenant.Ciudad = request.Ciudad ?? 3432;
            tenant.CiudadDescripcion = request.CiudadDescripcion;
            tenant.TelefonoEstablecimiento = request.TelefonoEstablecimiento;
            tenant.EmailEstablecimiento = request.EmailEstablecimiento;
            tenant.DenominacionEstablecimiento = request.DenominacionEstablecimiento;
            tenant.Csc = request.Csc;
            tenant.CscId = request.CscId;
            tenant.SifenHabilitado = request.SifenHabilitado ?? tenant.SifenHabilitado;
            tenant.SifenAmbiente = request.SifenAmbiente ?? tenant.SifenAmbiente;
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

        // POST /api/tenants/{id}/logo — subir logo del negocio
        [HttpPost("{id}/logo")]
        public async Task<IActionResult> UploadLogo(Guid id, IFormFile file)
        {
            var tenant = await _context.Tenants.FindAsync(id);
            if (tenant == null) return NotFound();

            if (file == null || file.Length == 0)
                return BadRequest(new { message = "Archivo no válido" });

            const long maxSize = 5 * 1024 * 1024; // 5 MB
            if (file.Length > maxSize)
                return BadRequest(new { message = "El archivo no puede superar 5 MB" });

            var allowedExtensions = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                { ".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg" };
            var ext = Path.GetExtension(file.FileName);
            if (string.IsNullOrEmpty(ext) || !allowedExtensions.Contains(ext))
                return BadRequest(new { message = "Tipo de archivo no permitido. Use: JPG, PNG, WEBP, GIF o SVG" });

            var allowedContentTypes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                { "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml" };
            if (!string.IsNullOrEmpty(file.ContentType) && !allowedContentTypes.Contains(file.ContentType))
                return BadRequest(new { message = "Tipo de contenido no permitido" });

            var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "logos");
            Directory.CreateDirectory(uploadsDir);

            var fileName = $"{tenant.Slug}-{Guid.NewGuid()}{ext}";
            var filePath = Path.Combine(uploadsDir, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            tenant.LogoUrl = $"/uploads/logos/{fileName}";
            tenant.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { logoUrl = tenant.LogoUrl });
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
                .Select(t => new { t.Id, t.Name, t.Slug, t.BusinessType, t.IsActive, t.CreatedAt })
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
        public string? LogoUrl { get; set; }
        public string? BusinessType { get; set; }
        // Branding
        public string? PrimaryColor { get; set; }
        public string? SecondaryColor { get; set; }
        public string? DarkPrimaryColor { get; set; }
        public string? DarkSecondaryColor { get; set; }
        // Admin inicial del negocio
        public string AdminName { get; set; }
        public string AdminEmail { get; set; }
        public string AdminPassword { get; set; }
        // SIFEN / e-Kuatia
        public string? Ruc { get; set; }
        public string? RazonSocial { get; set; }
        public string? NombreFantasia { get; set; }
        public string? ActividadEconomicaCodigo { get; set; }
        public string? ActividadEconomicaDescripcion { get; set; }
        public int? TipoContribuyente { get; set; }
        public int? TipoRegimen { get; set; }
        public string? TimbradoNumero { get; set; }
        public DateTime? TimbradoFecha { get; set; }
        public string? CodigoEstablecimiento { get; set; }
        public string? PuntoExpedicion { get; set; }
        public string? DireccionEstablecimiento { get; set; }
        public int? Departamento { get; set; }
        public string? DepartamentoDescripcion { get; set; }
        public int? Distrito { get; set; }
        public string? DistritoDescripcion { get; set; }
        public int? Ciudad { get; set; }
        public string? CiudadDescripcion { get; set; }
        public string? TelefonoEstablecimiento { get; set; }
        public string? EmailEstablecimiento { get; set; }
        public string? DenominacionEstablecimiento { get; set; }
        public string? Csc { get; set; }
        public string? CscId { get; set; }
        public bool? SifenHabilitado { get; set; }
        public string? SifenAmbiente { get; set; }
    }

    public class UpdateTenantRequest
    {
        public string Name { get; set; }
        public string Slug { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string? LogoUrl { get; set; }
        public string? BusinessType { get; set; }
        public bool IsActive { get; set; }
        // Branding
        public string? PrimaryColor { get; set; }
        public string? SecondaryColor { get; set; }
        public string? DarkPrimaryColor { get; set; }
        public string? DarkSecondaryColor { get; set; }
        // SIFEN / e-Kuatia
        public string? Ruc { get; set; }
        public string? RazonSocial { get; set; }
        public string? NombreFantasia { get; set; }
        public string? ActividadEconomicaCodigo { get; set; }
        public string? ActividadEconomicaDescripcion { get; set; }
        public int? TipoContribuyente { get; set; }
        public int? TipoRegimen { get; set; }
        public string? TimbradoNumero { get; set; }
        public DateTime? TimbradoFecha { get; set; }
        public string? CodigoEstablecimiento { get; set; }
        public string? PuntoExpedicion { get; set; }
        public string? DireccionEstablecimiento { get; set; }
        public int? Departamento { get; set; }
        public string? DepartamentoDescripcion { get; set; }
        public int? Distrito { get; set; }
        public string? DistritoDescripcion { get; set; }
        public int? Ciudad { get; set; }
        public string? CiudadDescripcion { get; set; }
        public string? TelefonoEstablecimiento { get; set; }
        public string? EmailEstablecimiento { get; set; }
        public string? DenominacionEstablecimiento { get; set; }
        public string? Csc { get; set; }
        public string? CscId { get; set; }
        public bool? SifenHabilitado { get; set; }
        public string? SifenAmbiente { get; set; }
    }
}
