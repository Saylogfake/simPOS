"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface WeightInputModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (weight: number) => void
    productName: string
    pricePerKg: number
}

export function WeightInputModal({ isOpen, onClose, onConfirm, productName, pricePerKg }: WeightInputModalProps) {
    const [weight, setWeight] = useState("")
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                setWeight("")
                inputRef.current?.focus()
            }, 100)
        }
    }, [isOpen])

    const handleConfirm = () => {
        const val = parseFloat(weight)
        if (!isNaN(val) && val > 0) {
            onConfirm(val / 1000) // Convert grams to kg
        }
    }

    const subtotal = (parseFloat(weight) || 0) * pricePerKg / 1000

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleConfirm()
    }

    const formatMoney = (amount: number) => {
        return "₲ " + new Intl.NumberFormat('es-PY', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-xl p-0 border-none bg-transparent overflow-hidden rounded-[40px]">
                <div className="bg-white dark:bg-slate-950 flex flex-col">
                    <div className="p-10 pb-6 flex justify-between items-start bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <div className="size-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined text-2xl font-black">scale</span>
                                </div>
                                <h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white">Pesar Producto</h2>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-1">{productName}</span>
                        </div>
                    </div>

                    <div className="px-10 py-10 space-y-10">
                        <div className="flex gap-8 items-end">
                            <div className="flex-1 space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-2">Peso en Gramos (g)</label>
                                <div className="relative group">
                                    <input
                                        ref={inputRef}
                                        type="number"
                                        className="w-full h-32 pl-8 pr-16 bg-slate-50 dark:bg-slate-900 border-4 border-slate-100 dark:border-slate-800 rounded-[32px] text-7xl font-black italic tracking-tighter text-slate-900 dark:text-white focus:border-primary focus:ring-0 transition-all text-right"
                                        placeholder="0"
                                        value={weight}
                                        onChange={(e) => setWeight(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                    />
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400 uppercase">g</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col gap-1 items-center justify-center">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Precio por KG</span>
                                <span className="text-2xl font-black italic tracking-tight text-slate-900 dark:text-white lowercase">{formatMoney(pricePerKg)}</span>
                            </div>
                            <div className="p-6 bg-primary rounded-3xl border-4 border-primary/50 shadow-xl shadow-primary/20 flex flex-col gap-1 items-center justify-center text-white">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Subtotal</span>
                                <span className="text-3xl font-black italic tracking-tight">{formatMoney(subtotal)}</span>
                            </div>
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
                            onClick={handleConfirm}
                            disabled={!weight || parseFloat(weight) <= 0}
                            className="flex-1 h-16 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black uppercase italic tracking-widest text-lg shadow-2xl shadow-primary/20 transform active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                            <span className="material-symbols-outlined text-2xl font-black">check_circle</span>
                            Confirmar Peso
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
