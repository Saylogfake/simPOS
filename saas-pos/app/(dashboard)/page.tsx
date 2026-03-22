"use client"

import { useState, useEffect } from "react"
import { ArrowUpRight } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const formatMoney = (amount: number) => {
    return "₲ " + new Intl.NumberFormat('es-PY', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount || 0)
}

export default function DashboardOverview() {
    const [stats, setStats] = useState({
        dailySales: 4250000,
        transactions: 24,
        totalStock: 1240,
        activeSkus: 342,
        pendingAlerts: 5
    })

    const recentTransactions = [
        { id: "#TRX-1024", customer: "John Doe", amount: 120500, status: "Completed", date: "2023-10-24 14:20" },
        { id: "#TRX-1025", customer: "Jane Smith", amount: 45000, status: "Pending", date: "2023-10-24 14:35" },
        { id: "#TRX-1026", customer: "Robert Brown", amount: 210200, status: "Completed", date: "2023-10-24 15:10" },
        { id: "#TRX-1027", customer: "Lucy Gray", amount: 89990, status: "Refunded", date: "2023-10-24 15:45" },
    ]

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto w-full bg-background-light dark:bg-background-dark min-h-screen font-display text-slate-900 dark:text-slate-100">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all group">
                    <div className="flex items-center justify-between mb-6">
                        <span className="size-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-2xl">monetization_on</span>
                        </span>
                        <span className="text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">+12.5%</span>
                    </div>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest group-hover:text-primary transition-colors">Ventas del Día</p>
                    <h3 className="text-3xl font-black mt-2 text-slate-900 dark:text-white italic leading-tight">{formatMoney(stats.dailySales)}</h3>
                    <p className="text-slate-400 text-[10px] mt-4 font-bold uppercase tracking-tighter">Basado en {stats.transactions} transacciones hoy</p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all group">
                    <div className="flex items-center justify-between mb-6">
                        <span className="size-12 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-2xl">inventory_2</span>
                        </span>
                        <span className="text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">+3.2%</span>
                    </div>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest group-hover:text-indigo-500 transition-colors">Stock Total</p>
                    <h3 className="text-3xl font-black mt-2 text-slate-900 dark:text-white italic leading-tight">{stats.totalStock} Unidades</h3>
                    <p className="text-slate-400 text-[10px] mt-4 font-bold uppercase tracking-tighter">SKUs Activos: {stats.activeSkus}</p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all group">
                    <div className="flex items-center justify-between mb-6">
                        <span className="size-12 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-2xl">warning</span>
                        </span>
                        <span className="text-rose-500 bg-rose-500/10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">ALERTA</span>
                    </div>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest group-hover:text-rose-500 transition-colors">Alertas Activas</p>
                    <h3 className="text-3xl font-black mt-2 text-slate-900 dark:text-white italic leading-tight">{stats.pendingAlerts} Pendientes</h3>
                    <p className="text-slate-400 text-[10px] mt-4 font-bold uppercase tracking-tighter">Faltantes y vencimientos</p>
                </div>
            </div>

            {/* Main Grid: Transactions & Alerts */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Recent Transactions */}
                <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <h3 className="text-xl font-black uppercase italic tracking-tighter">Transacciones Recientes</h3>
                        <button className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">Ver Todo</button>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID TRX</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Monto</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {recentTransactions.map(trx => (
                                    <tr key={trx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group">
                                        <td className="px-8 py-6 text-sm font-bold text-slate-400 uppercase tracking-tighter italic">{trx.id}</td>
                                        <td className="px-8 py-6">
                                            <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">{trx.customer}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">{trx.date}</p>
                                        </td>
                                        <td className="px-8 py-6 text-sm font-black text-slate-900 dark:text-white text-right italic">{formatMoney(trx.amount)}</td>
                                        <td className="px-8 py-6 text-center">
                                            <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                trx.status === 'Completed' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 
                                                trx.status === 'Pending' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' : 
                                                'bg-rose-100 text-rose-600 dark:bg-rose-900/30'
                                            }`}>
                                                {trx.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button className="text-slate-300 hover:text-primary transition-colors">
                                                <span className="material-symbols-outlined text-xl">more_horiz</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Sidebar Cards in Dashboard */}
                <div className="space-y-8">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alertas Críticas</h4>
                            <span className="material-symbols-outlined text-rose-500 scale-75">notification_important</span>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-rose-50/50 dark:bg-rose-900/10 rounded-2xl border border-rose-100 dark:border-rose-900/30 group cursor-pointer hover:scale-[1.02] transition-all">
                                <div className="flex items-center gap-4">
                                    <span className="material-symbols-outlined text-rose-500 text-xl group-hover:scale-110 transition-transform">priority_high</span>
                                    <div>
                                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">Coca-Cola 500ml</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Solo 4 unidades</p>
                                    </div>
                                </div>
                                <ArrowUpRight className="size-4 text-rose-300" />
                            </div>
                            <div className="flex items-center justify-between p-4 bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30 group cursor-pointer hover:scale-[1.02] transition-all">
                                <div className="flex items-center gap-4">
                                    <span className="material-symbols-outlined text-amber-500 text-xl group-hover:scale-110 transition-transform">warning</span>
                                    <div>
                                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">Papitas Lays</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Vencimiento Próximo</p>
                                    </div>
                                </div>
                                <ArrowUpRight className="size-4 text-amber-300" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-primary p-8 rounded-[2.5rem] shadow-2xl shadow-primary/40 relative overflow-hidden group">
                        <div className="absolute -right-8 -bottom-8 size-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-black text-white/60 uppercase tracking-widest">Arqueo de Caja</h4>
                                <span className="material-symbols-outlined text-white/50">account_balance_wallet</span>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-xs font-bold text-white/80 uppercase tracking-tighter">
                                    <span>Saldo Inicial</span>
                                    <span>{formatMoney(500000)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs font-bold text-white/80 uppercase tracking-tighter">
                                    <span>Ventas Efectivo</span>
                                    <span>+{formatMoney(2140000)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs font-bold text-white/80 uppercase tracking-tighter">
                                    <span>Ventas Tarjeta</span>
                                    <span>+{formatMoney(1610000)}</span>
                                </div>
                                <div className="h-px bg-white/20 my-4"></div>
                                <div className="flex justify-between items-center bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest italic">Efectivo en Caja</span>
                                    <span className="text-xl font-black text-white italic">{formatMoney(stats.dailySales)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
