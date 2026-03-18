using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaasPos.Backend.Models;
using SaasPos.Backend.Services;
using System.Security.Claims;

namespace SaasPos.Backend.Controllers
{
    [Route("api/cash")]
    [ApiController]
    [Authorize]
    public class CashController : ControllerBase
    {
        private readonly CashService _cashService;

        public CashController(CashService cashService)
        {
            _cashService = cashService;
        }

        [HttpGet("status")]
        public async Task<IActionResult> GetStatus()
        {
            var idClaim = User.FindFirst("id")?.Value;
            if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId))
                return Unauthorized(new { message = "Invalid token claims" });
            var register = await _cashService.GetOpenRegisterAsync(userId);
            if (register == null) return Ok(new { isOpen = false });
            return Ok(new { isOpen = true, register });
        }

        [HttpPost("open")]
        public async Task<IActionResult> OpenRegister([FromBody] OpenRegisterRequest request)
        {
            try {
                var idClaim = User.FindFirst("id")?.Value;
                if (string.IsNullOrEmpty(idClaim)) return Unauthorized(new { message = "Invalid token claims" });

                var userId = Guid.Parse(idClaim);
                var tenantClaim = User.FindFirst("tenant_id")?.Value;
                var tenantId = tenantClaim != null ? Guid.Parse(tenantClaim) : Guid.Empty; 

                var register = await _cashService.OpenRegisterAsync(userId, request.OpeningAmount, tenantId);
                return Ok(register);
            } catch (InvalidOperationException ex) when (ex.Message.Contains("already has an open")) {
                 return Conflict(new { message = ex.Message, code = "ALREADY_OPEN" });
            } catch (Exception ex) {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("movement")]
        public async Task<IActionResult> AddMovement([FromBody] MovementRequest request)
        {
             var idClaim = User.FindFirst("id")?.Value;
             if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId))
                 return Unauthorized(new { message = "Invalid token claims" });
             var tenantClaim = User.FindFirst("tenant_id")?.Value;
             if (string.IsNullOrEmpty(tenantClaim) || !Guid.TryParse(tenantClaim, out var tenantId))
                 return Unauthorized(new { message = "Invalid token claims" });
             var register = await _cashService.GetRegisterByIdAsync(request.CashRegisterId);
             if (register == null || register.TenantId != tenantId)
                 return Forbid();
             await _cashService.RecordMovementAsync(new CashMovementRequest {
                 CashRegisterId = request.CashRegisterId,
                 UserId = userId,
                 Type = request.Type,
                 Amount = request.Amount,
                 PaymentMethod = request.PaymentMethod,
                 Reason = request.Reason
             });
             return Ok(new { success = true });
        }

        [HttpGet("summary/{id}")]
        public async Task<IActionResult> GetSummary(Guid id)
        {
            var tenantClaim = User.FindFirst("tenant_id")?.Value;
            if (string.IsNullOrEmpty(tenantClaim) || !Guid.TryParse(tenantClaim, out var tenantId))
                return Unauthorized(new { message = "Invalid token claims" });
            try {
                var register = await _cashService.GetRegisterByIdAsync(id);
                if (register == null || register.TenantId != tenantId)
                    return Forbid();
                var summary = await _cashService.GetSummaryAsync(id);
                return Ok(summary);
            } catch (Exception ex) {
                return NotFound(ex.Message);
            }
        }

        [HttpPost("close")]
        public async Task<IActionResult> CloseRegister([FromBody] CloseRegisterRequest request)
        {
             var idClaim = User.FindFirst("id")?.Value;
             if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId))
                 return Unauthorized(new { message = "Invalid token claims" });
             var tenantClaim = User.FindFirst("tenant_id")?.Value;
             if (string.IsNullOrEmpty(tenantClaim) || !Guid.TryParse(tenantClaim, out var tenantId))
                 return Unauthorized(new { message = "Invalid token claims" });
             var register = await _cashService.GetRegisterByIdAsync(request.CashRegisterId);
             if (register == null || register.TenantId != tenantId)
                 return Forbid();
             try {
                 var closed = await _cashService.CloseRegisterAsync(request.CashRegisterId, userId, request.CountedCash, request.DifferenceReason);
                 return Ok(closed);
             } catch (Exception ex) {
                 return BadRequest(ex.Message);
             }
        }
        [HttpGet("history")]
        [Authorize(Roles = "ADMIN,SUPERADMIN")]
        public async Task<IActionResult> GetHistory()
        {
             var tenantClaim = User.FindFirst("tenant_id")?.Value;
             Guid? tenantId = tenantClaim != null ? Guid.Parse(tenantClaim) : null;
             var history = await _cashService.GetHistoryAsync(tenantId);
             return Ok(history);
        }
    }

    public class OpenRegisterRequest {
        public decimal OpeningAmount { get; set; }
    }

    public class MovementRequest {
        public Guid CashRegisterId { get; set; }
        public string Type { get; set; }
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; }
        public string Reason { get; set; }
    }

    public class CloseRegisterRequest {
        public Guid CashRegisterId { get; set; }
        public decimal CountedCash { get; set; }
        public string? DifferenceReason { get; set; }
    }
}
