using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaasPos.Backend.Data;
using SaasPos.Backend.Models;

namespace SaasPos.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Microsoft.AspNetCore.Authorization.Authorize(Roles = "SUPERADMIN,ADMIN")]
    public class RolesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public RolesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetRoles()
        {
            var roles = await _context.Roles
                .Where(r => r.Name != "SUPERADMIN")
                .Select(r => new RoleDto
                {
                    Id = r.Id,
                    Name = r.Name,
                    Permissions = _context.RolePermissions
                        .Where(rp => rp.RoleId == r.Id)
                        .Select(rp => rp.Permission.Code)
                        .ToList()
                })
                .ToListAsync();

            return Ok(roles);
        }

        [HttpPut("{id}/permissions")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "SUPERADMIN")]
        public async Task<IActionResult> UpdatePermissions(Guid id, [FromBody] UpdateRolePermissionsRequest request)
        {
            var role = await _context.Roles.FindAsync(id);
            if (role == null) return NotFound("Role not found");

            // Clear existing permissions
            var existing = await _context.RolePermissions.Where(rp => rp.RoleId == id).ToListAsync();
            _context.RolePermissions.RemoveRange(existing);

            // Add new permissions
            var permissions = await _context.Permissions
                .Where(p => request.PermissionCodes.Contains(p.Code))
                .ToListAsync();

            foreach (var p in permissions)
            {
                _context.RolePermissions.Add(new RolePermission 
                { 
                    RoleId = role.Id, 
                    PermissionId = p.Id 
                });
            }

            await _context.SaveChangesAsync();
            return Ok("Permissions updated");
        }
    }
}
