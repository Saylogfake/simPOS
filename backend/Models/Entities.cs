using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SaasPos.Backend.Models
{
    public abstract class BaseEntity
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid TenantId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? DeletedAt { get; set; }
    }

    public class User : BaseEntity
    {
        public string Name { get; set; }
        public string Email { get; set; }
        public string PasswordHash { get; set; }
        public Guid RoleId { get; set; }
        public bool IsActive { get; set; }
        public DateTime? LastLoginAt { get; set; }

        public Role Role { get; set; }
    }

    public class Role 
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Name { get; set; } // ADMIN, SUPERVISOR, CAJERO, SUPERADMIN
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public class Permission
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Code { get; set; }
        public string Description { get; set; }
    }

    public class RolePermission
    {
        public Guid RoleId { get; set; }
        public Guid PermissionId { get; set; }
        public Role Role { get; set; }
        public Permission Permission { get; set; }
    }

    public class Product : BaseEntity
    {
        public string Name { get; set; }
        public string? Code { get; set; } // Added Code property
        public string Sku { get; set; }
        public string InternalCode { get; set; } // New: Manual code (e.g., "23")
        public string? Barcode { get; set; }
        public decimal Price { get; set; }
        public decimal Cost { get; set; }
        public decimal Stock { get; set; } // Changed to decimal for Weight
        public decimal MinStock { get; set; }
        public Guid CategoryId { get; set; }
        public string? ImageUrl { get; set; }
        public bool IsActive { get; set; }
        
        // New Fields
        public string SaleType { get; set; } = "UNIT"; // UNIT, WEIGHT
        public decimal DiscountPercentage { get; set; } = 0;
        public string Status { get; set; } = "ACTIVE"; // ACTIVE, INACTIVE, OUT_OF_STOCK
        public bool IsPriority { get; set; } = false; // "Prioridad de compra"
        public DateTime? ExpirationDate { get; set; } // Optional Expiration Date

        // Advanced Inventory Fields
        public decimal IdealStock { get; set; }
        public decimal WholesalePrice { get; set; }
        public decimal WholesaleMinQty { get; set; }
        public bool TrackStock { get; set; } = true; // false = venta directa, no descuenta stock

        public Category Category { get; set; }
    }

    public class Category 
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid TenantId { get; set; }
        public string Name { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? DeletedAt { get; set; }
    }

    public class Sale : BaseEntity
    {
        public Guid UserId { get; set; }
        public Guid? CustomerId { get; set; }
        public decimal Total { get; set; }
        public decimal Tax { get; set; }
        public decimal Discount { get; set; }
        public string PaymentStatus { get; set; } // PAID, PENDING
        public string Status { get; set; } // OPEN, PAID, VOID
        
        public User User { get; set; }
        public Customer Customer { get; set; }
        public List<SaleItem> Items { get; set; } = new();
        public List<Payment> Payments { get; set; } = new();
    }

    public class SaleItem 
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SaleId { get; set; }
        public Guid ProductId { get; set; }
        public decimal Quantity { get; set; } // Changed to decimal
        public decimal Price { get; set; }
        public decimal Subtotal { get; set; }
        public decimal DiscountApplied { get; set; } // New: Track discount per item
        
        public Sale Sale { get; set; }
        public Product Product { get; set; }
    }

    public class Payment 
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SaleId { get; set; }
        public string Method { get; set; } // CASH, CARD
        public decimal Amount { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class StockMovement 
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid ProductId { get; set; }
        public string Type { get; set; } // SALE, PURCHASE, ADJUSTMENT, WASTE, RETURN
        public decimal Quantity { get; set; } // Changed to decimal
        public decimal StockBefore { get; set; } // NEW
        public decimal StockAfter { get; set; } // NEW
        public string Reason { get; set; }
        public string? ReferenceId { get; set; } // NEW: SaleId, PurchaseId, etc.
        public Guid UserId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class CashRegister 
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid TenantId { get; set; }
        
        public Guid? OpenedByUserId { get; set; }
        public DateTime OpenedAt { get; set; } = DateTime.UtcNow;
        public decimal OpeningAmount { get; set; }

        public Guid? ClosedByUserId { get; set; }
        public DateTime? ClosedAt { get; set; }
        public decimal? ClosingAmountCash { get; set; }
        public decimal? ExpectedAmountCash { get; set; }
        public decimal? DifferenceCash { get; set; }
        public string? DifferenceReason { get; set; }
        
        public string Status { get; set; } // OPEN, CLOSED_OK, CLOSED_DIFF
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("OpenedByUserId")]
        public User OpenedByUser { get; set; }

        [ForeignKey("ClosedByUserId")]
        public User? ClosedByUser { get; set; }
    }

    public class CashMovement 
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid CashRegisterId { get; set; }
        public string Type { get; set; } // INGRESO, EGRESO
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; } // CASH, CARD, TRANSFER, QR
        public string Reason { get; set; }
        public Guid UserId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class CashSalesSummary 
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid CashRegisterId { get; set; }
        public string PaymentMethod { get; set; } // CASH, CARD, TRANSFER, QR
        public decimal TotalAmount { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class CashAuditLog 
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid CashRegisterId { get; set; }
        public string Action { get; set; } // OPEN, CLOSE, EDIT, MOVEMENT
        public string? PreviousValue { get; set; }
        public string? NewValue { get; set; }
        public Guid UserId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class Customer : BaseEntity
    {
        public string Name { get; set; }
        public string? DocumentId { get; set; }  // Cédula / RUC
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public DateTime? BirthDate { get; set; }
        public decimal CreditLimit { get; set; }
        public decimal Balance { get; set; }
    }

    public class CustomerDebt
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid CustomerId { get; set; }
        public decimal Amount { get; set; }
        public decimal PaidAmount { get; set; } = 0; // Track partial payments
        public DateTime DueDate { get; set; }
        public string Status { get; set; } = "PENDING"; // PENDING, PAID, PARTIAL
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("CustomerId")]
        public Customer Customer { get; set; }
        public List<DebtPayment> Payments { get; set; } = new();
    }

    public class DebtPayment
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid CustomerDebtId { get; set; }
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; } // CASH, CARD, QR
        public Guid CashRegisterId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("CustomerDebtId")]
        public CustomerDebt CustomerDebt { get; set; }
    }

    public class Tenant
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Name { get; set; }           // Nombre del negocio
        public string Slug { get; set; }           // Identificador único (ej: "tienda-juan")
        public string? Email { get; set; }         // Email de contacto del negocio
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string? LogoUrl { get; set; }
        public string Plan { get; set; } = "FREE"; // FREE, PRO, ENTERPRISE
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
