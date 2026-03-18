"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { API_URL } from "@/lib/api"

type ReturnModalProps = {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

type SaleItem = {
    id: string
    quantity: number
    productName: string
    price: number
    subtotal: number
}

export function ReturnModal({ isOpen, onClose, onSuccess }: ReturnModalProps) {
    const [step, setStep] = useState(1) // 1: Find Ticket, 2: Select Items, 3: Auth
    const [loading, setLoading] = useState(false)

    // Step 1: Ticket
    const [ticketId, setTicketId] = useState("")

    // Step 2: Items
    const [saleItems, setSaleItems] = useState<SaleItem[]>([])
    const [selectedItems, setSelectedItems] = useState<Record<string, number>>({}) // itemId -> qty to return

    // Step 3: Auth
    const [adminEmail, setAdminEmail] = useState("")
    const [password, setPassword] = useState("")

    // Recent Sales State
    const [recentSales, setRecentSales] = useState<any[]>([])

    useEffect(() => {
        if (isOpen) {
            setStep(1)
            setTicketId("")
            setSaleItems([])
            setSelectedItems({})
            setAdminEmail("")
            setPassword("")
            fetchRecentSales()
        }
    }, [isOpen])

    const fetchRecentSales = async () => {
        try {
            const token = localStorage.getItem("token")
            const res = await fetch(`${API_URL}/api/sales`, {
                headers: { "Authorization": `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setRecentSales(data.slice(0, 5))
            }
        } catch (e) {
            console.error("Error fetching recent sales", e)
        }
    }

    const searchTicket = async (id: string) => {
        setLoading(true)
        try {
            const token = localStorage.getItem("token")
            const res = await fetch(`${API_URL}/api/sales/${id}`, {
                headers: { "Authorization": `Bearer ${token}` }
            })
            if (!res.ok) {
                toast.error("Ticket no encontrado")
                setLoading(false)
                return
            }
            const data = await res.json()
            if (data.status === "VOID" || data.status === "REFUNDED") {
                toast.error("Este ticket ya fue anulado o reembolsado")
                setLoading(false)
                return
            }
            setSaleItems(data.items || [])
            setTicketId(id)
            setStep(2)
        } catch (e) {
            toast.error("Error al buscar ticket")
        } finally {
            setLoading(false)
        }
    }

    const handleSearchTicket = () => {
        if (!ticketId) return
        searchTicket(ticketId)
    }

    const handleToggleItem = (itemId: string, checked: boolean, maxQty: number) => {
        const next = { ...selectedItems }
        if (checked) {
            next[itemId] = maxQty
        } else {
            delete next[itemId]
        }
        setSelectedItems(next)
    }

    const updateQty = (itemId: string, qty: number, maxQty: number) => {
        if (qty > maxQty) qty = maxQty
        if (qty < 1) qty = 1

        const next = { ...selectedItems }
        next[itemId] = qty
        setSelectedItems(next)
    }

    const totalRefund = saleItems.reduce((acc, item) => {
        const retQty = selectedItems[item.id] || 0
        if (!retQty) return acc
        return acc + (item.price * retQty)
    }, 0)

    const handleProcessReturn = async () => {
        if (!adminEmail || !password) {
            toast.error("Complete las credenciales")
            return
        }

        setLoading(true)
        try {
            const itemsToReturn = Object.entries(selectedItems).map(([itemId, qty]) => ({
                itemId,
                quantity: qty
            }))

            const token = localStorage.getItem("token")
            const res = await fetch(`${API_URL}/api/sales/${ticketId}/return`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    adminEmail,
                    password,
                    items: itemsToReturn
                })
            })

            if (!res.ok) {
                const txt = await res.text()
                throw new Error(txt || `Error ${res.status}`)
            }

            toast.success("Devolución procesada exitosamente")
            onSuccess()
            onClose()
        } catch (e: any) {
            toast.error(`Error: ${e.message}`)
        } finally {
            setLoading(false)
        }
    }

    const formatMoney = (amount: number) => {
        return "₲ " + new Intl.NumberFormat('es-PY', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-xl p-0 border-none bg-transparent overflow-hidden rounded-[40px]">
                <div className="bg-white dark:bg-slate-950 flex flex-col">
                    <div className="p-10 pb-6 flex justify-between items-start">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-rose-500 text-3xl font-black">assignment_return</span>
                                <h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white">Devolución</h2>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-1">Procesar Reembolso de Mercadería</span>
                        </div>
                    </div>

                    <div className="px-10 py-4 min-h-[400px]">
                        {step === 1 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-2">ID de Ticket (UUID)</label>
                                    <div className="relative">
                                        <input
                                            placeholder="3FA85F64-..."
                                            value={ticketId}
                                            onChange={e => setTicketId(e.target.value)}
                                            className="w-full h-20 bg-slate-50 dark:bg-slate-900 border-4 border-slate-100 dark:border-slate-800 rounded-3xl text-xl font-black italic tracking-tighter text-slate-900 dark:text-white px-8 focus:border-primary transition-all uppercase"
                                        />
                                        <button 
                                            onClick={handleSearchTicket}
                                            disabled={loading || !ticketId}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 h-14 px-6 bg-primary text-white rounded-2xl flex items-center justify-center font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 active:scale-95 transition-all"
                                        >
                                            {loading ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : 'Buscar'}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">history</span>
                                        Tickets Recientes
                                    </h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        {recentSales.map(sale => (
                                            <div
                                                key={sale.id}
                                                onClick={() => searchTicket(sale.id)}
                                                className="group p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center cursor-pointer hover:border-primary/50 transition-all"
                                            >
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">#{sale.id.substring(0, 8)}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{new Date(sale.date).toLocaleString()}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-lg font-black italic tracking-tighter text-slate-900 dark:text-white">{formatMoney(sale.total)}</span>
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 opacity-60 group-hover:opacity-100 group-hover:text-primary transition-all">Seleccionar</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                                    {saleItems.map(item => (
                                        <div 
                                            key={item.id} 
                                            className={`p-4 rounded-2xl border-2 transition-all ${selectedItems[item.id] ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-900/30' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 opacity-60'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <Checkbox
                                                    checked={!!selectedItems[item.id]}
                                                    onCheckedChange={(c) => handleToggleItem(item.id, c as boolean, item.quantity)}
                                                    className="size-6 rounded-lg border-2"
                                                />
                                                <div className="flex-1">
                                                    <div className="font-black italic tracking-tighter uppercase text-slate-900 dark:text-white text-sm leading-none">{item.productName}</div>
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                        Vendidos: {item.quantity} x {formatMoney(item.price)}
                                                    </div>
                                                </div>
                                                {selectedItems[item.id] && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black text-rose-500 uppercase">QTY</span>
                                                        <input
                                                            type="number"
                                                            className="w-16 h-10 bg-white dark:bg-slate-800 border-2 border-rose-200 dark:border-rose-900/30 rounded-xl text-center font-black text-sm"
                                                            value={selectedItems[item.id]}
                                                            onChange={e => updateQty(item.id, Number(e.target.value), item.quantity)}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="p-6 bg-rose-500 rounded-3xl border-4 border-rose-400 shadow-xl shadow-rose-500/20 flex justify-between items-center text-white relative overflow-hidden">
                                    <div className="flex flex-col relative z-10">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Total a Reembolsar</span>
                                        <span className="text-3xl font-black italic tracking-tighter">{formatMoney(totalRefund)}</span>
                                    </div>
                                    <span className="material-symbols-outlined text-6xl opacity-20 transform -rotate-12">receipt_long</span>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-8 py-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="p-6 bg-rose-50 dark:bg-rose-900/10 rounded-3xl border border-rose-100 dark:border-rose-900/30 flex items-center gap-6">
                                    <div className="size-16 rounded-2xl bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/30">
                                        <span className="material-symbols-outlined text-4xl font-black">lock_person</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <h4 className="text-xl font-black italic tracking-tighter uppercase text-rose-600">Autorización Requerida</h4>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">Solo un administrador o supervisor puede autorizar esta devolución.</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-2">Email del Autorizador</label>
                                        <input 
                                            value={adminEmail} 
                                            onChange={e => setAdminEmail(e.target.value)}
                                            placeholder="ADMIN@EXAMPLE.COM"
                                            className="w-full h-16 bg-slate-50 dark:bg-slate-900 border-4 border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-black italic tracking-tighter uppercase text-slate-900 dark:text-white px-8 focus:border-rose-500 transition-all shadow-inner"
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-2">Contraseña</label>
                                        <input 
                                            type="password"
                                            value={password} 
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full h-16 bg-slate-50 dark:bg-slate-900 border-4 border-slate-100 dark:border-slate-800 rounded-2xl text-xl tracking-[0.5em] text-slate-900 dark:text-white px-8 focus:border-rose-500 transition-all shadow-inner"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-10 pt-4 flex gap-4">
                        {step > 1 && (
                            <Button
                                variant="ghost" 
                                onClick={() => setStep(step - 1)}
                                className="h-16 px-10 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                                <span className="material-symbols-outlined mr-2">arrow_back</span>
                                Volver
                            </Button>
                        )}
                        <Button
                            onClick={step === 1 ? handleSearchTicket : (step === 2 ? () => setStep(3) : handleProcessReturn)}
                            disabled={loading || (step === 1 && !ticketId) || (step === 2 && totalRefund === 0)}
                            className={`flex-1 h-16 ${step === 3 ? 'bg-rose-600 hover:bg-rose-700' : 'bg-primary hover:bg-primary/90'} text-white rounded-2xl font-black uppercase italic tracking-widest text-lg shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95`}
                        >
                            {loading ? <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span> : <span className="material-symbols-outlined text-2xl font-black">{step === 3 ? 'verified_user' : 'arrow_forward'}</span>}
                            {step === 1 ? 'Buscar Ticket' : (step === 2 ? 'Continuar' : 'Autorizar y Reembolsar')}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
