"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { API_URL } from "@/lib/api"

type Customer = {
    id: string
    name: string
    email: string
    phone: string
    balance: number
}

type Debt = {
    id: string
    amount: number
    paidAmount: number
    dueDate: string
    status: string
    createdAt: string
}

interface CustomerDetailsModalProps {
    customer: Customer | null
    isOpen: boolean
    onClose: () => void
    onUpdate: () => void
}

export function CustomerDetailsModal({ customer, isOpen, onClose, onUpdate }: CustomerDetailsModalProps) {
    const [debts, setDebts] = useState<Debt[]>([])
    const [loading, setLoading] = useState(false)
    const [payAmount, setPayAmount] = useState<Record<string, string>>({}) // debtId -> amount
    const [paymentMethod, setPaymentMethod] = useState("CASH")
    const [registerId, setRegisterId] = useState<string | null>(null)

    useEffect(() => {
        if (customer && isOpen) {
            fetchDebts()
            checkRegister()
        }
    }, [customer, isOpen])

    const fetchDebts = async () => {
        if (!customer) return
        setLoading(true)
        try {
            const token = localStorage.getItem("token")
            const res = await fetch(`${API_URL}/api/debts/customer/${customer.id}`, {
                headers: { "Authorization": `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setDebts(data)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const checkRegister = async () => {
        try {
            const token = localStorage.getItem("token")
            const res = await fetch(`${API_URL}/api/cash/status`, {
                headers: { "Authorization": `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                if (data.isOpen) setRegisterId(data.register.id)
            }
        } catch { }
    }

    const handlePayDebt = async (debtId: string) => {
        const amountStr = payAmount[debtId]
        if (!amountStr || !registerId) {
            toast.error("Ingrese monto y asegúrese de que la caja esté abierta")
            return
        }

        try {
            const token = localStorage.getItem("token")
            const res = await fetch(`${API_URL}/api/debts/pay`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    debtId,
                    amount: parseFloat(amountStr),
                    paymentMethod,
                    cashRegisterId: registerId
                })
            })

            if (res.ok) {
                toast.success("Pago registrado exitosamente")
                fetchDebts()
                onUpdate()
                setPayAmount(prev => ({ ...prev, [debtId]: "" }))
            } else {
                toast.error("Error al registrar pago")
            }
        } catch (e) {
            toast.error("Error de conexión")
        }
    }

    const formatMoney = (amount: number) => {
        return "₲ " + new Intl.NumberFormat('es-PY', { minimumFractionDigits: 0 }).format(amount || 0)
    }

    if (!customer) return null

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-full sm:max-w-2xl lg:max-w-6xl p-0 border-none bg-transparent overflow-hidden rounded-none sm:rounded-[40px]">
                <div className="bg-white dark:bg-slate-950 flex flex-col max-h-[90vh]">
                    <div className="p-10 pb-6 flex justify-between items-start bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-3">
                                <div className="size-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined text-3xl font-black">person</span>
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white leading-none">{customer.name}</h2>
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-1 block">Perfil de Cliente Especial</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-end">
                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Balance Actual</span>
                                <span className={`text-xl font-black italic tracking-tighter ${customer.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {formatMoney(customer.balance)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden flex flex-col sm:flex-row">
                        {/* Sidebar Info */}
                        <div className="w-full sm:w-72 lg:w-80 border-b sm:border-b-0 sm:border-r border-slate-100 dark:border-slate-800 p-6 sm:p-8 space-y-6 sm:space-y-8 bg-slate-50/30 dark:bg-slate-900/20 overflow-y-auto">
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-2 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-xs">contact_mail</span>
                                    Contacto
                                </h4>
                                <div className="space-y-4">
                                    <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                        <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Email</span>
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300 break-all">{customer.email || "SIN REGISTRO"}</span>
                                    </div>
                                    <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                        <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Teléfono</span>
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{customer.phone || "SIN REGISTRO"}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-900 rounded-3xl border-4 border-slate-200 dark:border-slate-800 text-white relative overflow-hidden group">
                                <div className="relative z-10">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Estado de Cuenta</span>
                                    <div className="mt-2 flex items-center gap-2">
                                        <div className={`size-3 rounded-full animate-pulse ${customer.balance > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                                        <span className="text-xs font-black uppercase italic tracking-widest">
                                            {customer.balance > 0 ? 'Moroso / Deuda' : 'Al Día'}
                                        </span>
                                    </div>
                                </div>
                                <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-7xl text-white/5 transform group-hover:rotate-12 transition-transform">verified_user</span>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                            <Tabs defaultValue="debts" className="space-y-8">
                                <TabsList className="bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl">
                                    <TabsTrigger value="debts" className="rounded-xl px-8 font-black uppercase italic tracking-widest text-[10px] data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm">
                                        Cuentas a Cobrar
                                    </TabsTrigger>
                                    <TabsTrigger value="history" className="rounded-xl px-8 font-black uppercase italic tracking-widest text-[10px] data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm">
                                        Historial Pagados
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="debts" className="space-y-4 outline-none">
                                    <div className="grid grid-cols-1 gap-4">
                                        {debts.filter(d => d.status !== 'PAID').map(debt => (
                                            <div key={debt.id} className="p-6 bg-white dark:bg-slate-800 rounded-3xl border-2 border-slate-100 dark:border-slate-700 shadow-sm hover:border-primary/30 transition-all group">
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">TICKET VENTA</span>
                                                        <h4 className="text-xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white leading-none mt-1">
                                                            #{debt.id.substring(0, 8)}
                                                        </h4>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase mt-2">EMITIDO: {new Date(debt.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2">
                                                        <Badge className={`rounded-xl px-4 py-1 font-black uppercase italic tracking-widest text-[8px] ${debt.status === 'PARTIAL' ? 'bg-amber-500' : 'bg-rose-500'}`}>
                                                            {debt.status === 'PARTIAL' ? 'PAGO PARCIAL' : 'PENDIENTE'}
                                                        </Badge>
                                                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 dark:bg-rose-900/20 px-3 py-1 rounded-full">Vence: {new Date(debt.dueDate).toLocaleDateString()}</span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-6 mb-8">
                                                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl flex flex-col">
                                                        <span className="text-[8px] font-black uppercase text-slate-400">Neto Original</span>
                                                        <span className="text-lg font-black italic tracking-tighter text-slate-600">{formatMoney(debt.amount)}</span>
                                                    </div>
                                                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl flex flex-col">
                                                        <span className="text-[8px] font-black uppercase text-slate-400">Total Amortizado</span>
                                                        <span className="text-lg font-black italic tracking-tighter text-emerald-600">{formatMoney(debt.paidAmount)}</span>
                                                    </div>
                                                    <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex flex-col ring-2 ring-inset ring-rose-100 dark:ring-rose-900/30">
                                                        <span className="text-[8px] font-black uppercase text-rose-500">Saldo Pendiente</span>
                                                        <span className="text-lg font-black italic tracking-tighter text-rose-600">{formatMoney(debt.amount - debt.paidAmount)}</span>
                                                    </div>
                                                </div>

                                                <div className="flex gap-4 items-center bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                                                    <div className="flex-1 space-y-2">
                                                        <label className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Monto a Cobrar</label>
                                                        <input
                                                            type="number"
                                                            placeholder="0"
                                                            value={payAmount[debt.id] || ""}
                                                            onChange={e => setPayAmount(prev => ({ ...prev, [debt.id]: e.target.value }))}
                                                            className="w-full h-12 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-xl font-black italic tracking-tighter text-slate-900 dark:text-white px-4 focus:border-primary transition-all outline-none"
                                                        />
                                                    </div>
                                                    <div className="w-40 space-y-2">
                                                        <label className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Método</label>
                                                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                                            <SelectTrigger className="h-12 border-2 border-slate-100 dark:border-slate-700 rounded-xl font-black uppercase italic tracking-widest text-[10px]">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="rounded-xl border-2 border-slate-100 dark:border-slate-700">
                                                                <SelectItem value="CASH">Efectivo 💵</SelectItem>
                                                                <SelectItem value="CARD">Tarjeta 💳</SelectItem>
                                                                <SelectItem value="QR">QR Transferencia 📱</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="pt-6">
                                                        <Button 
                                                            onClick={() => handlePayDebt(debt.id)} 
                                                            disabled={!registerId || !payAmount[debt.id]}
                                                            className="h-12 px-8 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black uppercase italic tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2"
                                                        >
                                                            <span className="material-symbols-outlined text-sm font-black">payments</span>
                                                            Procesar Cobro
                                                        </Button>
                                                    </div>
                                                </div>
                                                {!registerId && <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest mt-3 flex items-center gap-2 px-2">
                                                    <span className="material-symbols-outlined text-sm">lock_clock</span>
                                                    ⚠️ Caja Cerrada - Abra caja para permitir cobros
                                                </div>}
                                            </div>
                                        ))}

                                        {debts.filter(d => d.status !== 'PAID').length === 0 && (
                                            <div className="h-64 flex flex-col items-center justify-center text-center p-10 bg-slate-50 dark:bg-slate-900/50 rounded-[40px] border-4 border-dashed border-slate-100 dark:border-slate-800 opacity-60">
                                                <span className="material-symbols-outlined text-7xl text-slate-300">task_alt</span>
                                                <p className="font-black italic uppercase tracking-widest text-slate-400 mt-4">No se registran deudas pendientes</p>
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>

                                <TabsContent value="history" className="space-y-4 outline-none">
                                    <div className="space-y-3">
                                        {debts.filter(d => d.status === 'PAID').map(debt => (
                                            <div key={debt.id} className="group p-5 bg-emerald-50/30 dark:bg-emerald-900/10 rounded-3xl border-2 border-emerald-100 dark:border-emerald-900/30 flex justify-between items-center hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="size-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                                                        <span className="material-symbols-outlined text-xl font-black">verified</span>
                                                    </div>
                                                    <div>
                                                        <div className="font-black italic tracking-tighter uppercase text-slate-900 dark:text-white leading-none">Venta Saldada #{debt.id.substring(0, 8)}</div>
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Saldado el: {new Date(debt.createdAt).toLocaleDateString()}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right flex flex-col items-end gap-1">
                                                    <span className="text-xl font-black italic tracking-tighter text-emerald-600 leading-none">{formatMoney(debt.amount)}</span>
                                                    <Badge variant="outline" className="rounded-full border-emerald-500 text-emerald-500 text-[8px] font-black px-3 py-0">COMPLETADO</Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>

                    <div className="p-10 pt-4 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sistema de Control de Cartera • Última actualización: {new Date().toLocaleDateString()}</p>
                        <Button
                            onClick={onClose}
                            className="h-14 px-12 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase italic tracking-widest text-[10px] shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95"
                        >
                            Cerrar Expediente
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
