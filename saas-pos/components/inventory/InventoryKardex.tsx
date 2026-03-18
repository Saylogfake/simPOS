"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { API_URL } from "@/lib/api"

type Movement = {
    id: string
    type: string
    quantity: number
    stockBefore: number
    stockAfter: number
    reason: string
    referenceId: string | null
    createdAt: string
    productName: string
    user: string
}

export function InventoryKardex() {
    const [movements, setMovements] = useState<Movement[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)
    const [typeFilter, setTypeFilter] = useState("all")

    const fetchMovements = async () => {
        setLoading(true)
        try {
            let url = `${API_URL}/api/inventory/movements?page=${page}&limit=20`
            if (typeFilter !== "all") url += `&type=${typeFilter}`

            const token = localStorage.getItem("token")
            const res = await fetch(url, {
                headers: { "Authorization": `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setMovements(data.data)
                setHasMore(data.data.length === 20)
            }
        } catch (error) {
            toast.error("Error al cargar movimientos")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchMovements()
    }, [page, typeFilter])

    const getTypeStyles = (type: string) => {
        switch (type) {
            case "SALE": return { color: "bg-emerald-500 text-white shadow-emerald-500/20", icon: "shopping_cart", label: "VENTA" }
            case "PURCHASE": return { color: "bg-primary text-white shadow-primary/20", icon: "add_shopping_cart", label: "COMPRA" }
            case "RESTOCK": return { color: "bg-primary text-white shadow-primary/20", icon: "inventory_2", label: "REPOSICIÓN" }
            case "ADJUSTMENT": return { color: "bg-amber-500 text-white shadow-amber-500/20", icon: "tune", label: "AJUSTE" }
            case "WASTE": return { color: "bg-rose-500 text-white shadow-rose-500/20", icon: "delete_sweep", label: "MERMA" }
            case "RETURN": return { color: "bg-indigo-500 text-white shadow-indigo-500/20", icon: "assignment_return", label: "DEVOLUCIÓN" }
            default: return { color: "bg-slate-500 text-white shadow-slate-500/20", icon: "history", label: "SISTEMA" }
        }
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Filter Header */}
            <div className="bg-white dark:bg-slate-950 p-10 rounded-[40px] border-4 border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/20 flex flex-col md:flex-row gap-8 items-center justify-between relative overflow-hidden group">
                <div className="flex flex-col gap-2 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30">
                            <span className="material-symbols-outlined text-2xl font-black">history</span>
                        </div>
                        <h3 className="text-2xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white leading-none">Movimientos de Stock</h3>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-1 italic">Kardex Centralizado de Inventario</p>
                </div>

                <div className="flex gap-4 relative z-10">
                    <div className="relative group">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors text-xl font-black">filter_list</span>
                        <select 
                            value={typeFilter} 
                            onChange={(e) => { setPage(1); setTypeFilter(e.target.value) }}
                            className="bg-slate-50 dark:bg-slate-900 border-4 border-slate-100 dark:border-slate-800 h-16 pl-16 pr-8 rounded-2xl font-black uppercase italic tracking-widest text-[10px] appearance-none cursor-pointer focus:border-primary transition-all text-slate-600 dark:text-slate-300 outline-none"
                        >
                            <option value="all">TODOS LOS MOVIMIENTOS</option>
                            <option value="SALE">VENTAS 🛒</option>
                            <option value="RESTOCK">REPOSICIONES 📦</option>
                            <option value="ADJUSTMENT">AJUSTES ⚙️</option>
                            <option value="WASTE">MERMAS 🗑️</option>
                            <option value="RETURN">DEVOLUCIONES 🔄</option>
                        </select>
                    </div>
                    <Button 
                        variant="ghost" 
                        onClick={() => fetchMovements()}
                        className="size-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-primary hover:text-white transition-all shadow-lg active:scale-95"
                    >
                        <span className={`material-symbols-outlined font-black text-2xl ${loading ? 'animate-spin' : ''}`}>sync</span>
                    </Button>
                </div>
                <span className="material-symbols-outlined absolute -bottom-8 -left-8 text-[180px] text-slate-100 dark:text-slate-900 opacity-30 pointer-events-none group-hover:-rotate-12 transition-transform duration-1000">assignment</span>
            </div>

            {/* Main Table Content */}
            <div className="bg-white dark:bg-slate-950 rounded-[40px] border-4 border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/20 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b-2 border-slate-100 dark:border-slate-800">
                                <th className="p-8 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Fecha / Hora</th>
                                <th className="p-8 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Producto / Usuario</th>
                                <th className="p-8 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Operación</th>
                                <th className="p-8 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Evolución Stock</th>
                                <th className="p-8 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 text-right">Variación</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-slate-50 dark:divide-slate-900">
                            {movements.map((m) => {
                                const styles = getTypeStyles(m.type)
                                return (
                                    <tr key={m.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all">
                                        <td className="p-8">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black italic tracking-tighter text-slate-900 dark:text-white">
                                                    {format(new Date(m.createdAt), "dd MMM, HH:mm", { locale: es }).toUpperCase()}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 opacity-60">#{m.id.substring(0, 8)}</span>
                                            </div>
                                        </td>
                                        <td className="p-8">
                                            <div className="flex flex-col">
                                                <span className="text-lg font-black italic tracking-tighter text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors leading-none uppercase">{m.productName || "ANÓNIMO"}</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full inline-block self-start border border-slate-200 dark:border-slate-700">👤 {m.user || "SYSTEM"}</span>
                                            </div>
                                        </td>
                                        <td className="p-8">
                                            <div className="flex flex-col gap-2">
                                                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl font-black italic tracking-widest text-[10px] shadow-lg ${styles.color}`}>
                                                    <span className="material-symbols-outlined text-sm">{styles.icon}</span>
                                                    {styles.label}
                                                </div>
                                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest max-w-[150px] truncate" title={m.reason}>{m.reason || "SIN DETALLE"}</span>
                                            </div>
                                        </td>
                                        <td className="p-8">
                                            <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-800 rounded-2xl p-4 shadow-inner">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[8px] font-black uppercase text-slate-400">ANTERIOR</span>
                                                    <span className="text-lg font-black italic tracking-tighter text-slate-500">{Number(m.stockBefore).toFixed(1)}</span>
                                                </div>
                                                <div className="material-symbols-outlined text-slate-300 font-black">arrow_right_alt</div>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[8px] font-black uppercase text-primary">POSTERIOR</span>
                                                    <span className="text-xl font-black italic tracking-tighter text-primary">{Number(m.stockAfter).toFixed(1)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-8 text-right">
                                            <span className={`text-4xl font-black italic tracking-tighter ${m.quantity > 0 ? "text-emerald-500 shadow-emerald-500/20" : "text-rose-500 shadow-rose-500/20"}`}>
                                                {m.quantity > 0 ? "+" : ""}{Number(m.quantity).toFixed(1)}
                                            </span>
                                            <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">AJUSTE NETO</div>
                                        </td>
                                    </tr>
                                )
                            })}
                            {movements.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="p-32 text-center opacity-30">
                                        <div className="flex flex-col items-center gap-4">
                                            <span className="material-symbols-outlined text-9xl">inventory_2</span>
                                            <p className="font-black italic uppercase tracking-[0.4em] text-xs">Sin registros históricos de inventario</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="p-10 flex flex-col md:flex-row justify-between items-center gap-8 bg-slate-50/50 dark:bg-slate-900/50 border-t-2 border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-4 py-2 border-2 border-slate-200 dark:border-slate-800 rounded-full italic">
                        PÁGINA {page} • MOSTRANDO {movements.length} REGISTROS
                    </div>
                    
                    <div className="flex gap-4">
                        <Button
                            variant="ghost"
                            disabled={page === 1 || loading}
                            onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                            className="h-16 px-10 bg-white dark:bg-slate-800 text-slate-500 hover:text-primary rounded-2xl font-black uppercase italic tracking-widest text-[10px] shadow-lg shadow-slate-200/20 active:scale-95 transition-all flex items-center gap-3 border border-slate-100 dark:border-slate-700"
                        >
                            <span className="material-symbols-outlined text-sm font-black">arrow_back</span>
                            ANTERIOR
                        </Button>
                        <Button
                            variant="ghost"
                            disabled={!hasMore || loading}
                            onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                            className="h-16 px-10 bg-white dark:bg-slate-800 text-slate-500 hover:text-primary rounded-2xl font-black uppercase italic tracking-widest text-[10px] shadow-lg shadow-slate-200/20 active:scale-95 transition-all flex items-center gap-3 border border-slate-100 dark:border-slate-700"
                        >
                            SIGUIENTE
                            <span className="material-symbols-outlined text-sm font-black">arrow_forward</span>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
