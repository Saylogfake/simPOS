"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"

type DeleteConfirmationModalProps = {
    isOpen: boolean
    productName: string
    onClose: () => void
    onConfirm: () => Promise<void>
}

export function DeleteConfirmationModal({ isOpen, productName, onClose, onConfirm }: DeleteConfirmationModalProps) {
    const [loading, setLoading] = useState(false)

    const handleConfirm = async () => {
        setLoading(true)
        try {
            await onConfirm()
        } catch (e) {
            console.error(e)
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md p-0 border-none bg-transparent overflow-hidden rounded-[32px]">
                <div className="bg-white dark:bg-slate-900 overflow-hidden">
                    <div className="p-10 flex flex-col items-center text-center gap-6">
                        <div className="size-24 rounded-3xl bg-rose-500/10 flex items-center justify-center text-rose-500 animate-pulse">
                            <span className="material-symbols-outlined text-5xl font-black">delete_forever</span>
                        </div>
                        
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white">¿Eliminar Producto?</h2>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest px-4">
                                Estás a punto de eliminar <span className="text-rose-500 font-black italic underline decoration-2 underline-offset-4">&quot;{productName}&quot;</span>. Esta acción es irreversible.
                            </p>
                        </div>

                        <div className="w-full flex flex-col gap-3 pt-4">
                            <Button
                                onClick={handleConfirm}
                                disabled={loading}
                                className="w-full h-16 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-rose-600/20 transform active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                {loading && <span className="material-symbols-outlined animate-spin">progress_activity</span>}
                                {!loading && <span className="material-symbols-outlined font-black">delete</span>}
                                Eliminar Definitivamente
                            </Button>
                            
                            <Button
                                variant="ghost"
                                onClick={onClose}
                                disabled={loading}
                                className="w-full h-12 text-slate-400 hover:text-slate-600 dark:hover:text-white font-black uppercase tracking-[0.2em] text-[10px]"
                            >
                                Cancelar y Volver
                            </Button>
                        </div>
                    </div>
                    
                    <div className="bg-rose-600 h-2 w-full"></div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
