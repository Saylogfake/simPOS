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

type Analytics = {
    weekSales: number[]
    weekIngress: number
    weekEgress: number
    monthlyTotals: { label: string; total: number }[]
}

const formatMoney = (amount: number) =>
    "₲ " + new Intl.NumberFormat('es-PY', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount || 0)

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

function BarChart({ data, color }: { data: number[]; color: string }) {
    const max = Math.max(...data, 1)
    return (
        <div className="flex items-end gap-1 h-14 w-full">
            {data.map((v, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                        className={`w-full rounded-t-md transition-all ${color}`}
                        style={{ height: `${Math.max(4, (v / max) * 48)}px` }}
                    />
                    <span className="text-[8px] font-black text-slate-400 uppercase">{DAYS[i]}</span>
                </div>
            ))}
        </div>
    )
}

function LineChart({ data }: { data: { label: string; total: number }[] }) {
    if (data.length < 2) return (
        <div className="flex items-center justify-center h-14 text-[10px] text-slate-400 font-bold uppercase">Sin datos suficientes</div>
    )
    const max = Math.max(...data.map(d => d.total), 1)
    const w = 100 / (data.length - 1)
    const points = data.map((d, i) => `${i * w},${48 - (d.total / max) * 44}`)
    return (
        <div className="w-full">
            <svg viewBox={`0 0 100 52`} className="w-full h-14" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <polygon
                    points={`0,52 ${points.join(" ")} 100,52`}
                    fill="url(#lineGrad)"
                />
                <polyline
                    points={points.join(" ")}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                {data.map((d, i) => (
                    <circle key={i} cx={i * w} cy={48 - (d.total / max) * 44} r="2" fill="#10b981" />
                ))}
            </svg>
            <div className="flex justify-between mt-1">
                <span className="text-[8px] font-black text-slate-400">{data[0]?.label}</span>
                <span className="text-[8px] font-black text-slate-400">{data[data.length - 1]?.label}</span>
            </div>
        </div>
    )
}

export default function AdminCashPage() {
    const [history, setHistory] = useState<CashRegister[]>([])
    const [analytics, setAnalytics] = useState<Analytics | null>(null)
    const [loading, setLoading] = useState(true)
    const [selectedSession, setSelectedSession] = useState<any>(null)
    const [detailOpen, setDetailOpen] = useState(false)

    const token = () => localStorage.getItem("token")

    const fetchHistory = async () => {
        setLoading(true)
        try {
            const res = await fetch(`${API_URL}/api/cash/history`, { headers: { "Authorization": `Bearer ${token()}` } })
            if (res.ok) setHistory(await res.json())
        } catch (e) {
            toast.error("Error cargando historial")
        } finally {
            setLoading(false)
        }
    }

    const fetchAnalytics = async () => {
        try {
            const res = await fetch(`${API_URL}/api/cash/analytics`, { headers: { "Authorization": `Bearer ${token()}` } })
            if (res.ok) setAnalytics(await res.json())
        } catch (e) { console.error(e) }
    }

    useEffect(() => {
        fetchHistory()
        fetchAnalytics()
    }, [])

    const totalWeekSales = analytics?.weekSales.reduce((a, b) => a + b, 0) ?? 0
    const netGlobal = analytics?.monthlyTotals.reduce((a, b) => a + b.total, 0) ?? 0
    const minMonth = analytics?.monthlyTotals.length ? Math.min(...analytics.monthlyTotals.map(m => m.total)) : 0
    const maxMonth = analytics?.monthlyTotals.length ? Math.max(...analytics.monthlyTotals.map(m => m.total)) : 0

    return (
        <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 p-4 md:p-8 pt-4">
            <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black tracking-tight uppercase italic">Auditoría de Caja</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 uppercase text-[10px] font-black tracking-widest">Historial completo de turnos y discrepancias financieras.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => { fetchHistory(); fetchAnalytics() }} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 transition-colors">
                        <span className="material-symbols-outlined text-[20px]">refresh</span>
                    </button>
                    <button className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-all">
                        <span className="material-symbols-outlined text-sm">download</span> Exportar
                    </button>
                </div>
            </header>

            {/* ── 3 Tarjetas de Analytics ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {/* 1. Ventas de la semana */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ventas esta semana</p>
                            <p className="text-2xl font-black italic text-slate-900 dark:text-white mt-1">{formatMoney(totalWeekSales)}</p>
                        </div>
                        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined">bar_chart</span>
                        </div>
                    </div>
                    <BarChart data={analytics?.weekSales ?? Array(7).fill(0)} color="bg-primary/70" />
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Lunes a Domingo — semana actual</p>
                </div>

                {/* 2. Ingresos vs Egresos */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ingresos / Egresos</p>
                            <p className="text-2xl font-black italic text-emerald-600 mt-1">+{formatMoney(analytics?.weekIngress ?? 0)}</p>
                        </div>
                        <div className="size-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                            <span className="material-symbols-outlined">swap_vert</span>
                        </div>
                    </div>
                    {/* Barra comparativa */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-emerald-600 uppercase w-14">Ingreso</span>
                            <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 rounded-full transition-all"
                                    style={{ width: `${analytics ? Math.min(100, (analytics.weekIngress / (Math.max(analytics.weekIngress, analytics.weekEgress, 1))) * 100) : 0}%` }}
                                />
                            </div>
                            <span className="text-[9px] font-black text-slate-400 w-20 text-right">{formatMoney(analytics?.weekIngress ?? 0)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-rose-500 uppercase w-14">Egreso</span>
                            <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-rose-500 rounded-full transition-all"
                                    style={{ width: `${analytics ? Math.min(100, (analytics.weekEgress / (Math.max(analytics.weekIngress, analytics.weekEgress, 1))) * 100) : 0}%` }}
                                />
                            </div>
                            <span className="text-[9px] font-black text-slate-400 w-20 text-right">{formatMoney(analytics?.weekEgress ?? 0)}</span>
                        </div>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Movimientos manuales — semana actual</p>
                </div>

                {/* 3. Ganancias globales */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ganancias globales</p>
                            <p className="text-2xl font-black italic text-emerald-600 mt-1">{formatMoney(netGlobal)}</p>
                        </div>
                        <div className="size-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                            <span className="material-symbols-outlined">trending_up</span>
                        </div>
                    </div>
                    <LineChart data={analytics?.monthlyTotals ?? []} />
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                        <span className="text-rose-400">Mín: {formatMoney(minMonth)}</span>
                        <span className="text-emerald-500">Máx: {formatMoney(maxMonth)}</span>
                    </div>
                </div>
            </div>

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
