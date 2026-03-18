using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaasPos.Backend.Data;
using SaasPos.Backend.Models;

namespace SaasPos.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "SUPERADMIN,ADMIN")]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UsersController(AppDbContext context)
        {
            _context = context;
        }

        // GET /api/users
        [HttpGet]
        public async Task<IActionResult> GetUsers()
        {
            var tenantIdClaim = User.Claims.FirstOrDefault(c => c.Type == "tenant_id");
            if (tenantIdClaim == null || !Guid.TryParse(tenantIdClaim.Value, out var tenantId))
                return Unauthorized();

            var users = await _context.Users
                .Include(u => u.Role)
                .Where(u => u.TenantId == tenantId && u.DeletedAt == null)
                .Select(u => new UserDto
                {
                    Id = u.Id,
                    Name = u.Name,
                    Email = u.Email,
                    RoleId = u.RoleId,
                    RoleName = u.Role.Name,
                    IsActive = u.IsActive,
                    LastLoginAt = u.LastLoginAt,
                    CreatedAt = u.CreatedAt
                })
                .ToListAsync();

            return Ok(users);
        }

        // POST /api/users
        [HttpPost]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
        {
            var tenantIdClaim = User.Claims.FirstOrDefault(c => c.Type == "tenant_id");
            if (tenantIdClaim == null || !Guid.TryParse(tenantIdClaim.Value, out var tenantId))
                return Unauthorized();

            var role = await _context.Roles.FindAsync(request.RoleId);
            if (role == null) return BadRequest("Role not found");

            var emailExists = await _context.Users.AnyAsync(u => u.Email == request.Email && u.DeletedAt == null);
            if (emailExists) return Conflict("Email already in use");

            var user = new User
            {
                TenantId = tenantId,
                Name = request.Name,
                Email = request.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                RoleId = request.RoleId,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetUsers), new
            {
                id = user.Id,
                name = user.Name,
                email = user.Email,
                roleName = role.Name,
                isActive = user.IsActive
            });
        }

        // PUT /api/users/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UpdateUserRequest request)
        {
            var tenantIdClaim = User.Claims.FirstOrDefault(c => c.Type == "tenant_id");
            if (tenantIdClaim == null || !Guid.TryParse(tenantIdClaim.Value, out var tenantId))
                return Unauthorized();

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id && u.TenantId == tenantId && u.DeletedAt == null);
            if (user == null) return NotFound("User not found");

            var role = await _context.Roles.FindAsync(request.RoleId);
            if (role == null) return BadRequest("Role not found");

            // Check email collision (excluding self)
            var emailConflict = await _context.Users.AnyAsync(u => u.Email == request.Email && u.Id != id && u.DeletedAt == null);
            if (emailConflict) return Conflict("Email already in use");

            user.Name = request.Name;
            user.Email = request.Email;
            user.RoleId = request.RoleId;
            user.IsActive = request.IsActive;
            user.UpdatedAt = DateTime.UtcNow;

            if (!string.IsNullOrWhiteSpace(request.Password))
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

            await _context.SaveChangesAsync();
            return Ok(new { message = "User updated" });
        }

        // DELETE /api/users/{id}  (soft delete)
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(Guid id)
        {
            var tenantIdClaim = User.Claims.FirstOrDefault(c => c.Type == "tenant_id");
            if (tenantIdClaim == null || !Guid.TryParse(tenantIdClaim.Value, out var tenantId))
                return Unauthorized();

            var callerIdClaim = User.Claims.FirstOrDefault(c => c.Type == "id");
            if (callerIdClaim != null && Guid.TryParse(callerIdClaim.Value, out var callerId) && callerId == id)
                return BadRequest("You cannot delete your own account");

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id && u.TenantId == tenantId && u.DeletedAt == null);
            if (user == null) return NotFound("User not found");

            user.DeletedAt = DateTime.UtcNow;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(new { message = "User deleted" });
        }
    }

    // DTOs
    public class UserDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
        public Guid RoleId { get; set; }
        public string RoleName { get; set; }
        public bool IsActive { get; set; }
        public DateTime? LastLoginAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateUserRequest
    {
        public string Name { get; set; }
        public string Email { get; set; }
        public string Password { get; set; }
        public Guid RoleId { get; set; }
    }

    public class UpdateUserRequest
    {
        public string Name { get; set; }
        public string Email { get; set; }
        public string? Password { get; set; }
        public Guid RoleId { get; set; }
        public bool IsActive { get; set; }
    }
}
