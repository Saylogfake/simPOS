import { loadSettings } from './settings'

function center(text: string, W: number): string {
  const pad = Math.max(0, Math.floor((W - text.length) / 2))
  return ' '.repeat(pad) + text
}

function lr(left: string, right: string, W: number, PC: number): string {
  const l = left.length > PC ? left.slice(0, PC) : left
  const rPadded = right.length > W - PC ? right.slice(0, W - PC) : ' '.repeat(W - PC - right.length) + right
  return l + rPadded
}

function sep(char: string, W: number): string {
  return char.repeat(W)
}

export function formatTicketText(
  items: { name: string; quantity: number; price: number; subtotal: number; originalPrice?: number; discountPercentage?: number }[],
  customerName: string | null,
  total: number,
  saleChange: number,
  paymentEntries: { method: string; amount: number }[]
): string {
  const s = loadSettings()
  const W = s.ticketWidth || 80
  const PRICE_COL = Math.floor(W * 0.6)
  const userData = localStorage.getItem('user')
  const vendedor = userData ? JSON.parse(userData).name : 'N/A'
  const fmt = (n: number) => 'Gs. ' + n.toLocaleString('es-PY')

  const dateStr = new Date().toLocaleString('es-PY', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const lines: string[] = []

  lines.push(center(s.companyName || '', W))

  if (s.logoUrl) {
    lines.push(center('[LOGO]', W))
    lines.push('')
  }

  lines.push(center(s.ticketHeader, W))
  lines.push(center(dateStr, W))
  lines.push(sep('=', W))
  lines.push(`CLIENTE: ${customerName || 'Consumidor Final'}`)
  lines.push(`VENDEDOR: ${vendedor}`)
  lines.push(sep('=', W))
  lines.push(center('DETALLE', W))
  lines.push(sep('=', W))

  for (const item of items) {
    lines.push(item.name.slice(0, W))

    const hasDiscount = item.discountPercentage && item.discountPercentage > 0
    const orig = item.originalPrice ?? item.price
    const disc = item.price

    if (hasDiscount) {
      lines.push(lr(`  ${item.quantity} x ${fmt(orig)}`, fmt(disc), W, PRICE_COL))
      lines.push(lr(`  Desc: -${item.discountPercentage}%`, '', W, PRICE_COL))
    } else {
      lines.push(lr(`  ${item.quantity} x ${fmt(disc)}`, fmt(item.subtotal), W, PRICE_COL))
    }
  }

  lines.push(sep('-', W))
  for (const pmt of paymentEntries) {
    lines.push(lr(pmt.method, fmt(pmt.amount), W, PRICE_COL))
  }
  lines.push(sep('-', W))

  lines.push(lr('TOTAL', fmt(total), W, PRICE_COL))
  if (saleChange > 0) {
    lines.push(lr('VUELTO', fmt(saleChange), W, PRICE_COL))
  }

  lines.push(sep('=', W))
  if (s.ticketFooter) {
    lines.push('')
    lines.push(center(s.ticketFooter, W))
  }
  lines.push('')
  lines.push('')

  return lines.join('\n')
}

export function printTicket(
  items: { name: string; quantity: number; price: number; subtotal: number; originalPrice?: number; discountPercentage?: number }[],
  customerName: string | null,
  total: number,
  saleChange: number,
  paymentEntries: { method: string; amount: number }[]
): void {
  const text = formatTicketText(items, customerName, total, saleChange, paymentEntries)
  openTextPrint(text)
}

function openTextPrint(text: string) {
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Ticket</title>
<style>
  @page { size: 8.5in 11in; margin: 0.2in; }
  * { margin: 0; padding: 0; }
  body { font-family: 'Courier New', 'Lucida Console', monospace; font-size: 9pt; line-height: 1.15; white-space: pre; }
  pre { margin: 0; padding: 0; font-size: 9pt; line-height: 1.15; }
</style>
</head>
<body><pre>${escapeHtml(text)}</pre></body>
</html>`

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.top = '-9999px'
  iframe.style.left = '-9999px'
  iframe.style.width = '700px'
  iframe.style.height = '600px'
  iframe.style.border = 'none'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (doc) {
    doc.open()
    doc.write(html)
    doc.close()
    iframe.onload = () => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => document.body.removeChild(iframe), 1000)
    }
  } else {
    document.body.removeChild(iframe)
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
