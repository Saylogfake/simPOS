using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaasPos.Backend.Data;
using SaasPos.Backend.Models;
using System.Security.Claims;

namespace SaasPos.Backend.Controllers
{
    [ApiController]
    [Route("api/notifications")]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly AppDbContext _db;
        public NotificationsController(AppDbContext db) => _db = db;

        private Guid GetTenantId() =>
            Guid.Parse(User.FindFirstValue("TenantId") ?? Guid.Empty.ToString());

        private string GetRole() =>
            User.FindFirstValue(ClaimTypes.Role) ?? "";

        // GET /api/notifications — returns notifications for current tenant + broadcasts
        [HttpGet]
        public async Task<IActionResult> GetNotifications()
        {
            var tenantId = GetTenantId();

            var notifications = await _db.Notifications
                .Where(n => n.TenantId == null || n.TenantId == tenantId)
                .OrderByDescending(n => n.CreatedAt)
                .Take(50)
                .Select(n => new {
                    n.Id, n.Type, n.Title, n.Message, n.IsRead, n.CreatedAt, n.TenantId
                })
                .ToListAsync();

            // Auto-generate low stock alerts (not persisted, just injected)
            var lowStock = await _db.Products
                .Where(p => p.TenantId == tenantId && p.DeletedAt == null && p.TrackStock && p.Stock <= p.MinStock && p.Stock > 0)
                .Select(p => new { p.Name, p.Stock, p.MinStock })
                .Take(10)
                .ToListAsync();

            var stockAlerts = lowStock.Select(p => new {
                Id = Guid.NewGuid(),
                Type = "WARNING",
                Title = "Stock bajo",
                Message = $"{p.Name} — {p.Stock} unidades (mín: {p.MinStock})",
                IsRead = false,
                CreatedAt = DateTime.UtcNow,
                TenantId = (Guid?)tenantId
            }).ToList<object>();

            var outOfStock = await _db.Products
                .Where(p => p.TenantId == tenantId && p.DeletedAt == null && p.TrackStock && p.Stock <= 0)
                .Select(p => new { p.Name })
                .Take(5)
                .ToListAsync();

            var outAlerts = outOfStock.Select(p => new {
                Id = Guid.NewGuid(),
                Type = "DANGER",
                Title = "Sin stock",
                Message = $"{p.Name} — agotado",
                IsRead = false,
                CreatedAt = DateTime.UtcNow,
                TenantId = (Guid?)tenantId
            }).ToList<object>();

            var combined = stockAlerts.Concat(outAlerts).Concat(notifications.Cast<object>()).ToList();
            return Ok(combined);
        }

        // POST /api/notifications — SUPERADMIN sends notification to tenant(s)
        [HttpPost]
        public async Task<IActionResult> SendNotification([FromBody] SendNotificationDto dto)
        {
            if (GetRole() != "SUPERADMIN") return Forbid();

            var notification = new Notification
            {
                TenantId = dto.TenantId,  // null = broadcast
                Type = dto.Type ?? "INFO",
                Title = dto.Title,
                Message = dto.Message
            };

            _db.Notifications.Add(notification);
            await _db.SaveChangesAsync();
            return Ok(new { notification.Id });
        }

        // PATCH /api/notifications/{id}/read
        [HttpPatch("{id}/read")]
        public async Task<IActionResult> MarkRead(Guid id)
        {
            var n = await _db.Notifications.FindAsync(id);
            if (n == null) return NotFound();
            n.IsRead = true;
            await _db.SaveChangesAsync();
            return Ok();
        }

        // PATCH /api/notifications/read-all
        [HttpPatch("read-all")]
        public async Task<IActionResult> MarkAllRead()
        {
            var tenantId = GetTenantId();
            var unread = await _db.Notifications
                .Where(n => (n.TenantId == null || n.TenantId == tenantId) && !n.IsRead)
                .ToListAsync();
            unread.ForEach(n => n.IsRead = true);
            await _db.SaveChangesAsync();
            return Ok();
        }

        // DELETE /api/notifications/{id} — SUPERADMIN only
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            if (GetRole() != "SUPERADMIN") return Forbid();
            var n = await _db.Notifications.FindAsync(id);
            if (n == null) return NotFound();
            _db.Notifications.Remove(n);
            await _db.SaveChangesAsync();
            return Ok();
        }
    }

    public class SendNotificationDto
    {
        public Guid? TenantId { get; set; }
        public string? Type { get; set; }
        public string Title { get; set; }
        public string Message { get; set; }
    }
}
