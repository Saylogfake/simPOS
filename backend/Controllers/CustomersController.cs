using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaasPos.Backend.Data;
using SaasPos.Backend.Models;

namespace SaasPos.Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CustomersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CustomersController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Customer>>> GetCustomers()
        {
            var tenantClaim = User.FindFirst("tenant_id")?.Value;
            if (string.IsNullOrEmpty(tenantClaim) || !Guid.TryParse(tenantClaim, out var tenantId))
                return Unauthorized();

            return await _context.Customers
                .Where(c => c.TenantId == tenantId && c.DeletedAt == null)
                .ToListAsync();
        }

        [HttpPost]
        public async Task<ActionResult<Customer>> CreateCustomer([FromBody] CreateCustomerRequest request)
        {
            var tenantClaim = User.FindFirst("tenant_id")?.Value;
            if (string.IsNullOrEmpty(tenantClaim) || !Guid.TryParse(tenantClaim, out var tenantId))
                return Unauthorized();

            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest(new { message = "El nombre es obligatorio" });
            if (string.IsNullOrWhiteSpace(request.DocumentId))
                return BadRequest(new { message = "La cédula/RUC es obligatoria" });

            try
            {
                // Unique document per tenant
                var exists = await _context.Customers.AnyAsync(c =>
                    c.DocumentId == request.DocumentId && c.TenantId == tenantId && c.DeletedAt == null);
                if (exists) return Conflict(new { message = "Ya existe un cliente con esa cédula/RUC" });

                var customer = new Customer
                {
                    TenantId = tenantId,
                    Name = request.Name,
                    DocumentId = request.DocumentId,
                    Phone = request.Phone,
                    Email = request.Email,
                    BirthDate = request.BirthDate,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Customers.Add(customer);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetCustomers), new { id = customer.Id }, customer);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message, detail = ex.InnerException?.Message });
            }
        }
        
        [HttpGet("{id}")]
        public async Task<ActionResult<Customer>> GetCustomer(Guid id)
        {
            var tenantClaim = User.FindFirst("tenant_id")?.Value;
            if (string.IsNullOrEmpty(tenantClaim) || !Guid.TryParse(tenantClaim, out var tenantId))
                return Unauthorized();

            var customer = await _context.Customers
                .FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenantId && c.DeletedAt == null);
            if (customer == null) return NotFound();
            return customer;
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<Customer>> UpdateCustomer(Guid id, [FromBody] CreateCustomerRequest request)
        {
            var tenantClaim = User.FindFirst("tenant_id")?.Value;
            if (string.IsNullOrEmpty(tenantClaim) || !Guid.TryParse(tenantClaim, out var tenantId))
                return Unauthorized();

            var customer = await _context.Customers
                .FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenantId && c.DeletedAt == null);
            if (customer == null) return NotFound();

            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest(new { message = "El nombre es obligatorio" });

            // Check DocumentId uniqueness if changed
            if (!string.IsNullOrWhiteSpace(request.DocumentId) && request.DocumentId != customer.DocumentId)
            {
                var exists = await _context.Customers.AnyAsync(c =>
                    c.DocumentId == request.DocumentId && c.TenantId == tenantId && c.DeletedAt == null && c.Id != id);
                if (exists) return Conflict(new { message = "Ya existe un cliente con esa cédula/RUC" });
            }

            customer.Name = request.Name;
            customer.DocumentId = request.DocumentId;
            customer.Phone = request.Phone;
            customer.Email = request.Email;
            customer.BirthDate = request.BirthDate;
            customer.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(customer);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCustomer(Guid id)
        {
            var tenantClaim = User.FindFirst("tenant_id")?.Value;
            if (string.IsNullOrEmpty(tenantClaim) || !Guid.TryParse(tenantClaim, out var tenantId))
                return Unauthorized();

            var customer = await _context.Customers
                .FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenantId && c.DeletedAt == null);
            if (customer == null) return NotFound();

            customer.DeletedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }

    public class CreateCustomerRequest
    {
        public string Name { get; set; }
        public string DocumentId { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public DateTime? BirthDate { get; set; }
    }
}
