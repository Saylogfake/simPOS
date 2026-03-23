using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SaasPos.Backend.Data;
using SaasPos.Backend.Models;

namespace SaasPos.Backend.Services
{
    public class DebtService
    {
        private readonly AppDbContext _context;
        private readonly CashService _cashService;

        public DebtService(AppDbContext context, CashService cashService)
        {
            _context = context;
            _cashService = cashService;
        }

        public async Task<List<CustomerDebt>> GetDebtsByCustomerAsync(Guid customerId)
        {
            return await _context.CustomerDebts
                .Where(d => d.CustomerId == customerId)
                .Include(d => d.Payments)
                .OrderByDescending(d => d.CreatedAt)
                .ToListAsync();
        }

        public async Task<CustomerDebt> CreateDebtAsync(Guid customerId, decimal amount, DateTime dueDate)
        {
            var customer = await _context.Customers.FindAsync(customerId);
            if (customer == null) throw new Exception("Cliente no encontrado");

            var debt = new CustomerDebt
            {
                CustomerId = customerId,
                Amount = amount,
                DueDate = dueDate,
                Status = "PENDING"
            };

            _context.CustomerDebts.Add(debt);
            
            // Update customer balance
            customer.Balance += amount;
            
            await _context.SaveChangesAsync();
            return debt;
        }

        public async Task<DebtPayment> PayDebtAsync(Guid debtId, decimal amount, string paymentMethod, Guid cashRegisterId, Guid userId)
        {
            var debt = await _context.CustomerDebts.FindAsync(debtId);
            if (debt == null) throw new Exception("Deuda no encontrada");

            if (debt.PaidAmount + amount > debt.Amount + 0.01m)
            {
                throw new Exception($"El monto excede el saldo pendiente ({debt.Amount - debt.PaidAmount:F0})");
            }

            // check cash register
            var register = await _context.CashRegisters.FindAsync(cashRegisterId);
            if (register == null || register.Status != "OPEN")
            {
                throw new Exception("La caja debe estar abierta para recibir pagos");
            }

            var payment = new DebtPayment
            {
                CustomerDebtId = debtId,
                Amount = amount,
                PaymentMethod = paymentMethod,
                CashRegisterId = cashRegisterId
            };

            _context.DebtPayments.Add(payment);

            // Update debt
            debt.PaidAmount += amount;
            debt.Status = debt.PaidAmount >= debt.Amount - 0.01m ? "PAID" : "PARTIAL";

            // Update customer balance
            var customer = await _context.Customers.FindAsync(debt.CustomerId);
            if (customer != null)
            {
                customer.Balance -= amount;
            }

            // Record Cash Movement (Ingreso)
            await _cashService.RecordMovementAsync(new CashMovementRequest
            {
                CashRegisterId = cashRegisterId,
                Type = "INGRESO",
                Amount = amount,
                PaymentMethod = paymentMethod,
                Reason = $"Pago de deuda - Cliente {(customer?.Name ?? "Desconocido")}",
                UserId = userId
            });

            await _context.SaveChangesAsync();
            return payment;
        }
    }
}
