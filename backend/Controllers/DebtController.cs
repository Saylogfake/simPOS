using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaasPos.Backend.Data;
using SaasPos.Backend.Services;
using SaasPos.Backend.Models;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace SaasPos.Backend.Controllers
{
    [ApiController]
    [Route("api/debts")]
    [Authorize]
    public class DebtController : ControllerBase
    {
        private readonly DebtService _debtService;
        private readonly CashService _cashService;
        private readonly AppDbContext _context;

        public DebtController(DebtService debtService, CashService cashService, AppDbContext context)
        {
            _debtService = debtService;
            _cashService = cashService;
            _context = context;
        }

        [HttpGet("customer/{customerId}")]
        public async Task<IActionResult> GetDebts(Guid customerId)
        {
            var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
            if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                return Unauthorized();

            // Verify customer belongs to this tenant
            var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Id == customerId && c.TenantId == tenantId);
            if (customer == null) return NotFound();

            var debts = await _debtService.GetDebtsByCustomerAsync(customerId);
            return Ok(debts);
        }

        [HttpPost]
        public async Task<IActionResult> RegisterDebt([FromBody] CreateDebtRequest request)
        {
            var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
            if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                return Unauthorized();

            // Verify customer belongs to this tenant
            var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Id == request.CustomerId && c.TenantId == tenantId);
            if (customer == null) return NotFound("Customer not found");

            try
            {
                var debt = await _debtService.CreateDebtAsync(request.CustomerId, request.Amount, request.DueDate);
                return Ok(debt);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("pay")]
        public async Task<IActionResult> PayDebt([FromBody] PayDebtRequest request)
        {
            try
            {
                var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
                if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                    return Unauthorized();

                var userId = User.FindFirst("id")?.Value;
                if (string.IsNullOrEmpty(userId)) return Unauthorized();

                // Verify the debt belongs to this tenant
                var debt = await _context.CustomerDebts
                    .Include(d => d.Customer)
                    .FirstOrDefaultAsync(d => d.Id == request.DebtId && d.Customer.TenantId == tenantId);
                if (debt == null) return NotFound("Debt not found");

                var payment = await _debtService.PayDebtAsync(
                    request.DebtId, 
                    request.Amount, 
                    request.PaymentMethod, 
                    request.CashRegisterId,
                    Guid.Parse(userId)
                );
                return Ok(payment);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }

    public class CreateDebtRequest
    {
        public Guid CustomerId { get; set; }
        public decimal Amount { get; set; }
        public DateTime DueDate { get; set; }
    }

    public class PayDebtRequest
    {
        public Guid DebtId { get; set; }
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; }
        public Guid CashRegisterId { get; set; }
    }
}
