"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import { CashSessionDetailModal } from "@/components/cash/CashSessionDetailModal"
import { API_URL } from "@/lib/api"

type CashRegister = {
    id: string
    openedAt: string
    closedAt?: string
    openingAmount: number
    expectedAmountCash: number
    closingAmountCash: number
    differenceCash: number
    differenceReason?: string
    status: string
    openedByUser?: { name: string }
    closedByUser?: { name: string }
}

const formatMoney = (amount: number) => {
    return "₲ " + new Intl.NumberFormat('es-PY', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount || 0)
}

export default function AdminCashPage() {
    const [history, setHistory] = useState<CashRegister[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedSession, setSelectedSession] = useState<any>(null)
    const [detailOpen, setDetailOpen] = useState(false)

    const fetchHistory = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem("token")
            const res = await fetch(`${API_URL}/api/cash/history`, {
                headers: { "Authorization": `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setHistory(data)
            }
        } catch (e) {
            console.error(e)
            toast.error("Error cargando historial")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchHistory()
    }, [])

    return (
        <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 p-8 pt-4">
            <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black tracking-tight uppercase italic flex items-center gap-3">
                        Auditoría de Caja
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 uppercase text-[10px] font-black tracking-widest">Historial completo de turnos y discrepancias financieras.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => fetchHistory()} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 transition-colors">
                        <span className="material-symbols-outlined text-[20px]">refresh</span>
                    </button>
                    <button className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-all">
                        <span className="material-symbols-outlined text-sm">download</span> Exportar Reporte
                    </button>
                </div>
            </header>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-wrap justify-between items-center gap-4">
                    <h3 className="font-black italic uppercase tracking-tighter text-slate-700 dark:text-slate-300">Registro de Turnos Finalizados</h3>
                    <div className="relative w-full max-w-md">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                        <input className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-6 py-3 text-xs font-bold uppercase tracking-widest placeholder:text-slate-300" placeholder="Buscar por cajero ID..." />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800">
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Apertura / Cajero</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Periodo</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Efectivo Esperado</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Monto Contado</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Diferencia</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-20 text-center">
                                        <div className="inline-block animate-spin size-8 border-4 border-primary border-t-transparent rounded-full"></div>
                                    </td>
                                </tr>
                            ) : history.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-20 text-center opacity-30">
                                        <span className="material-symbols-outlined text-6xl">query_stats</span>
                                        <p className="font-black uppercase italic mt-4">Sin registros para mostrar</p>
                                    </td>
                                </tr>
                            ) : history.map(reg => (
                                <tr key={reg.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="size-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-400 text-xs uppercase group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                {reg.openedByUser?.name.substring(0,2) || '??'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">{reg.openedByUser?.name || 'Sistema'}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">Abierto: {format(new Date(reg.openedAt), "dd/MM/yyyy HH:mm", { locale: es })}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col gap-1">
                                            {reg.closedAt ? (
                                                <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800 px-3 py-1 rounded-full uppercase italic">
                                                    Cerrado {format(new Date(reg.closedAt), "HH:mm")}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full uppercase animate-pulse inline-flex items-center gap-1 w-fit">
                                                    <div className="size-1.5 rounded-full bg-emerald-500"></div> En Curso
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-sm font-bold text-slate-400 text-right italic">{formatMoney(reg.expectedAmountCash)}</td>
                                    <td className="px-8 py-6 text-sm font-black text-slate-900 dark:text-white text-right italic">{formatMoney(reg.closingAmountCash)}</td>
                                    <td className="px-8 py-6">
                                        {reg.status !== "OPEN" ? (
                                            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest w-fit ${reg.differenceCash === 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600'}`}>
                                                <span className="material-symbols-outlined text-xs">{reg.differenceCash === 0 ? 'verified_user' : 'report_problem'}</span>
                                                {formatMoney(reg.differenceCash)}
                                            </div>
                                        ) : (
                                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">N/A</span>
                                        )}
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button 
                                            onClick={() => { setSelectedSession(reg); setDetailOpen(true) }}
                                            className="size-10 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-2xl transition-all"
                                        >
                                            <span className="material-symbols-outlined text-sm">visibility</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <CashSessionDetailModal
                isOpen={detailOpen}
                onClose={() => setDetailOpen(false)}
                session={selectedSession}
            />
        </div>
    )
}
