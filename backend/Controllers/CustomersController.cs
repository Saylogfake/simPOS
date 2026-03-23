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
        
        [HttpGet("{id}")]
        public async Task<ActionResult<Customer>> GetCustomer(Guid id)
        {
            var tenantClaim = User.FindFirst("tenant_id")?.Value;
            if (string.IsNullOrEmpty(tenantClaim) || !Guid.TryParse(tenantClaim, out var tenantId))
                return Unauthorized();

            var customer = await _context.Customers
                .FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenantId);
            if (customer == null) return NotFound();
            return customer;
        }
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