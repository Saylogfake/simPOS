using Microsoft.EntityFrameworkCore;
using SaasPos.Backend.Models;

namespace SaasPos.Backend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

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
        public DbSet<Customer> Customers { get; set; }
        
        public DbSet<CustomerDebt> CustomerDebts { get; set; }
        public DbSet<DebtPayment> DebtPayments { get; set; }
        public DbSet<Tenant> Tenants { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            // Composite Key for RolePermission
            modelBuilder.Entity<RolePermission>()
                .HasKey(rp => new { rp.RoleId, rp.PermissionId });

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
