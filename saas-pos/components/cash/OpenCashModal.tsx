"use client"

import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

import { API_URL } from "@/lib/api"

interface OpenCashModalProps {
    isOpen: boolean
    onClose: () => void
    onOpenSuccess: (registerId: string) => void
}

export function OpenCashModal({ isOpen, onClose, onOpenSuccess }: OpenCashModalProps) {
    const [amount, setAmount] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const openingAmount = parseFloat(amount)
        if (isNaN(openingAmount) || openingAmount < 0) {
            toast.error("Ingrese un monto válido")
            return
        }

        setLoading(true)
        try {
            const token = localStorage.getItem("token")
            const res = await fetch(`${API_URL}/api/cash/open`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ openingAmount })
            })

            if (res.status === 409) {
                toast.info("La caja ya estaba abierta. Restaurando sesión...")
                // Fetch the real register ID from status endpoint
                const statusRes = await fetch(`${API_URL}/api/cash/status`, {
                        headers: { "Authorization": `Bearer ${token}` }
                    })
                    if (statusRes.ok) {
                        const statusData = await statusRes.json()
                        onOpenSuccess(statusData.register?.id ?? "")
                    }
                return
            }

            if (res.status === 401) {
                toast.error("Sesión expirada. Por favor inicie sesión nuevamente.")
                return
            }

            const responseText = await res.text()
            let data: any
            try {
                data = JSON.parse(responseText)
            } catch {
                throw new Error(responseText || "Error del servidor")
            }

            if (!res.ok) {
                if (data.message && (data.message.includes("already has an open") || data.message.includes("User already has an open"))) {
                    toast.info("La caja ya estaba abierta. Actualizando...")
                    const statusRes = await fetch(`${API_URL}/api/cash/status`, {
                        headers: { "Authorization": `Bearer ${token}` }
                    })
                    if (statusRes.ok) {
                        const statusData = await statusRes.json()
                        onOpenSuccess(statusData.register?.id ?? "")
                    }
                    return
                }
                throw new Error(data.message || "Error al abrir caja")
            }

            toast.success("Caja abierta correctamente")
            onOpenSuccess(data.id)
            setAmount("")
        } catch (error: any) {
            console.error(error)
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-xl p-0 border-none bg-transparent overflow-hidden rounded-[40px]">
                <div className="bg-white dark:bg-slate-950 flex flex-col">
                    <div className="p-10 pb-6 flex justify-between items-start bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <div className="size-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined text-2xl font-black">lock_open</span>
                                </div>
                                <h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white">Apertura de Caja</h2>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-1">Nueva Sesión de Trabajo</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="px-10 py-10 space-y-10">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-2">Monto Inicial en Efectivo (GS)</label>
                            <div className="relative group">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-4xl font-black text-primary opacity-50">₲</span>
                                <input
                                    type="number"
                                    className="w-full h-32 pl-16 pr-8 bg-slate-50 dark:bg-slate-900 border-4 border-slate-100 dark:border-slate-800 rounded-[32px] text-7xl font-black italic tracking-tighter text-slate-900 dark:text-white focus:border-primary focus:ring-0 transition-all text-right"
                                    placeholder="0"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    autoFocus
                                    required
                                />
                            </div>
                        </div>

                        <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 flex items-center gap-6">
                            <span className="material-symbols-outlined text-4xl text-primary animate-pulse">info</span>
                            <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed text-slate-500">
                                Ingrese el monto de efectivo exacto con el que inicia la caja hoy para asegurar un arqueo correcto al final del día.
                            </p>
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
                                className="flex-1 h-16 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black uppercase italic tracking-widest text-lg shadow-2xl shadow-primary/20 transform active:scale-95 transition-all flex items-center justify-center gap-3"
                            >
                                {loading ? <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span> : <span className="material-symbols-outlined text-2xl font-black">vpn_key</span>}
                                Iniciar Jornada
                            </Button>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    )
}
