using Microsoft.EntityFrameworkCore;
using SaasPos.Backend.Models;

namespace SaasPos.Backend.Data
{
    public class AppDbContext : DbContext
    {
        private readonly IHttpContextAccessor? _httpContextAccessor;

        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public AppDbContext(DbContextOptions<AppDbContext> options, IHttpContextAccessor httpContextAccessor) : base(options)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        /// <summary>
        /// Seeds the database with initial roles, permissions, users, categories, and products.
        /// Safe to call on every startup — each section is guarded by an existence check so it
        /// only inserts data when the relevant table is empty.
        /// </summary>
        public void SeedData()
        {
            // ── Roles ────────────────────────────────────────────────────────────
            if (!Roles.Any())
            {
                Roles.AddRange(
                    new Role { Name = "SUPERADMIN" },
                    new Role { Name = "ADMIN" },
                    new Role { Name = "MANAGER" },
                    new Role { Name = "CAJERO" },
                    new Role { Name = "VIEWER" }
                );
                SaveChanges();
            }

            var superadminRole = Roles.First(r => r.Name == "SUPERADMIN");
            var adminRole = Roles.First(r => r.Name == "ADMIN");
            var managerRole = Roles.First(r => r.Name == "MANAGER");
            var cashierRole = Roles.First(r => r.Name == "CAJERO");
            var viewerRole = Roles.First(r => r.Name == "VIEWER");

            // ── Permissions ────────────────────────────────────────────────────────
            var permissionDefs = new[]
            {
                // Products
                ("PRODUCT_CREATE",    "Create Products"),
                ("PRODUCT_READ",      "View Products"),
                ("PRODUCT_UPDATE",    "Edit Products"),
                ("PRODUCT_DELETE",    "Delete Products"),
                // Sales
                ("SALE_CREATE",       "Create Sales"),
                ("SALE_READ",         "View Sales"),
                ("SALE_UPDATE",       "Edit Sales"),
                // Categories
                ("CATEGORY_CREATE",   "Create Categories"),
                ("CATEGORY_READ",     "View Categories"),
                ("CATEGORY_UPDATE",   "Edit Categories"),
                // Customers
                ("CUSTOMER_CREATE",   "Create Customers"),
                ("CUSTOMER_READ",     "View Customers"),
                ("CUSTOMER_UPDATE",   "Edit Customers"),
                // Cash
                ("CASH_OPEN_CLOSE",   "Open/Close Register"),
                ("CASH_MOVEMENT",     "Register Cash Movements"),
                // Reports & roles
                ("REPORT_VIEW",       "View Reports"),
                ("ROLE_MANAGE",       "Manage Roles and Permissions"),
                // POS
                ("POS_ACCESS",        "Access Point of Sale"),
                // Inventory (legacy codes kept for compatibility)
                ("VIEW_INVENTORY",    "View Inventory"),
                ("OPEN_CLOSE_CASH",   "Open/Close Cash (legacy)"),
                ("VIEW_REPORTS",      "View Reports (legacy)"),
                ("MANAGE_USERS",      "Manage Users (legacy)"),
                ("MANAGE_ROLES",      "Manage Roles (legacy)"),
                ("CREATE_PRODUCT",    "Create Products (legacy)"),
                ("EDIT_PRODUCT",      "Edit Products (legacy)"),
                ("DELETE_PRODUCT",    "Delete Products (legacy)")
            };

            foreach (var (code, description) in permissionDefs)
            {
                if (!Permissions.Any(p => p.Code == code))
                    Permissions.Add(new Permission { Code = code, Description = description });
            }
            SaveChanges();

            var allPermissions = Permissions.ToList();

            // ── Role-Permission mappings ──────────────────────────────────────────
            // SUPERADMIN & ADMIN → all permissions
            foreach (var role in new[] { superadminRole, adminRole })
            {
                var existing = RolePermissions
                    .Where(rp => rp.RoleId == role.Id)
                    .Select(rp => rp.PermissionId)
                    .ToHashSet();

                foreach (var perm in allPermissions.Where(p => !existing.Contains(p.Id)))
                    RolePermissions.Add(new RolePermission { RoleId = role.Id, PermissionId = perm.Id });
            }

            // MANAGER → everything except user/role management and deletion
            if (!RolePermissions.Any(rp => rp.RoleId == managerRole.Id))
            {
                var managerCodes = new HashSet<string>
                {
                    "PRODUCT_CREATE", "PRODUCT_READ", "PRODUCT_UPDATE",
                    "SALE_CREATE", "SALE_READ", "SALE_UPDATE",
                    "CATEGORY_CREATE", "CATEGORY_READ", "CATEGORY_UPDATE",
                    "CUSTOMER_CREATE", "CUSTOMER_READ", "CUSTOMER_UPDATE",
                    "CASH_OPEN_CLOSE", "CASH_MOVEMENT",
                    "REPORT_VIEW", "POS_ACCESS",
                    "VIEW_INVENTORY", "OPEN_CLOSE_CASH", "VIEW_REPORTS", "CREATE_PRODUCT", "EDIT_PRODUCT"
                };
                foreach (var perm in allPermissions.Where(p => managerCodes.Contains(p.Code)))
                    RolePermissions.Add(new RolePermission { RoleId = managerRole.Id, PermissionId = perm.Id });
            }

            // CAJERO (Cashier) → POS + cash operations only
            if (!RolePermissions.Any(rp => rp.RoleId == cashierRole.Id))
            {
                var cashierCodes = new HashSet<string>
                {
                    "POS_ACCESS", "SALE_CREATE", "SALE_READ",
                    "PRODUCT_READ", "CUSTOMER_READ", "CUSTOMER_CREATE",
                    "CASH_OPEN_CLOSE", "CASH_MOVEMENT",
                    "OPEN_CLOSE_CASH"
                };
                foreach (var perm in allPermissions.Where(p => cashierCodes.Contains(p.Code)))
                    RolePermissions.Add(new RolePermission { RoleId = cashierRole.Id, PermissionId = perm.Id });
            }

            // VIEWER → read-only
            if (!RolePermissions.Any(rp => rp.RoleId == viewerRole.Id))
            {
                var viewerCodes = new HashSet<string>
                {
                    "PRODUCT_READ", "SALE_READ", "CATEGORY_READ",
                    "CUSTOMER_READ", "REPORT_VIEW", "VIEW_INVENTORY", "VIEW_REPORTS"
                };
                foreach (var perm in allPermissions.Where(p => viewerCodes.Contains(p.Code)))
                    RolePermissions.Add(new RolePermission { RoleId = viewerRole.Id, PermissionId = perm.Id });
            }

            SaveChanges();

            // ── Default Tenant ─────────────────────────────────────────────────────
            if (!Tenants.Any())
            {
                Tenants.Add(new Tenant { Name = "Default Tenant", Slug = "default" });
                SaveChanges();
            }
            var tenantId = Tenants.First().Id;

            // ── Users ────────────────────────────────────────────────────────────
            if (!Users.Any())
            {
                var adminPasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123");
                var demoPasswordHash  = BCrypt.Net.BCrypt.HashPassword("123456");

                Users.AddRange(
                    new User
                    {
                        TenantId     = tenantId,
                        Name         = "Admin",
                        Email        = "admin@pos.com",
                        PasswordHash = adminPasswordHash,
                        RoleId       = superadminRole.Id,
                        IsActive     = true
                    },
                    new User
                    {
                        TenantId     = tenantId,
                        Name         = "Admin Demo",
                        Email        = "user@mail.com",
                        PasswordHash = demoPasswordHash,
                        RoleId       = adminRole.Id,
                        IsActive     = true
                    }
                );
                SaveChanges();
            }

            // ── Categories ───────────────────────────────────────────────────────
            if (!Categories.Any())
            {
                Categories.AddRange(
                    new Category { Name = "Electrónicos", TenantId = tenantId },
                    new Category { Name = "Ropa",         TenantId = tenantId },
                    new Category { Name = "Alimentos",    TenantId = tenantId },
                    new Category { Name = "Hogar",        TenantId = tenantId },
                    new Category { Name = "Bebidas",      TenantId = tenantId },
                    new Category { Name = "Limpieza",     TenantId = tenantId }
                );
                SaveChanges();
            }

            // ── Products ─────────────────────────────────────────────────────────
            if (!Products.Any())
            {
                var catElec = Categories.First(c => c.Name == "Electrónicos");
                var catFood = Categories.First(c => c.Name == "Alimentos");
                var catDrink = Categories.First(c => c.Name == "Bebidas");
                var catCloth = Categories.First(c => c.Name == "Ropa");

                Products.AddRange(
                    new Product
                    {
                        TenantId     = tenantId,
                        Name         = "Smartphone XYZ",
                        InternalCode = "E001",
                        Sku          = "E001",
                        Price        = 1500000,
                        Cost         = 1200000,
                        Stock        = 10,
                        MinStock     = 2,
                        IdealStock   = 15,
                        CategoryId   = catElec.Id,
                        SaleType     = "UNIT",
                        IsActive     = true,
                        Status       = "ACTIVE"
                    },
                    new Product
                    {
                        TenantId     = tenantId,
                        Name         = "Notebook Pro",
                        InternalCode = "E002",
                        Sku          = "E002",
                        Price        = 5000000,
                        Cost         = 4000000,
                        Stock        = 5,
                        MinStock     = 1,
                        IdealStock   = 8,
                        CategoryId   = catElec.Id,
                        SaleType     = "UNIT",
                        IsActive     = true,
                        Status       = "ACTIVE"
                    },
                    new Product
                    {
                        TenantId     = tenantId,
                        Name         = "Auriculares Bluetooth",
                        InternalCode = "E003",
                        Sku          = "E003",
                        Price        = 250000,
                        Cost         = 180000,
                        Stock        = 20,
                        MinStock     = 5,
                        IdealStock   = 25,
                        CategoryId   = catElec.Id,
                        SaleType     = "UNIT",
                        IsActive     = true,
                        Status       = "ACTIVE"
                    },
                    new Product
                    {
                        TenantId     = tenantId,
                        Name         = "Coca Cola 1.5L",
                        InternalCode = "B001",
                        Sku          = "B001",
                        Price        = 8000,
                        Cost         = 6000,
                        Stock        = 50,
                        MinStock     = 10,
                        IdealStock   = 60,
                        CategoryId   = catDrink.Id,
                        SaleType     = "UNIT",
                        IsActive     = true,
                        Status       = "ACTIVE"
                    },
                    new Product
                    {
                        TenantId     = tenantId,
                        Name         = "Agua Mineral 500ml",
                        InternalCode = "B002",
                        Sku          = "B002",
                        Price        = 3500,
                        Cost         = 2500,
                        Stock        = 100,
                        MinStock     = 20,
                        IdealStock   = 120,
                        CategoryId   = catDrink.Id,
                        SaleType     = "UNIT",
                        IsActive     = true,
                        Status       = "ACTIVE"
                    },
                    new Product
                    {
                        TenantId     = tenantId,
                        Name         = "Arroz 1kg",
                        InternalCode = "A001",
                        Sku          = "A001",
                        Price        = 5500,
                        Cost         = 4500,
                        Stock        = 100,
                        MinStock     = 20,
                        IdealStock   = 120,
                        CategoryId   = catFood.Id,
                        SaleType     = "UNIT",
                        IsActive     = true,
                        Status       = "ACTIVE"
                    },
                    new Product
                    {
                        TenantId     = tenantId,
                        Name         = "Aceite de Girasol 1L",
                        InternalCode = "A002",
                        Sku          = "A002",
                        Price        = 12000,
                        Cost         = 9500,
                        Stock        = 40,
                        MinStock     = 10,
                        IdealStock   = 50,
                        CategoryId   = catFood.Id,
                        SaleType     = "UNIT",
                        IsActive     = true,
                        Status       = "ACTIVE"
                    },
                    new Product
                    {
                        TenantId     = tenantId,
                        Name         = "Remera Básica",
                        InternalCode = "R001",
                        Sku          = "R001",
                        Price        = 35000,
                        Cost         = 22000,
                        Stock        = 30,
                        MinStock     = 5,
                        IdealStock   = 40,
                        CategoryId   = catCloth.Id,
                        SaleType     = "UNIT",
                        IsActive     = true,
                        Status       = "ACTIVE"
                    },
                    new Product
                    {
                        TenantId     = tenantId,
                        Name         = "Pantalón Jean",
                        InternalCode = "R002",
                        Sku          = "R002",
                        Price        = 85000,
                        Cost         = 55000,
                        Stock        = 15,
                        MinStock     = 3,
                        IdealStock   = 20,
                        CategoryId   = catCloth.Id,
                        SaleType     = "UNIT",
                        IsActive     = true,
                        Status       = "ACTIVE"
                    }
                );
                SaveChanges();
            }
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<Permission> Permissions { get; set; }
        public DbSet<RolePermission> RolePermissions { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<Sale> Sales { get; set; }
        public DbSet<SaleItem> SaleItems { get; set; }
        public DbSet<Payment> Payments { get; set; }
        public DbSet<StockMovement> StockMovements { get; set; }
        public DbSet<CashRegister> CashRegisters { get; set; }
        public DbSet<CashMovement> CashMovements { get; set; }
        public DbSet<CashSalesSummary> CashSalesSummaries { get; set; }
        public DbSet<CashAuditLog> CashAuditLogs { get; set; }
        public DbSet<Invoice> Invoices { get; set; }
        public DbSet<Customer> Customers { get; set; }
        
        public DbSet<CustomerDebt> CustomerDebts { get; set; }
        public DbSet<DebtPayment> DebtPayments { get; set; }
        public DbSet<Tenant> Tenants { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<LensType> LensTypes { get; set; }
        public DbSet<LensIndex> LensIndexes { get; set; }
        public DbSet<LensExtra> LensExtras { get; set; }
        public DbSet<GraduationRange> GraduationRanges { get; set; }
        public DbSet<OpticalPrescription> OpticalPrescriptions { get; set; }
        public DbSet<OpticalQuote> OpticalQuotes { get; set; }
        public DbSet<PromotionalRule> PromotionalRules { get; set; }
        public DbSet<FrameLensRule> FrameLensRules { get; set; }
        public DbSet<ProductBarcode> ProductBarcodes { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            // Composite Key for RolePermission
            modelBuilder.Entity<RolePermission>()
                .HasKey(rp => new { rp.RoleId, rp.PermissionId });

            // Optimistic concurrency for Product (RowVersion is configured via [Timestamp] attribute)
            modelBuilder.Entity<Product>()
                .Property(p => p.RowVersion)
                .IsRowVersion();

            // Global query filter for multi-tenant isolation
            // Extract tenant_id ONCE as a closure variable — EF Core can translate
            // a local Guid variable to SQL, but it CANNOT translate HasClaim() calls.
            Guid? tenantId = null;
            try
            {
                if (_httpContextAccessor?.HttpContext?.User.HasClaim(c => c.Type == "tenant_id") == true)
                {
                    var raw = _httpContextAccessor.HttpContext.User.FindFirst("tenant_id")?.Value;
                    if (!string.IsNullOrEmpty(raw) && Guid.TryParse(raw, out var parsed))
                        tenantId = parsed;
                }
            }
            catch { /* No tenant context (e.g. during startup/seed) — leave null */ }

            if (tenantId.HasValue)
            {
                var tid = tenantId.Value;

                modelBuilder.Entity<Product>().HasQueryFilter(p => p.TenantId == tid);
                modelBuilder.Entity<Category>().HasQueryFilter(c => c.TenantId == tid);
                modelBuilder.Entity<Sale>().HasQueryFilter(s => s.TenantId == tid);
                modelBuilder.Entity<Customer>().HasQueryFilter(c => c.TenantId == tid);
                modelBuilder.Entity<CashRegister>().HasQueryFilter(cr => cr.TenantId == tid);
                modelBuilder.Entity<Notification>().HasQueryFilter(n => n.TenantId == null || n.TenantId == tid);
                modelBuilder.Entity<LensType>().HasQueryFilter(l => l.TenantId == tid);
                modelBuilder.Entity<LensIndex>().HasQueryFilter(l => l.TenantId == tid);
                modelBuilder.Entity<LensExtra>().HasQueryFilter(l => l.TenantId == tid);
                modelBuilder.Entity<GraduationRange>().HasQueryFilter(g => g.TenantId == tid);
                modelBuilder.Entity<OpticalPrescription>().HasQueryFilter(o => o.TenantId == tid);
                modelBuilder.Entity<OpticalQuote>().HasQueryFilter(o => o.TenantId == tid);
                modelBuilder.Entity<PromotionalRule>().HasQueryFilter(p => p.TenantId == tid);
                modelBuilder.Entity<FrameLensRule>().HasQueryFilter(f => f.TenantId == tid);
            }

            // Decimals
            modelBuilder.Entity<Product>().Property(p => p.Price).HasColumnType("decimal(10,2)");
            modelBuilder.Entity<Product>().Property(p => p.Cost).HasColumnType("decimal(10,2)");
            modelBuilder.Entity<Product>().Property(p => p.Stock).HasColumnType("decimal(12,3)"); // Allow 3 decimals for Weight (e.g. 0.350)
            modelBuilder.Entity<Product>().Property(p => p.DiscountPercentage).HasColumnType("decimal(5,2)");

            modelBuilder.Entity<Sale>().Property(s => s.Total).HasColumnType("decimal(12,2)");
            modelBuilder.Entity<Sale>().Property(s => s.Tax).HasColumnType("decimal(12,2)");
            modelBuilder.Entity<Sale>().Property(s => s.Discount).HasColumnType("decimal(12,2)");

            modelBuilder.Entity<SaleItem>().Property(si => si.Price).HasColumnType("decimal(10,2)");
            modelBuilder.Entity<SaleItem>().Property(si => si.Subtotal).HasColumnType("decimal(12,2)");
            modelBuilder.Entity<SaleItem>().Property(si => si.Quantity).HasColumnType("decimal(12,3)"); // Allow 3 decimals
            modelBuilder.Entity<SaleItem>().Property(si => si.DiscountApplied).HasColumnType("decimal(12,2)");
            
            modelBuilder.Entity<StockMovement>().Property(sm => sm.Quantity).HasColumnType("decimal(12,3)");
            
            modelBuilder.Entity<CashRegister>().Property(c => c.OpeningAmount).HasColumnType("decimal(12,2)");
            modelBuilder.Entity<CashRegister>().Property(c => c.ClosingAmountCash).HasColumnType("decimal(12,2)");
            modelBuilder.Entity<CashRegister>().Property(c => c.ExpectedAmountCash).HasColumnType("decimal(12,2)");
            modelBuilder.Entity<CashRegister>().Property(c => c.DifferenceCash).HasColumnType("decimal(12,2)");

            modelBuilder.Entity<CashMovement>().Property(c => c.Amount).HasColumnType("decimal(12,2)");
            modelBuilder.Entity<CashSalesSummary>().Property(c => c.TotalAmount).HasColumnType("decimal(12,2)");

            modelBuilder.Entity<Customer>().Property(c => c.CreditLimit).HasColumnType("decimal(12,2)");
            modelBuilder.Entity<Customer>().Property(c => c.Balance).HasColumnType("decimal(12,2)");
        }
    }
}
