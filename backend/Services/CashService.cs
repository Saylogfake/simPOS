using Microsoft.EntityFrameworkCore;
using SaasPos.Backend.Data;
using SaasPos.Backend.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SaasPos.Backend.Services
{
    public class CashService
    {
        private readonly AppDbContext _context;

        public CashService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<CashRegister?> GetRegisterByIdAsync(Guid registerId)
        {
            return await _context.CashRegisters.FindAsync(registerId);
        }

        // Check if user has an open cash register
        public async Task<CashRegister?> GetOpenRegisterAsync(Guid userId)
        {
            return await _context.CashRegisters
                .FirstOrDefaultAsync(c => c.OpenedByUserId == userId && c.Status == "OPEN");
        }

        public async Task<CashRegister> OpenRegisterAsync(Guid userId, decimal openingAmount, Guid tenantId)
        {
            // Verify no open register exists for this user
            var existing = await GetOpenRegisterAsync(userId);
            if (existing != null) throw new InvalidOperationException("User already has an open cash register.");

            var register = new CashRegister
            {
                TenantId = tenantId,
                OpenedByUserId = userId,
                OpeningAmount = openingAmount,
                Status = "OPEN",
                OpenedAt = DateTime.UtcNow
            };

            // Log Initial Audit
            var audit = new CashAuditLog
            {
                CashRegisterId = register.Id, // Will be generated
                Action = "OPEN",
                NewValue = openingAmount.ToString(),
                UserId = userId
            };

            await _context.CashRegisters.AddAsync(register);
            await _context.CashAuditLogs.AddAsync(audit);
            await _context.SaveChangesAsync();
            return register;
        }

        public async Task RecordMovementAsync(CashMovementRequest request)
        {
            var movement = new CashMovement
            {
                CashRegisterId = request.CashRegisterId,
                UserId = request.UserId,
                Type = request.Type, // INGRESO, EGRESO, VENTA
                Amount = request.Amount,
                PaymentMethod = request.PaymentMethod,
                Reason = request.Reason
            };
            
            await _context.CashMovements.AddAsync(movement);
            await _context.SaveChangesAsync();
        }

        public async Task<CashSummaryDto> GetSummaryAsync(Guid registerId)
        {
            var register = await _context.CashRegisters.FindAsync(registerId);
            if (register == null) throw new KeyNotFoundException("Register not found");

            // 1. Calculate Movements
            var movements = await _context.CashMovements
                .Where(m => m.CashRegisterId == registerId)
                .ToListAsync();

            // 2. Calculate Sales from Movements (Source of Truth: CashMovements)
            // Previously we queried Sales table, but that missed sales if User/Time didn't match perfectly.
            // Now we trust the CashMovements recorded by SalesController.

            decimal cashSales = movements.Where(m => m.Type == "VENTA" && m.PaymentMethod == "CASH").Sum(m => m.Amount);
            decimal cardSales = movements.Where(m => m.Type == "VENTA" && m.PaymentMethod == "CARD").Sum(m => m.Amount);
            decimal transferSales = movements.Where(m => m.Type == "VENTA" && m.PaymentMethod == "TRANSFER").Sum(m => m.Amount);
            decimal qrSales = movements.Where(m => m.Type == "VENTA" && m.PaymentMethod == "QR").Sum(m => m.Amount);

            // Manual Movements (Cash only? Or mixed?) 
            // Usually movements are CASH. Let's assume CASH for simple "Retiro/Ingreso" unless specified.
            var manualIngressInfo = movements.Where(m => m.Type == "INGRESO" && m.PaymentMethod == "CASH").Sum(m => m.Amount);
            var manualEgressInfo = movements.Where(m => m.Type == "EGRESO" && m.PaymentMethod == "CASH").Sum(m => m.Amount);

            var expectedCash = register.OpeningAmount + cashSales + manualIngressInfo - manualEgressInfo;

            return new CashSummaryDto
            {
                CashRegisterId = registerId,
                OpeningAmount = register.OpeningAmount,
                Sales = new SalesBreakdown 
                {
                    Cash = cashSales,
                    Card = cardSales,
                    Transfer = transferSales,
                    Qr = qrSales
                },
                Movements = new MovementsBreakdown 
                {
                    Ingress = manualIngressInfo,
                    Egress = manualEgressInfo
                },
                ExpectedTotal = new PaymentTotals 
                {
                    Cash = expectedCash,
                    Card = cardSales,
                    Transfer = transferSales,
                    Qr = qrSales
                }
            };
        }

        public async Task<CashRegister> CloseRegisterAsync(Guid registerId, Guid userId, decimal countedCash, string? differenceReason)
        {
            var summary = await GetSummaryAsync(registerId);
            var register = await _context.CashRegisters.FindAsync(registerId);
            if(register == null) throw new Exception("Register not found");
            
            decimal diff = countedCash - summary.ExpectedTotal.Cash;
            
            register.ClosedByUserId = userId;
            register.ClosedAt = DateTime.UtcNow;
            register.ClosingAmountCash = countedCash;
            register.ExpectedAmountCash = summary.ExpectedTotal.Cash;
            register.DifferenceCash = diff;
            register.DifferenceReason = differenceReason;
            register.Status = Math.Abs(diff) < 0.01m ? "CLOSED_OK" : "CLOSED_DIFF";

            // Save Sales Summary Snapshot
            var snapshotCash = new CashSalesSummary { CashRegisterId = registerId, PaymentMethod = "CASH", TotalAmount = summary.Sales.Cash };
            var snapshotCard = new CashSalesSummary { CashRegisterId = registerId, PaymentMethod = "CARD", TotalAmount = summary.Sales.Card };
            var snapshotSf = new CashSalesSummary { CashRegisterId = registerId, PaymentMethod = "TRANSFER", TotalAmount = summary.Sales.Transfer };
            var snapshotQr = new CashSalesSummary { CashRegisterId = registerId, PaymentMethod = "QR", TotalAmount = summary.Sales.Qr };
            
            await _context.CashSalesSummaries.AddRangeAsync(snapshotCash, snapshotCard, snapshotSf, snapshotQr);
            await _context.SaveChangesAsync(); // saves snapshots + register status update
            
            return register;
        }

        public async Task<List<CashRegister>> GetHistoryAsync(Guid? tenantId)
        {
             return await _context.CashRegisters
                .Where(c => !tenantId.HasValue || c.TenantId == tenantId.Value)
                .Include(c => c.OpenedByUser)
                .Include(c => c.ClosedByUser)
                .OrderByDescending(c => c.CreatedAt)
                .Take(50)
                .ToListAsync();
        }
    }

    public class CashMovementRequest
    {
        public Guid CashRegisterId { get; set; }
        public Guid UserId { get; set; }
        public string Type { get; set; }
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; }
        public string Reason { get; set; }
    }

    public class CashSummaryDto {
        public Guid CashRegisterId { get; set; }
        public decimal OpeningAmount { get; set; }
        public SalesBreakdown Sales { get; set; }
        public MovementsBreakdown Movements { get; set; }
        public PaymentTotals ExpectedTotal { get; set; }
    }
    public class SalesBreakdown {
        public decimal Cash { get; set; }
        public decimal Card { get; set; }
        public decimal Transfer { get; set; }
        public decimal Qr { get; set; }
    }
    public class MovementsBreakdown {
        public decimal Ingress { get; set; }
        public decimal Egress { get; set; }
    }
    public class PaymentTotals {
        public decimal Cash { get; set; } // The only one we usually count primarily
        public decimal Card { get; set; }
        public decimal Transfer { get; set; }
        public decimal Qr { get; set; }
    }
}
