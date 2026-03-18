using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaasPos.Backend.Data;
using SaasPos.Backend.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SaasPos.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "SUPERADMIN")]
    public class SeedController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SeedController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> Seed()
        {
            // Roles
            if (!await _context.Roles.AnyAsync())
            {
                _context.Roles.AddRange(
                    new Role { Name = "SUPERADMIN" },
                    new Role { Name = "ADMIN" },
                    new Role { Name = "CAJERO" }
                );
                await _context.SaveChangesAsync();
            }

            var sarRole = await _context.Roles.FirstAsync(r => r.Name == "SUPERADMIN");
            var arRole  = await _context.Roles.FirstAsync(r => r.Name == "ADMIN");
            var crRole  = await _context.Roles.FirstAsync(r => r.Name == "CAJERO");

            // Tenant demo
            Tenant demoTenant;
            var existingTenant = await _context.Tenants.FirstOrDefaultAsync(t => t.Slug == "demo");
            if (existingTenant == null)
            {
                demoTenant = new Tenant
                {
                    Name = "Negocio Demo",
                    Slug = "demo",
                    Email = "demo@saaspos.com",
                    Plan = "FREE",
                    IsActive = true
                };
                _context.Tenants.Add(demoTenant);
                await _context.SaveChangesAsync();
            }
            else
            {
                demoTenant = existingTenant;
            }

            var tenantId = demoTenant.Id;

            // Users
            if (!await _context.Users.AnyAsync())
            {
                var passwordHash = BCrypt.Net.BCrypt.HashPassword("123456");

                _context.Users.AddRange(
                    new User
                    {
                        // SUPERADMIN no pertenece a ningún tenant específico, usamos tenantId del demo
                        TenantId = tenantId,
                        Name = "Super Admin",
                        Email = "admin@pos.com",
                        PasswordHash = passwordHash,
                        RoleId = sarRole.Id,
                        IsActive = true
                    },
                    new User
                    {
                        TenantId = tenantId,
                        Name = "Admin Demo",
                        Email = "user@mail.com",
                        PasswordHash = passwordHash,
                        RoleId = arRole.Id,
                        IsActive = true
                    }
                );
                await _context.SaveChangesAsync();
            }

            // Permissions (FORCE UPDATE)
            var allPermissionsList = new List<Permission>
            {
                new Permission { Code = "VIEW_INVENTORY", Description = "Ver Inventario" },
                new Permission { Code = "CREATE_PRODUCT", Description = "Crear Productos" },
                new Permission { Code = "EDIT_PRODUCT", Description = "Editar Productos" },
                new Permission { Code = "DELETE_PRODUCT", Description = "Eliminar Productos" },
                new Permission { Code = "MANAGE_USERS", Description = "Gestionar Usuarios" },
                new Permission { Code = "OPEN_CLOSE_CASH", Description = "Abrir/Cerrar Caja" },
                new Permission { Code = "VIEW_REPORTS", Description = "Ver Reportes" },
                new Permission { Code = "POS_ACCESS", Description = "Acceso al Punto de Venta" },
                new Permission { Code = "MANAGE_ROLES", Description = "Gestionar Roles y Permisos" }
            };
            
            foreach (var p in allPermissionsList)
            {
                if (!await _context.Permissions.AnyAsync(x => x.Code == p.Code))
                {
                    _context.Permissions.Add(p);
                }
            }
            await _context.SaveChangesAsync();

            // Re-assign Permissions to Roles
            var sarRef = sarRole;
            var arRef  = arRole;
            var crRef  = crRole;            
            var dbPermissions = await _context.Permissions.ToListAsync();
            
            // Clear existing for Admin/Super
            var existingRP = await _context.RolePermissions
                .Where(rp => rp.RoleId == sarRef.Id || rp.RoleId == arRef.Id)
                .ToListAsync();
            _context.RolePermissions.RemoveRange(existingRP);
            await _context.SaveChangesAsync();

            // Add all
            foreach(var p in dbPermissions)
            {
                _context.RolePermissions.Add(new RolePermission { RoleId = sarRef.Id, PermissionId = p.Id });
                _context.RolePermissions.Add(new RolePermission { RoleId = arRef.Id, PermissionId = p.Id });
            }

            // Cashier check
            if (!await _context.RolePermissions.AnyAsync(rp => rp.RoleId == crRef.Id))
            {
                var cashierPerms = dbPermissions.Where(p => p.Code == "POS_ACCESS" || p.Code == "OPEN_CLOSE_CASH").ToList();
                foreach(var p in cashierPerms)
                {
                    _context.RolePermissions.Add(new RolePermission { RoleId = crRef.Id, PermissionId = p.Id });
                }
            }
            
            await _context.SaveChangesAsync();

            // Categories
            if (!await _context.Categories.AnyAsync())
            {
                var cats = new List<Category>
                {
                    new Category { Name = "Electrónicos", TenantId = tenantId },
                    new Category { Name = "Ropa", TenantId = tenantId },
                    new Category { Name = "Alimentos", TenantId = tenantId },
                    new Category { Name = "Hogar", TenantId = tenantId }
                };
                _context.Categories.AddRange(cats);
                await _context.SaveChangesAsync();
            }

            // Products
            if (!await _context.Products.AnyAsync())
            {
                var catElec = await _context.Categories.FirstAsync(c => c.Name == "Electrónicos");
                var catFood = await _context.Categories.FirstAsync(c => c.Name == "Alimentos");

                var prods = new List<Product>
                {
                    new Product 
                    { 
                        Name = "Smartphone XYZ", 
                        InternalCode = "E001", 
                        Sku = "E001", 
                        Price = 1500000, 
                        Cost = 1200000, 
                        Stock = 10, 
                        MinStock = 2, 
                        CategoryId = catElec.Id, 
                        SaleType = "UNIT", 
                        IsActive = true, 
                        Status = "ACTIVE",
                        TenantId = tenantId
                    },
                    new Product 
                    { 
                        Name = "Notebook Pro", 
                        InternalCode = "E002", 
                        Sku = "E002", 
                        Price = 5000000, 
                        Cost = 4000000, 
                        Stock = 5, 
                        MinStock = 1, 
                        CategoryId = catElec.Id, 
                        SaleType = "UNIT", 
                        IsActive = true, 
                        Status = "ACTIVE",
                        TenantId = tenantId
                    },
                    new Product 
                    { 
                        Name = "Coca Cola 1.5L", 
                        InternalCode = "A001", 
                        Sku = "A001", 
                        Price = 8000, 
                        Cost = 6000, 
                        Stock = 50, 
                        MinStock = 10, 
                        CategoryId = catFood.Id, 
                        SaleType = "UNIT", 
                        IsActive = true, 
                        Status = "ACTIVE",
                        TenantId = tenantId
                    },
                    new Product 
                    { 
                        Name = "Arroz 1kg", 
                        InternalCode = "A002", 
                        Sku = "A002", 
                        Price = 5500, 
                        Cost = 4500, 
                        Stock = 100, 
                        MinStock = 20, 
                        CategoryId = catFood.Id, 
                        SaleType = "UNIT", 
                        IsActive = true, 
                        Status = "ACTIVE",
                        TenantId = tenantId
                    }
                };
                _context.Products.AddRange(prods);
                await _context.SaveChangesAsync();
            }

            // Customers
            if (!await _context.Customers.AnyAsync())
            {
                var custs = new List<Customer>
                {
                    new Customer 
                    { 
                        Name = "Cliente Final", 
                        Email = "final@mail.com", 
                        Phone = "0981000000", 
                        CreditLimit = 0,
                        Balance = 0,
                        TenantId = tenantId
                    },
                    new Customer 
                    { 
                        Name = "Juan Pérez", 
                        Email = "juan@mail.com", 
                        Phone = "0982111222", 
                        CreditLimit = 500000,
                        Balance = 0,
                        TenantId = tenantId
                    }
                };
                _context.Customers.AddRange(custs);
                await _context.SaveChangesAsync();
            }

            return Ok("Seeding Database SUCCESS");
        }
    }
}
