"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { toast } from "sonner"
import { API_URL } from "@/lib/api"

type DiscountModalProps = {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    product: { id: string, name: string, price: number, discountPercentage: number } | null
}

const formatMoney = (amount: number) => {
    return "₲ " + new Intl.NumberFormat('es-PY', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
}

export function DiscountModal({ isOpen, onClose, onSuccess, product }: DiscountModalProps) {
    const [loading, setLoading] = useState(false)
    const [percentage, setPercentage] = useState("")

    useEffect(() => {
        if (product && isOpen) {
            setPercentage(product.discountPercentage.toString())
        }
    }, [product, isOpen])

    const handleDiscount = async () => {
        if (!product) return

        const pct = parseFloat(percentage)
        if (isNaN(pct) || pct < 0 || pct > 100) {
            toast.error("Porcentaje inválido (0-100)")
            return
        }

        setLoading(true)
        try {
            const token = localStorage.getItem("token")
            const res = await fetch(`${API_URL}/api/products/${product.id}/discount`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ percentage: pct })
            })
            if (!res.ok) throw new Error("Failed")

            toast.success("Descuento aplicado exitosamente")
            onSuccess()
            onClose()
        } catch (e) {
            toast.error("Error al aplicar descuento")
        } finally {
            setLoading(false)
        }
    }

    const currentPrice = product?.price || 0
    const currentPct = parseFloat(percentage) || 0
    const finalPrice = currentPrice * (1 - currentPct / 100)

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-xl p-0 border-none bg-transparent overflow-hidden rounded-[40px]">
                <div className="bg-white dark:bg-slate-950 flex flex-col">
                    <div className="p-10 pb-6 flex justify-between items-start">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-3xl font-black">sell</span>
                                <h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white">Aplicar Descuento</h2>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-1">Producto: {product?.name}</span>
                        </div>
                    </div>

                    <div className="px-10 py-6 space-y-8">
                        <div className="flex gap-10 items-center justify-between">
                            <div className="flex-1 space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-2">Porcentaje %</label>
                                <div className="relative group">
                                    <input
                                        type="number"
                                        value={percentage}
                                        onChange={e => setPercentage(e.target.value)}
                                        className="w-full h-24 bg-slate-50 dark:bg-slate-900 border-4 border-slate-100 dark:border-slate-800 rounded-3xl text-5xl font-black italic tracking-tighter text-slate-900 dark:text-white px-6 focus:border-primary transition-all text-center"
                                        placeholder="0"
                                    />
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl font-black text-primary opacity-50">%</span>
                                </div>
                            </div>
                            
                            <div className="size-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <span className="material-symbols-outlined text-slate-400 font-bold">sync_alt</span>
                            </div>

                            <div className="flex-1 space-y-3 text-right">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-2">Precio Final Deseado</label>
                                <div className="relative group">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-emerald-500 opacity-50">₲</span>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={((parseFloat(percentage) >= 0 && product) ? (product.price * (1 - parseFloat(percentage) / 100)).toFixed(0) : "")}
                                        onChange={(e) => {
                                            if (!product) return;
                                            const val = parseFloat(e.target.value);
                                            if (!isNaN(val)) {
                                                const newPct = 100 - ((val / product.price) * 100);
                                                setPercentage(newPct.toFixed(2));
                                            } else {
                                                setPercentage("");
                                            }
                                        }}
                                        className="w-full h-24 bg-slate-50 dark:bg-slate-900 border-4 border-slate-100 dark:border-slate-800 rounded-3xl text-4xl font-black italic tracking-tighter text-slate-900 dark:text-white px-6 pl-12 focus:border-emerald-500 transition-all text-center"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden relative">
                                <div className="flex flex-col relative z-10">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Precio Original</span>
                                    <span className="text-2xl font-black italic tracking-tighter text-slate-400 line-through decoration-rose-500/50">{formatMoney(currentPrice)}</span>
                                </div>
                                <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-8xl text-slate-200/50 dark:text-slate-800/30">payments</span>
                            </div>

                            <div className="p-6 bg-emerald-500 rounded-3xl border-4 border-emerald-400 shadow-xl shadow-emerald-500/20 overflow-hidden relative">
                                <div className="flex flex-col relative z-10 text-white">
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Nuevo Precio</span>
                                    <span className="text-3xl font-black italic tracking-tighter">{formatMoney(finalPrice)}</span>
                                </div>
                                <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-8xl text-white/20">auto_awesome</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-10 pt-4 flex gap-4">
                        <Button
                            variant="ghost" 
                            onClick={() => {
                                setPercentage("0")
                                handleDiscount()
                            }}
                            className="h-16 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-rose-500"
                        >
                            Quitar Descuento
                        </Button>
                        <Button
                            onClick={handleDiscount}
                            disabled={loading}
                            className="flex-1 h-16 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black uppercase italic tracking-widest text-lg shadow-2xl shadow-primary/20 transform active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                            {loading && <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span>}
                            {!loading && <span className="material-symbols-outlined text-2xl font-black">check</span>}
                            Guardar Cambios
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
