using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaasPos.Backend.Data;
using SaasPos.Backend.Models;
using SaasPos.Backend.Services;

namespace SaasPos.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class SalesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly InventoryService _inventory;
        private readonly DebtService _debtService;
        private readonly CashService _cashService;

        public SalesController(AppDbContext context, InventoryService inventory, DebtService debtService, CashService cashService)
        {
            _context = context;
            _inventory = inventory;
            _debtService = debtService;
            _cashService = cashService;
        }

        [HttpPost]
        public async Task<IActionResult> CreateSale([FromBody] CreateSaleRequest request)
        {
            var userIdClaim = User.FindFirst("id")?.Value;
            var tenantIdClaim = User.FindFirst("tenant_id")?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
                return Unauthorized();
            if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                return Unauthorized();

            var sale = new Sale
            {
                TenantId = tenantId,
                UserId = userId,
                CustomerId = request.CustomerId,
                Status = "OPEN",
                PaymentStatus = "PENDING"
            };

            _context.Sales.Add(sale);
            await _context.SaveChangesAsync();

            return Ok(new { sale_id = sale.Id, status = sale.Status });
        }

        [HttpPost("{id}/items")]
        public async Task<IActionResult> AddItem(Guid id, [FromBody] AddItemRequest request)
        {
            var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
            if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                return Unauthorized();

            var sale = await _context.Sales.Include(s => s.Items).FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tenantId);
            if (sale == null) return NotFound();

            var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == request.ProductId && p.TenantId == tenantId);
            if (product == null) return NotFound("Product not found");

            if (product.TrackStock && product.Stock < request.Quantity)
            {
                return BadRequest($"Insufficient stock. Available: {product.Stock}");
            }

            // Solo descuenta stock si el producto lo requiere
            if (product.TrackStock)
                await _inventory.AdjustStockAsync(product.Id, -request.Quantity, "SALE", "Sale Item", sale.UserId, sale.Id.ToString());

            var subtotal = product.Price * request.Quantity;

            var item = new SaleItem
            {
                SaleId = id,
                ProductId = request.ProductId,
                Quantity = request.Quantity,
                Price = product.Price,
                Subtotal = subtotal
            };

            _context.SaleItems.Add(item);
            
            // Update Sale Total
            sale.Total += subtotal; 
            
            await _context.SaveChangesAsync();
            Console.WriteLine($"[Stock Debug] Saved Changes.");

            return Ok(new { itemId = item.Id, subtotal, total = sale.Total });
        }

        [HttpPost("{id}/pay")]
        public async Task<IActionResult> Pay(Guid id, [FromBody] PayRequest request)
        {
            var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
            if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                return Unauthorized();

            var sale = await _context.Sales.FindAsync(id);
            if (sale == null || sale.TenantId != tenantId) return NotFound();

            // Validate Cash Register if needed (except for Credit only, but usually checkout requires open register)
            if (request.CashRegisterId != Guid.Empty)
            {
                var register = await _context.CashRegisters.FindAsync(request.CashRegisterId);
                if (register == null || register.Status != "OPEN")
                {
                    // return BadRequest("Caja cerrada o inválida"); // Optional: enforce open register
                }
            }

            decimal totalPaid = 0;
            foreach(var p in request.Payments)
            {
                var payment = new Payment
                {
                    SaleId = id,
                    Method = p.Method,
                    Amount = p.Amount
                };
                _context.Payments.Add(payment);
                totalPaid += p.Amount;

                // Handle Logic per Method
                if (p.Method == "CREDIT")
                {
                    if (!sale.CustomerId.HasValue) return BadRequest("Venta a crédito requiere cliente");
                    if (!p.DueDate.HasValue) return BadRequest("Venta a crédito requiere fecha de vencimiento");

                    await _debtService.CreateDebtAsync(sale.CustomerId.Value, p.Amount, p.DueDate.Value);
                }
                else
                {
                    // Cash/Card/QR -> Impact Cash Register
                    if (request.CashRegisterId != Guid.Empty)
                    {
                        string reason = $"Venta #{sale.Id.ToString().Substring(0, 8)}";
                        await _cashService.RecordMovementAsync(new CashMovementRequest
                        {
                            CashRegisterId = request.CashRegisterId,
                            Type = "VENTA", // Special type for Sales that adds to Balance
                            Amount = p.Amount,
                            PaymentMethod = p.Method,
                            Reason = reason,
                            UserId = sale.UserId
                        });
                    }
                }
            }

            if (totalPaid >= sale.Total)
            {
                sale.Status = "PAID";
                sale.PaymentStatus = "PAID";
            }

            await _context.SaveChangesAsync();
            return Ok(new { status = sale.Status, change = totalPaid - sale.Total });
        }

        [HttpGet]
        public async Task<IActionResult> GetSales()
        {
            var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
            if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                return Unauthorized();

            var sales = await _context.Sales
                .Where(s => s.TenantId == tenantId)
                .Include(s => s.User)
                .Include(s => s.Items)
                .OrderByDescending(s => s.CreatedAt)
                .Take(50)
                .Select(s => new
                {
                    s.Id,
                    Date = s.CreatedAt,
                    User = s.User.Name,
                    s.Total,
                    s.Status,
                    s.PaymentStatus,
                    ItemsCount = s.Items.Count
                })
                .ToListAsync();

            return Ok(sales);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetSale(Guid id)
        {
            var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
            if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                return Unauthorized();

            var sale = await _context.Sales
                .Include(s => s.Items)
                .ThenInclude(i => i.Product)
                .FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tenantId);

            if (sale == null) return NotFound();

            return Ok(new
            {
                sale.Id,
                sale.Total,
                sale.Status,
                Items = sale.Items.Select(i => new {
                    i.Id,
                    i.ProductId,
                    i.Quantity,
                    i.Price,
                    i.Subtotal,
                    ProductName = i.Product.Name // Send name for frontend
                })
            });
        }
        [HttpDelete("{id}/items/{itemId}")]
        public async Task<IActionResult> DeleteItem(Guid id, Guid itemId)
        {
            var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
            if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                return Unauthorized();

            var sale = await _context.Sales.Include(s => s.Items).FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tenantId);
            if (sale == null) return NotFound("Sale not found");

            var item = sale.Items.FirstOrDefault(i => i.Id == itemId);
            // If item not found by ID, try finding by ProductId (compatibility for frontend calling by ProductId logic if needed, but ItemId is safer)
            // Let's assume frontend passes ItemId. Wait, frontend currently knows ProductId but gets ItemId after adding. 
            // Better: Frontend will receive ItemId on Add.
            
            if (item == null) return NotFound("Item not found in sale");

            var product = await _context.Products.FindAsync(item.ProductId);
            if (product != null && product.TrackStock)
            {
                // RESTORE STOCK via Service
                await _inventory.AdjustStockAsync(item.ProductId, item.Quantity, "RETURN", "Item Removed", sale.UserId, sale.Id.ToString());
            }

            sale.Total -= item.Subtotal;
            _context.SaleItems.Remove(item);

            await _context.SaveChangesAsync();
            return Ok(new { total = sale.Total });
        }

        [HttpPost("{id}/return")]
        public async Task<IActionResult> ReturnItems(Guid id, [FromBody] ReturnRequest request)
        {
            var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
            if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                return Unauthorized();

            // 1. Verify credentials (simplified for MVP)
            var adminUser = await _context.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Email == request.AdminEmail && u.TenantId == tenantId);
            if (adminUser == null || !adminUser.IsActive || !BCrypt.Net.BCrypt.Verify(request.Password, adminUser.PasswordHash))
            {
                return Unauthorized("Credenciales inválidas");
            }

            var sale = await _context.Sales.Include(s => s.Items).FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tenantId);
            if (sale == null) return NotFound("Venta no encontrada");

            decimal totalRefund = 0;

            foreach (var returnItem in request.Items)
            {
                var saleItem = sale.Items.FirstOrDefault(i => i.Id == returnItem.ItemId);
                if (saleItem == null) continue; // Skip invalid items

                // Validation: Cannot return more than matched
                if (returnItem.Quantity > saleItem.Quantity) return BadRequest("Cantidad a devolver mayor a la vendida");

                // 1. Restore Stock
                await _inventory.AdjustStockAsync(saleItem.ProductId, returnItem.Quantity, "RETURN", $"Return Ticket #{sale.Id.ToString().Substring(0, 8)}", adminUser.Id, sale.Id.ToString());

                // 2. Calculate Refund Amount
                decimal refundAmount = (saleItem.Subtotal / saleItem.Quantity) * returnItem.Quantity;
                totalRefund += refundAmount;

                // Optional: Update Item Qty in Sale? Or just keep original record and add a "Returned" flag?
                // For MVP, we will just Adjust Financials and Stock without mutating the original SaleItem record quantity directly to preserve history,
                // OR we could split the item to show returned status.
                // Simpler: Just Log Financial Adjustment.
            }

            // 3. Record Negative Payment (Refund)
            if (totalRefund > 0)
            {
                var payment = new Payment
                {
                    SaleId = sale.Id,
                    Method = "CASH", // Default to Cash refund
                    Amount = -totalRefund // Negative amount
                };
                _context.Payments.Add(payment);
                
                // Adjust Sale Total? 
                // Usually Sale Total remains same (what was sold), but Balance/Payments change.
                // But user wants to "Discount from profits".
                // If we treat "Total" as "Net Sales", we should decrease it.
                // Let's decrease Total to reflect actual final revenue.
                sale.Total -= totalRefund;
            }

            await _context.SaveChangesAsync();

            return Ok(new { newTotal = sale.Total, refunded = totalRefund });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSale(Guid id)
        {
            var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
            if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                return Unauthorized();

            var sale = await _context.Sales.Include(s => s.Items).FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tenantId);
            if (sale == null) return NotFound();

            // Restore Stock for ALL items
            foreach (var item in sale.Items)
            {
                var product = await _context.Products.FindAsync(item.ProductId);
                if (product != null && product.TrackStock)
                {
                    await _inventory.AdjustStockAsync(item.ProductId, item.Quantity, "VOID", "Sale Cancelled", sale.UserId, sale.Id.ToString());
                }
            }

            _context.Sales.Remove(sale);
            await _context.SaveChangesAsync();
            Console.WriteLine($"[Stock Debug] Sale {id} cancelled. All stock restored.");

            return Ok();
        }
        [HttpPut("{id}/customer")]
        public async Task<IActionResult> UpdateCustomer(Guid id, [FromBody] UpdateCustomerRequest request)
        {
            var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
            if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                return Unauthorized();

            var sale = await _context.Sales.FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tenantId);
            if (sale == null) return NotFound();

            sale.CustomerId = request.CustomerId;
            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

    }

    public class UpdateCustomerRequest
    {
        public Guid? CustomerId { get; set; }
    }
    public class ReturnRequest
    {
        public string AdminEmail { get; set; } // Or Username, for now using Email
        public string Password { get; set; }
        public List<ReturnItemDto> Items { get; set; }
    }

    public class ReturnItemDto
    {
        public Guid ItemId { get; set; }
        public decimal Quantity { get; set; }
    }

    public class CreateSaleRequest
    {
        public Guid? CustomerId { get; set; }
    }

    public class AddItemRequest
    {
        public Guid ProductId { get; set; }
        public decimal Quantity { get; set; }
    }

    public class PayRequest
    {
        public Guid CashRegisterId { get; set; }
        public List<PaymentDto> Payments { get; set; }
    }

    public class PaymentDto
    {
        public string Method { get; set; }
        public decimal Amount { get; set; }
        public DateTime? DueDate { get; set; }
    }
}
