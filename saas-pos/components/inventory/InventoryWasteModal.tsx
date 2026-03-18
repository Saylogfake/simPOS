"use client"

import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { API_URL } from "@/lib/api"

type Product = {
    id: string
    name: string
    stock: number
    saleType: string
}

interface InventoryWasteModalProps {
    isOpen: boolean
    product: Product
    onClose: () => void
    onSuccess: () => void
}

export function InventoryWasteModal({ isOpen, product, onClose, onSuccess }: InventoryWasteModalProps) {
    const [loading, setLoading] = useState(false)
    const [quantity, setQuantity] = useState("")
    const [reasonType, setReasonType] = useState("EXPIRED")
    const [comment, setComment] = useState("")

    const handleSubmit = async () => {
        const qty = parseFloat(quantity)
        if (isNaN(qty) || qty <= 0) {
            toast.error("Ingrese una cantidad válida")
            return
        }

        if (!comment && reasonType === "OTHER") {
            toast.error("Debe especificar el motivo detallado")
            return
        }

        const finalReason = reasonType === "OTHER" ? `Otro: ${comment}` :
            reasonType === "EXPIRED" ? `Vencimiento` :
                reasonType === "BROKEN" ? `Rotura / Daño` : `Pérdida / Robo`

        setLoading(true)
        try {
            const token = localStorage.getItem("token")
            const res = await fetch(`${API_URL}/api/inventory/adjustment`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({
                    productId: product.id,
                    quantity: -qty, // Negative for waste
                    type: "WASTE",
                    reason: `${finalReason} ${comment ? `(${comment})` : ""}`.trim()
                })
            })

            if (!res.ok) {
                const text = await res.text()
                throw new Error(text)
            }

            toast.success("Merma registrada correctamente")
            onSuccess()
            onClose()
        } catch (error: any) {
            toast.error(`Error al registrar: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-xl p-0 border-none bg-transparent overflow-hidden rounded-[40px]">
                <div className="bg-white dark:bg-slate-950 flex flex-col">
                    <div className="p-10 pb-6 flex justify-between items-start bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <div className="size-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-500">
                                    <span className="material-symbols-outlined text-2xl font-black">delete_sweep</span>
                                </div>
                                <h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white">Registrar Merma</h2>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-1">Ajuste de Salida por Pérdida</span>
                        </div>
                    </div>

                    <div className="px-10 py-10 space-y-10">
                        {/* Product Card Header */}
                        <div className="bg-slate-50 dark:bg-slate-900 p-8 rounded-[32px] border-4 border-slate-100 dark:border-slate-800 relative overflow-hidden group">
                            <div className="relative z-10">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">Producto a Ajustar</span>
                                <h3 className="text-3xl font-black italic tracking-tighter text-slate-900 dark:text-white leading-none mt-1">{product.name}</h3>
                                <div className="mt-4 flex gap-4">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white dark:bg-slate-800 px-4 py-1.5 rounded-full ring-1 ring-slate-100 dark:ring-slate-700">Stock Actual: {product.stock}</span>
                                </div>
                            </div>
                            <span className="material-symbols-outlined absolute -bottom-6 -right-6 text-9xl text-slate-200/50 dark:text-slate-800/30 group-hover:scale-110 transition-transform">inventory</span>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-2">Cantidad Perdida ({product.saleType === "WEIGHT" ? "Kg" : "Unidades"})</label>
                                <div className="relative group">
                                    <input
                                        type="number"
                                        step={product.saleType === "WEIGHT" ? "0.001" : "1"}
                                        className="w-full h-24 bg-slate-50 dark:bg-slate-900 border-4 border-slate-100 dark:border-slate-800 rounded-3xl text-5xl font-black italic tracking-tighter text-slate-900 dark:text-white px-8 focus:border-orange-500 focus:ring-0 transition-all text-center"
                                        placeholder="0"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-2">Motivo Principal</label>
                                <select 
                                    value={reasonType} 
                                    onChange={e => setReasonType(e.target.value)}
                                    className="w-full h-24 bg-slate-50 dark:bg-slate-900 border-4 border-slate-100 dark:border-slate-800 rounded-3xl text-lg font-black italic tracking-tighter uppercase text-slate-900 dark:text-white px-8 focus:border-orange-500 transition-all outline-none appearance-none cursor-pointer"
                                >
                                    <option value="EXPIRED">Vencimiento 📅</option>
                                    <option value="BROKEN">Rotura / Daño 💥</option>
                                    <option value="LOST">Pérdida / Robo 🕵️</option>
                                    <option value="OTHER">Otro Motivo 📝</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-2">Observaciones / Detalles</label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="PROPORCIONE DETALLES ADICIONALES SOBRE LA PÉRDIDA..."
                                className="w-full h-32 bg-slate-50 dark:bg-slate-900 border-4 border-slate-100 dark:border-slate-800 rounded-3xl text-sm font-bold uppercase tracking-widest text-slate-900 dark:text-white px-8 py-6 focus:border-orange-500 transition-all resize-none outline-none"
                            />
                        </div>

                        <div className="flex gap-4 pt-4">
                            <Button
                                variant="ghost" 
                                onClick={onClose}
                                className="h-16 px-10 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={loading || !quantity}
                                className="flex-1 h-16 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase italic tracking-widest text-lg shadow-2xl shadow-orange-500/30 transform active:scale-95 transition-all flex items-center justify-center gap-3"
                            >
                                {loading && <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span>}
                                {!loading && <span className="material-symbols-outlined text-2xl font-black">check_circle</span>}
                                Confirmar Salida
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
