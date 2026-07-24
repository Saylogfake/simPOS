using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaasPos.Backend.Data;
using SaasPos.Backend.Models;

namespace SaasPos.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "ADMIN")]
    public class OpticsSettingsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private Guid TenantId => Guid.Parse(User.FindFirst("tenant_id")?.Value ?? Guid.Empty.ToString());

        public OpticsSettingsController(AppDbContext context)
        {
            _context = context;
        }

        // ═══════════════════════════════════════════════
        //  LENS TYPES
        // ═══════════════════════════════════════════════
        [HttpGet("lens-types")]
        public async Task<IActionResult> GetLensTypes()
        {
            var items = await _context.LensTypes
                .Where(x => x.TenantId == TenantId)
                .OrderBy(x => x.Name)
                .ToListAsync();
            return Ok(items);
        }

        [HttpPost("lens-types")]
        public async Task<IActionResult> CreateLensType([FromBody] LensType request)
        {
            var item = new LensType
            {
                TenantId = TenantId,
                Name = request.Name,
                BasePrice = request.BasePrice,
                IsActive = request.IsActive,
            };
            _context.LensTypes.Add(item);
            await _context.SaveChangesAsync();
            return Ok(item);
        }

        [HttpPut("lens-types/{id}")]
        public async Task<IActionResult> UpdateLensType(Guid id, [FromBody] LensType request)
        {
            var item = await _context.LensTypes.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == TenantId);
            if (item == null) return NotFound();
            item.Name = request.Name;
            item.BasePrice = request.BasePrice;
            item.IsActive = request.IsActive;
            item.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(item);
        }

        [HttpDelete("lens-types/{id}")]
        public async Task<IActionResult> DeleteLensType(Guid id)
        {
            var item = await _context.LensTypes.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == TenantId);
            if (item == null) return NotFound();
            _context.LensTypes.Remove(item);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Tipo de lente eliminado" });
        }

        // ═══════════════════════════════════════════════
        //  LENS INDEXES
        // ═══════════════════════════════════════════════
        [HttpGet("lens-indexes")]
        public async Task<IActionResult> GetLensIndexes()
        {
            var items = await _context.LensIndexes
                .Where(x => x.TenantId == TenantId)
                .OrderBy(x => x.Name)
                .ToListAsync();
            return Ok(items);
        }

        [HttpPost("lens-indexes")]
        public async Task<IActionResult> CreateLensIndex([FromBody] LensIndex request)
        {
            var item = new LensIndex
            {
                TenantId = TenantId,
                Name = request.Name,
                AdditionalPrice = request.AdditionalPrice,
                IsActive = request.IsActive,
            };
            _context.LensIndexes.Add(item);
            await _context.SaveChangesAsync();
            return Ok(item);
        }

        [HttpPut("lens-indexes/{id}")]
        public async Task<IActionResult> UpdateLensIndex(Guid id, [FromBody] LensIndex request)
        {
            var item = await _context.LensIndexes.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == TenantId);
            if (item == null) return NotFound();
            item.Name = request.Name;
            item.AdditionalPrice = request.AdditionalPrice;
            item.IsActive = request.IsActive;
            item.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(item);
        }

        [HttpDelete("lens-indexes/{id}")]
        public async Task<IActionResult> DeleteLensIndex(Guid id)
        {
            var item = await _context.LensIndexes.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == TenantId);
            if (item == null) return NotFound();
            _context.LensIndexes.Remove(item);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Índice eliminado" });
        }

        // ═══════════════════════════════════════════════
        //  LENS EXTRAS
        // ═══════════════════════════════════════════════
        [HttpGet("lens-extras")]
        public async Task<IActionResult> GetLensExtras()
        {
            var items = await _context.LensExtras
                .Where(x => x.TenantId == TenantId)
                .OrderBy(x => x.Name)
                .ToListAsync();
            return Ok(items);
        }

        [HttpPost("lens-extras")]
        public async Task<IActionResult> CreateLensExtra([FromBody] LensExtra request)
        {
            var item = new LensExtra
            {
                TenantId = TenantId,
                Name = request.Name,
                Price = request.Price,
                IsActive = request.IsActive,
            };
            _context.LensExtras.Add(item);
            await _context.SaveChangesAsync();
            return Ok(item);
        }

        [HttpPut("lens-extras/{id}")]
        public async Task<IActionResult> UpdateLensExtra(Guid id, [FromBody] LensExtra request)
        {
            var item = await _context.LensExtras.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == TenantId);
            if (item == null) return NotFound();
            item.Name = request.Name;
            item.Price = request.Price;
            item.IsActive = request.IsActive;
            item.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(item);
        }

        [HttpDelete("lens-extras/{id}")]
        public async Task<IActionResult> DeleteLensExtra(Guid id)
        {
            var item = await _context.LensExtras.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == TenantId);
            if (item == null) return NotFound();
            _context.LensExtras.Remove(item);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Extra eliminado" });
        }

        // ═══════════════════════════════════════════════
        //  GRADUATION RANGES
        // ═══════════════════════════════════════════════
        [HttpGet("graduation-ranges")]
        public async Task<IActionResult> GetGraduationRanges()
        {
            var items = await _context.GraduationRanges
                .Where(x => x.TenantId == TenantId)
                .OrderBy(x => x.MinValue)
                .ToListAsync();
            return Ok(items);
        }

        [HttpPost("graduation-ranges")]
        public async Task<IActionResult> CreateGraduationRange([FromBody] GraduationRange request)
        {
            var item = new GraduationRange
            {
                TenantId = TenantId,
                MinValue = request.MinValue,
                MaxValue = request.MaxValue,
                AdditionalCost = request.AdditionalCost,
                IsActive = request.IsActive,
            };
            _context.GraduationRanges.Add(item);
            await _context.SaveChangesAsync();
            return Ok(item);
        }

        [HttpPut("graduation-ranges/{id}")]
        public async Task<IActionResult> UpdateGraduationRange(Guid id, [FromBody] GraduationRange request)
        {
            var item = await _context.GraduationRanges.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == TenantId);
            if (item == null) return NotFound();
            item.MinValue = request.MinValue;
            item.MaxValue = request.MaxValue;
            item.AdditionalCost = request.AdditionalCost;
            item.IsActive = request.IsActive;
            item.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(item);
        }

        [HttpDelete("graduation-ranges/{id}")]
        public async Task<IActionResult> DeleteGraduationRange(Guid id)
        {
            var item = await _context.GraduationRanges.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == TenantId);
            if (item == null) return NotFound();
            _context.GraduationRanges.Remove(item);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Rango eliminado" });
        }
        // ═══════════════════════════════════════════════
        //  FRAME LENS RULES (precio especial de lente según marco)
        // ═══════════════════════════════════════════════
        [HttpGet("frame-lens-rules")]
        public async Task<IActionResult> GetFrameLensRules()
        {
            var items = await _context.FrameLensRules
                .Where(x => x.TenantId == TenantId)
                .OrderBy(x => x.CreatedAt)
                .ToListAsync();
            return Ok(items);
        }

        [HttpPost("frame-lens-rules")]
        public async Task<IActionResult> CreateFrameLensRule([FromBody] FrameLensRule request)
        {
            var item = new FrameLensRule
            {
                TenantId = TenantId,
                LensTypeId = request.LensTypeId,
                FrameProductId = request.FrameProductId,
                SpecialPrice = request.SpecialPrice,
                IsActive = request.IsActive,
            };
            _context.FrameLensRules.Add(item);
            await _context.SaveChangesAsync();
            return Ok(item);
        }

        [HttpPut("frame-lens-rules/{id}")]
        public async Task<IActionResult> UpdateFrameLensRule(Guid id, [FromBody] FrameLensRule request)
        {
            var item = await _context.FrameLensRules.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == TenantId);
            if (item == null) return NotFound();
            item.LensTypeId = request.LensTypeId;
            item.FrameProductId = request.FrameProductId;
            item.SpecialPrice = request.SpecialPrice;
            item.IsActive = request.IsActive;
            item.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(item);
        }

        [HttpDelete("frame-lens-rules/{id}")]
        public async Task<IActionResult> DeleteFrameLensRule(Guid id)
        {
            var item = await _context.FrameLensRules.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == TenantId);
            if (item == null) return NotFound();
            _context.FrameLensRules.Remove(item);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Regla eliminada" });
        }
    }
}
