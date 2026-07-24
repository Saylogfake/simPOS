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
    public class PromotionalRulesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private Guid TenantId => Guid.Parse(User.FindFirst("tenant_id")?.Value ?? Guid.Empty.ToString());

        public PromotionalRulesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var rules = await _context.PromotionalRules
                .Where(x => x.TenantId == TenantId)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();
            return Ok(rules);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var rule = await _context.PromotionalRules
                .FirstOrDefaultAsync(x => x.Id == id && x.TenantId == TenantId);
            if (rule == null) return NotFound();
            return Ok(rule);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] PromotionalRule request)
        {
            var rule = new PromotionalRule
            {
                TenantId = TenantId,
                Name = request.Name,
                Description = request.Description,
                RuleType = request.RuleType,
                TargetId = request.TargetId,
                ConditionType = request.ConditionType,
                ConditionValue = request.ConditionValue,
                BenefitType = request.BenefitType,
                BenefitValue = request.BenefitValue,
                IsActive = request.IsActive,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
            };
            _context.PromotionalRules.Add(rule);
            await _context.SaveChangesAsync();
            return Ok(rule);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] PromotionalRule request)
        {
            var rule = await _context.PromotionalRules
                .FirstOrDefaultAsync(x => x.Id == id && x.TenantId == TenantId);
            if (rule == null) return NotFound();

            rule.Name = request.Name;
            rule.Description = request.Description;
            rule.RuleType = request.RuleType;
            rule.TargetId = request.TargetId;
            rule.ConditionType = request.ConditionType;
            rule.ConditionValue = request.ConditionValue;
            rule.BenefitType = request.BenefitType;
            rule.BenefitValue = request.BenefitValue;
            rule.IsActive = request.IsActive;
            rule.StartDate = request.StartDate;
            rule.EndDate = request.EndDate;
            rule.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(rule);
        }

        [HttpPut("{id}/toggle")]
        public async Task<IActionResult> Toggle(Guid id)
        {
            var rule = await _context.PromotionalRules
                .FirstOrDefaultAsync(x => x.Id == id && x.TenantId == TenantId);
            if (rule == null) return NotFound();
            rule.IsActive = !rule.IsActive;
            rule.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(rule);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var rule = await _context.PromotionalRules
                .FirstOrDefaultAsync(x => x.Id == id && x.TenantId == TenantId);
            if (rule == null) return NotFound();
            _context.PromotionalRules.Remove(rule);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Regla eliminada" });
        }
    }
}
