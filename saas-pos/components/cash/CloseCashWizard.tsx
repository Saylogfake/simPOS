"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { API_URL } from "@/lib/api"

interface CloseCashWizardProps {
    isOpen: boolean
    onClose: () => void
    registerId: string
    summary?: any
    onSuccess: () => void
}

export function CloseCashWizard({ isOpen, onClose, registerId, summary: initialSummary, onSuccess }: CloseCashWizardProps) {
    const [step, setStep] = useState(1)
    const [countedCash, setCountedCash] = useState("")
    const [diffReason, setDiffReason] = useState("")
    const [loading, setLoading] = useState(false)
    const [summary, setSummary] = useState<any>(initialSummary)

    useEffect(() => {
        if (isOpen && registerId && !summary) {
            const fetchSummary = async () => {
                try {
                    const token = localStorage.getItem("token")
                    const res = await fetch(`${API_URL}/api/cash/summary/${registerId}`, {
                        headers: { "Authorization": `Bearer ${token}` }
                    })
                    if (res.ok) {
                        const data = await res.json()
                        setSummary(data)
                    } else {
                        toast.error("No se pudo obtener el resumen de caja")
                    }
                } catch (e) {
                    toast.error("Error de conexión al obtener resumen")
                }
            }
            fetchSummary()
        }
    }, [isOpen, registerId, summary])

    const expectedCash = summary?.expectedTotal?.cash || 0
    const difference = (parseFloat(countedCash) || 0) - expectedCash
    const hasDiff = Math.abs(difference) > 100

    const handleSubmit = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem("token")
            const res = await fetch(`${API_URL}/api/cash/close`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    cashRegisterId: registerId,
                    countedCash: parseFloat(countedCash),
                    differenceReason: hasDiff ? diffReason : null
                })
            })

            if (!res.ok) throw new Error("Error al cerrar caja")

            toast.success("Caja cerrada correctamente")
            onSuccess()
            onClose()
        } catch (e) {
            toast.error("Error al cerrar")
        } finally {
            setLoading(false)
        }
    }

    const formatMoney = (amount: number) =>
        "₲ " + new Intl.NumberFormat('es-PY', { minimumFractionDigits: 0 }).format(amount)

    if (isOpen && !summary) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-md p-10 flex flex-col items-center justify-center gap-4 bg-white dark:bg-slate-950 rounded-[40px] border-none">
                    <span className="material-symbols-outlined text-6xl text-primary animate-spin">progress_activity</span>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Cargando Resumen...</span>
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl p-0 border-none bg-transparent overflow-hidden rounded-[40px]">
                <div className="bg-white dark:bg-slate-950 flex flex-col">
                    <div className="p-10 pb-6 flex justify-between items-start bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <div className="size-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-500">
                                    <span className="material-symbols-outlined text-2xl font-black">lock</span>
                                </div>
                                <h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white">Cierre de Caja</h2>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-1">Paso {step} de 2 • {new Date().toLocaleDateString()}</span>
                        </div>
                    </div>

                    <div className="px-10 py-10 min-h-[400px]">
                        {step === 1 && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col gap-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ventas con Tarjeta</span>
                                        <span className="text-3xl font-black italic tracking-tighter text-slate-900 dark:text-white">{formatMoney(summary?.sales?.card || 0)}</span>
                                    </div>
                                    <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col gap-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Transferencias / QR</span>
                                        <span className="text-3xl font-black italic tracking-tighter text-slate-900 dark:text-white">{formatMoney(summary?.sales?.transfer || 0)}</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-2">Efectivo Físico en Caja (Arqueo)</label>
                                    <div className="relative group">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-4xl font-black text-orange-500 opacity-50">₲</span>
                                        <input
                                            type="number"
                                            className="w-full h-32 pl-16 pr-8 bg-slate-50 dark:bg-slate-900 border-4 border-slate-100 dark:border-slate-800 rounded-[32px] text-7xl font-black italic tracking-tighter text-slate-900 dark:text-white focus:border-orange-500 focus:ring-0 transition-all text-right"
                                            placeholder="0"
                                            value={countedCash}
                                            onChange={(e) => setCountedCash(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-3xl border-2 border-blue-100 dark:border-blue-900/30 flex justify-between items-center group overflow-hidden relative">
                                    <div className="flex flex-col relative z-10">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Esperado en Efectivo</span>
                                        <span className="text-2xl font-black italic tracking-tighter text-blue-600">{formatMoney(expectedCash)}</span>
                                    </div>
                                    <span className="material-symbols-outlined text-6xl text-blue-500 opacity-10 absolute -right-2 transform rotate-12 group-hover:scale-125 transition-transform">database</span>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className={`p-8 rounded-[40px] border-4 flex items-center gap-8 ${Math.abs(difference) < 100 ? 'bg-emerald-500 border-emerald-400 text-white shadow-xl shadow-emerald-500/20' : 'bg-rose-500 border-rose-400 text-white shadow-xl shadow-rose-500/20'}`}>
                                    <div className="size-20 rounded-3xl bg-white/20 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-5xl font-black">
                                            {Math.abs(difference) < 100 ? 'verified' : 'warning'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <h3 className="text-3xl font-black italic tracking-tighter uppercase leading-none">
                                            {Math.abs(difference) < 100 ? 'Caja Cuadrada' : 'Diferencia Detectada'}
                                        </h3>
                                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mt-2">
                                            {Math.abs(difference) < 100 ? 'El monto físico coincide perfectamente con el sistema.' : `Existe un desfase de ${formatMoney(difference)} en el arqueo.`}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-6">
                                    <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col items-center">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Esperado</span>
                                        <span className="text-xl font-black italic tracking-tighter text-slate-500">{formatMoney(expectedCash)}</span>
                                    </div>
                                    <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col items-center">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contado</span>
                                        <span className="text-xl font-black italic tracking-tighter text-slate-900 dark:text-white uppercase">{formatMoney(parseFloat(countedCash))}</span>
                                    </div>
                                    <div className={`p-6 rounded-3xl border flex flex-col items-center ${difference < 0 ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Diferencia</span>
                                        <span className="text-xl font-black italic tracking-tighter uppercase">{formatMoney(difference)}</span>
                                    </div>
                                </div>

                                {hasDiff && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-2 italic">Explique el motivo de la diferencia</label>
                                        <textarea
                                            value={diffReason}
                                            onChange={e => setDiffReason(e.target.value)}
                                            placeholder="EJ: ERROR EN VUELTO RECONOCIDO, TICKET DE GASTO NO REGISTRADO..."
                                            className="w-full h-32 bg-rose-50/50 dark:bg-rose-900/10 border-4 border-rose-100 dark:border-rose-900/30 rounded-3xl text-sm font-bold uppercase tracking-widest text-slate-900 dark:text-white px-8 py-6 focus:border-rose-400 transition-all resize-none outline-none"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="p-10 pt-4 flex gap-4">
                        <Button
                            variant="ghost" 
                            onClick={step === 1 ? onClose : () => setStep(1)}
                            className="h-16 px-10 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                        >
                            <span className="material-symbols-outlined mr-2">{step === 1 ? 'close' : 'arrow_back'}</span>
                            {step === 1 ? 'Cancelar' : 'Volver'}
                        </Button>
                        <Button
                            onClick={step === 1 ? () => setStep(2) : handleSubmit}
                            disabled={loading || (step === 1 && !countedCash) || (step === 2 && hasDiff && !diffReason)}
                            className={`flex-1 h-16 ${step === 2 && hasDiff ? 'bg-orange-500 hover:bg-orange-600' : 'bg-primary hover:bg-primary/90'} text-white rounded-2xl font-black uppercase italic tracking-widest text-lg shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95`}
                        >
                            {loading ? <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span> : <span className="material-symbols-outlined text-2xl font-black">{step === 1 ? 'analytics' : 'assignment_turned_in'}</span>}
                            {step === 1 ? 'Analizar Arqueo' : 'Finalizar Cierre'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
