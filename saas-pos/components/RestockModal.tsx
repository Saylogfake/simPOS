"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { toast } from "sonner"
import { API_URL } from "@/lib/api"

type RestockModalProps = {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    product: { id: string, name: string, internalCode: string, saleType: string } | null
}

export function RestockModal({ isOpen, onClose, onSuccess, product }: RestockModalProps) {
    const [loading, setLoading] = useState(false)
    const [quantity, setQuantity] = useState("")

    const handleRestock = async () => {
        if (!product || !quantity) return

        const qty = parseFloat(quantity)
        if (isNaN(qty) || qty <= 0) {
            toast.error("Cantidad inválida. Debe ser mayor a 0.")
            return
        }

        setLoading(true)
        try {
            const token = localStorage.getItem("token")
            const res = await fetch(`${API_URL}/api/products/${product.id}/stock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ quantity: qty })
            })
            if (!res.ok) throw new Error("Failed")

            toast.success("Stock agregado exitosamente")
            setQuantity("")
            onSuccess()
            onClose()
        } catch (e) {
            toast.error("Error al actualizar stock")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg p-0 border-none bg-transparent overflow-hidden rounded-[40px]">
                <div className="bg-white dark:bg-slate-950 flex flex-col">
                    <div className="p-10 pb-6 flex justify-between items-start">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-emerald-500 text-3xl font-black">inventory_2</span>
                                <h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white">Reponer Stock</h2>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-1">Producto: {product?.name} ({product?.internalCode})</span>
                        </div>
                    </div>

                    <div className="px-10 py-6 space-y-8">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-2">Cantidad a Agregar ({product?.saleType === "WEIGHT" ? "Kg" : "Unidades"})</label>
                            <div className="relative group">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-4xl font-black text-emerald-500 transition-transform duration-300">
                                    {product?.saleType === "WEIGHT" ? "KG" : "+"}
                                </span>
                                <input
                                    type="number"
                                    className="w-full h-32 pl-24 pr-8 bg-slate-50 dark:bg-slate-900 border-4 border-slate-100 dark:border-slate-800 rounded-[32px] text-7xl font-black italic tracking-tighter text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-0 transition-all text-right"
                                    placeholder="0"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleRestock()
                                    }}
                                />
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center gap-4">
                            <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                <span className="material-symbols-outlined font-black">info</span>
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                Se registrará un ajuste de entrada en el historial de inventario.
                            </p>
                        </div>
                    </div>

                    <div className="p-10 pt-4 flex gap-4">
                        <Button
                            variant="ghost" 
                            onClick={onClose}
                            className="h-16 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 dark:hover:text-white"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleRestock}
                            disabled={loading || !quantity}
                            className="flex-1 h-16 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase italic tracking-widest text-lg shadow-2xl shadow-emerald-500/30 transform active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                            {loading && <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span>}
                            {!loading && <span className="material-symbols-outlined text-2xl font-black">add_circle</span>}
                            Confirmar Carga
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
