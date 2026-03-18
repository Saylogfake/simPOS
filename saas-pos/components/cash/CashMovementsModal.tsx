"use client"

import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { API_URL } from "@/lib/api"

interface CashMovementsModalProps {
    isOpen: boolean
    onClose: () => void
    type: "INGRESO" | "EGRESO"
    registerId: string
    onSuccess: () => void
}

export function CashMovementsModal({ isOpen, onClose, type, registerId, onSuccess }: CashMovementsModalProps) {
    const [amount, setAmount] = useState("")
    const [reason, setReason] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const token = localStorage.getItem("token")
            const res = await fetch(`${API_URL}/api/cash/movement`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    cashRegisterId: registerId,
                    type,
                    amount: parseFloat(amount),
                    paymentMethod: "CASH",
                    reason
                })
            })

            if (!res.ok) throw new Error("Error registrando movimiento")

            toast.success("Movimiento registrado")
            onSuccess()
            onClose()
            setAmount("")
            setReason("")
        } catch (e) {
            toast.error("Error al registrar")
        } finally {
            setLoading(false)
        }
    }

    const isIngreso = type === "INGRESO"

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-xl p-0 border-none bg-transparent overflow-hidden rounded-[40px]">
                <div className="bg-white dark:bg-slate-950 flex flex-col">
                    <div className="p-10 pb-6 flex justify-between items-start bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <div className={`size-10 rounded-xl flex items-center justify-center ${isIngreso ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                                    <span className="material-symbols-outlined text-2xl font-black">{isIngreso ? 'trending_up' : 'trending_down'}</span>
                                </div>
                                <h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white">
                                    {isIngreso ? 'Registrar Ingreso' : 'Registrar Egreso'}
                                </h2>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-1">Movimiento Manual de Efectivo</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="px-10 py-10 space-y-10">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-2">Monto del Movimiento (GS)</label>
                            <div className="relative group">
                                <span className={`absolute left-6 top-1/2 -translate-y-1/2 text-4xl font-black opacity-50 ${isIngreso ? 'text-emerald-500' : 'text-rose-500'}`}>₲</span>
                                <input
                                    type="number"
                                    className={`w-full h-24 pl-16 pr-8 bg-slate-50 dark:bg-slate-900 border-4 border-slate-100 dark:border-slate-800 rounded-[32px] text-5xl font-black italic tracking-tighter text-slate-900 dark:text-white focus:ring-0 transition-all text-right ${isIngreso ? 'focus:border-emerald-500' : 'focus:border-rose-500'}`}
                                    placeholder="0"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    autoFocus
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-2">Motivo o Descripción</label>
                            <textarea
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                required
                                placeholder={isIngreso ? "Ej: FONDO DE CAMBIO EXTRA, APORTE DE CAPITAL..." : "Ej: PAGO A PROVEEDOR, RETIRO PARA GASTOS MENORES..."}
                                className={`w-full h-32 bg-slate-50 dark:bg-slate-900 border-4 border-slate-100 dark:border-slate-800 rounded-3xl text-sm font-bold uppercase tracking-widest text-slate-900 dark:text-white px-8 py-6 transition-all resize-none outline-none ${isIngreso ? 'focus:border-emerald-500' : 'focus:border-rose-500'}`}
                            />
                        </div>

                        <div className="flex gap-4 pt-4">
                            <Button
                                type="button"
                                variant="ghost" 
                                onClick={onClose}
                                className="h-16 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading || !amount}
                                className={`flex-1 h-16 ${isIngreso ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'} text-white rounded-2xl font-black uppercase italic tracking-widest text-lg shadow-2xl transform active:scale-95 transition-all flex items-center justify-center gap-3`}
                            >
                                {loading ? <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span> : <span className="material-symbols-outlined text-2xl font-black">{isIngreso ? 'add_circle' : 'remove_circle'}</span>}
                                {isIngreso ? 'Confirmar Ingreso' : 'Confirmar Egreso'}
                            </Button>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    )
}
