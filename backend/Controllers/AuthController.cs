using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SaasPos.Backend.Data;
using SaasPos.Backend.Middleware;
using SaasPos.Backend.Models;
using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace SaasPos.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly AccountLockoutService _lockout;
        private readonly RateLimitingService _rateLimit;

        public AuthController(AppDbContext context, IConfiguration configuration,
            AccountLockoutService lockout, RateLimitingService rateLimit)
        {
            _context = context;
            _configuration = configuration;
            _lockout = lockout;
            _rateLimit = rateLimit;
        }

        [AllowAnonymous]
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Rate limit per IP
            var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            if (_rateLimit.IsLimited($"login:{clientIp}"))
            {
                var retryAfter = _rateLimit.GetRetryAfterSeconds($"login:{clientIp}");
                return StatusCode(429, new { error = "Too many login attempts. Please try again later.", retryAfterSeconds = retryAfter });
            }

            // Account lockout check
            if (_lockout.IsLockedOut(request.Email))
            {
                return StatusCode(423, new { error = "Account locked due to too many failed attempts. Please try again in 15 minutes." });
            }

            var user = await _context.Users.Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Email == request.Email);

            if (user == null || !user.IsActive || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                _lockout.RecordFailedAttempt(request.Email);
                var remaining = _lockout.GetRemainingAttempts(request.Email);
                return Unauthorized(new { error = "Invalid credentials", remainingAttempts = remaining });
            }

            _lockout.ResetAttempts(request.Email);

            var tokenHandler = new JwtSecurityTokenHandler();
            var jwtSecret = _configuration["JWT_SECRET"]
                ?? throw new InvalidOperationException("JWT_SECRET is not configured.");
            var jwtIssuer = _configuration["JWT_ISSUER"] ?? "simpos";
            var jwtAudience = _configuration["JWT_AUDIENCE"] ?? "simpos";
            var jwtExpiresInMinutes = int.TryParse(_configuration["JWT_EXPIRES_IN_MINUTES"], out var expires)
                ? expires
                : 10080; // 7 días por defecto
            var key = Encoding.ASCII.GetBytes(jwtSecret);
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim("id", user.Id.ToString()),
                    new Claim("tenant_id", user.TenantId.ToString()),
                    new Claim(ClaimTypes.Role, user.Role.Name)
                }),
                Expires = DateTime.UtcNow.AddMinutes(jwtExpiresInMinutes),
                Issuer = jwtIssuer,
                Audience = jwtAudience,
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };
            var token = tokenHandler.CreateToken(tokenDescriptor);

            user.LastLoginAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Load role permissions
            var permissions = await _context.RolePermissions
                .Where(rp => rp.RoleId == user.RoleId)
                .Select(rp => rp.Permission.Code)
                .ToListAsync();

            // Load tenant branding
            var tenant = await _context.Tenants.FindAsync(user.TenantId);

            return Ok(new
            {
                access_token = tokenHandler.WriteToken(token),
                user = new
                {
                    id = user.Id,
                    name = user.Name,
                    email = user.Email,
                    role = user.Role.Name,
                    permissions,
                    tenantId = user.TenantId,
                    tenantName = tenant?.Name,
                    tenantLogoUrl = tenant?.LogoUrl,
                    primaryColor = tenant?.PrimaryColor,
                    secondaryColor = tenant?.SecondaryColor,
                    darkPrimaryColor = tenant?.DarkPrimaryColor,
                    darkSecondaryColor = tenant?.DarkSecondaryColor,
                    businessType = tenant?.BusinessType,
                }
            });
        }
    }

    public class LoginRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        public string Password { get; set; }
    }
}
