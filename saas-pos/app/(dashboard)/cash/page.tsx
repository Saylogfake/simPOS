"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import { CashMovementsModal } from "@/components/cash/CashMovementsModal"
import { CloseCashWizard } from "@/components/cash/CloseCashWizard"
import { API_URL } from "@/lib/api"

const formatMoney = (amount: number) => {
    return "₲ " + new Intl.NumberFormat('es-PY', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount || 0)
}

export default function CashDashboard() {
    const [status, setStatus] = useState<any>(null)
    const [summary, setSummary] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [movementModalOpen, setMovementModalOpen] = useState(false)
    const [closeWizardOpen, setCloseWizardOpen] = useState(false)
    const [movementType, setMovementType] = useState<"INGRESO" | "EGRESO">("INGRESO")

    const fetchStatus = async () => {
        try {
            const token = localStorage.getItem("token")
            const res = await fetch(`${API_URL}/api/cash/status`, {
                headers: { "Authorization": `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setStatus(data)
                if (data.isOpen) fetchSummary(data.register.id)
            }
        } catch (e) { console.error(e) }
    }

    const fetchSummary = async (id: string) => {
        try {
            const token = localStorage.getItem("token")
            const res = await fetch(`${API_URL}/api/cash/summary/${id}`, {
                headers: { "Authorization": `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setSummary(data)
            }
        } catch (e) { console.error(e) }
    }

    useEffect(() => {
        const init = async () => {
            setLoading(true)
            await fetchStatus()
            setLoading(false)
        }
        init()
    }, [])

    if (loading) return (
        <div className="flex-1 flex items-center justify-center min-h-[80vh]">
            <span className="material-symbols-outlined animate-spin text-4xl text-primary">sync</span>
        </div>
    )

    return (
        <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 p-8 pt-4">
            <header className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-black tracking-tight uppercase italic">Control de Caja</h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Gestión de movimientos de efectivo y cierres de turno.</p>
                    </div>
                    {status?.isOpen ? (
                        <div className="flex items-center gap-3">
                            <button onClick={() => { setMovementType("INGRESO"); setMovementModalOpen(true) }} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-all">
                                <span className="material-symbols-outlined text-sm">arrow_circle_up</span> Ingreso
                            </button>
                            <button onClick={() => { setMovementType("EGRESO"); setMovementModalOpen(true) }} className="flex items-center gap-2 px-4 py-2.5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-all">
                                <span className="material-symbols-outlined text-sm">arrow_circle_down</span> Egreso
                            </button>
                            <button onClick={() => setCloseWizardOpen(true)} className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                                <span className="material-symbols-outlined text-sm">lock</span> Cerrar Caja
                            </button>
                        </div>
                    ) : (
                        <button onClick={() => window.location.href = "/pos"} className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-sm">point_of_sale</span> Abrir Caja en POS
                        </button>
                    )}
                </div>
            </header>

            {status?.isOpen ? (
                summary && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3 group hover:border-primary/50 transition-all">
                            <div className="flex items-center justify-between">
                                <span className="size-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                                    <span className="material-symbols-outlined">payments</span>
                                </span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Efectivo Real</span>
                            </div>
                            <p className="text-3xl font-black text-slate-900 dark:text-white italic">{formatMoney(summary.expectedTotal.cash)}</p>
                            <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 w-[65%]"></div>
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Inicial: {formatMoney(summary.openingAmount)}</p>
                        </div>
                        
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3 group hover:border-primary/50 transition-all">
                            <div className="flex items-center justify-between">
                                <span className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined">shopping_cart</span>
                                </span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ventas de Hoy</span>
                            </div>
                            <p className="text-3xl font-black text-slate-900 dark:text-white italic">
                                {formatMoney(summary.sales.cash + summary.sales.card + summary.sales.qr + summary.sales.transfer)}
                            </p>
                            <div className="flex gap-1">
                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[9px] font-bold text-slate-400">POS</span>
                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[9px] font-bold text-slate-400">REAL-TIME</span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase truncate">Efectivo: {formatMoney(summary.sales.cash)} | Tarjeta: {formatMoney(summary.sales.card)}</p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3 group hover:border-emerald-500/50 transition-all">
                            <div className="flex items-center justify-between">
                                <span className="size-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                                    <span className="material-symbols-outlined">trending_up</span>
                                </span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ingresos</span>
                            </div>
                            <p className="text-3xl font-black text-emerald-600 italic">+{formatMoney(summary.movements.ingress)}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Cargas manuales al fondo</p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3 group hover:border-rose-500/50 transition-all">
                            <div className="flex items-center justify-between">
                                <span className="size-10 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600">
                                    <span className="material-symbols-outlined">trending_down</span>
                                </span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Egresos</span>
                            </div>
                            <p className="text-3xl font-black text-rose-600 italic">-{formatMoney(summary.movements.egress)}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Retiros / Pagos diversos</p>
                        </div>
                    </div>
                )
            ) : (
                <div className="bg-white dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[40px] p-20 flex flex-col items-center justify-center text-center gap-4">
                    <div className="size-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-5xl text-slate-300">lock</span>
                    </div>
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter">La caja está cerrada</h3>
                    <p className="text-slate-500 max-w-sm">No hay un turno activo para este usuario. Inicia sesión en el punto de venta para comenzar a operar.</p>
                    <button onClick={() => window.location.href = "/pos"} className="mt-4 px-10 py-3 bg-primary text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.05] transition-all">Ir al Terminal POS</button>
                </div>
            )}

            {/* Modals */}
            {status?.isOpen && (
                <>
                    <CashMovementsModal
                        isOpen={movementModalOpen}
                        onClose={() => setMovementModalOpen(false)}
                        type={movementType}
                        registerId={status.register.id}
                        onSuccess={() => { fetchStatus(); }}
                    />
                    <CloseCashWizard
                        isOpen={closeWizardOpen}
                        onClose={() => setCloseWizardOpen(false)}
                        registerId={status.register.id}
                        summary={summary}
                        onSuccess={() => { window.location.reload(); }}
                    />
                </>
            )}
        </div>
    )
}
