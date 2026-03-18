"use client"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface CashSessionDetailModalProps {
    isOpen: boolean
    onClose: () => void
    session: any
}

export function CashSessionDetailModal({ isOpen, onClose, session }: CashSessionDetailModalProps) {
    if (!session) return null

    const formatMoney = (amount: number) =>
        "₲ " + new Intl.NumberFormat('es-PY', { minimumFractionDigits: 0 }).format(amount || 0)

    const isClosed = session.status !== "OPEN"
    const hasDiff = session.differenceCash && Math.abs(session.differenceCash) > 100

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl p-0 border-none bg-transparent overflow-hidden rounded-[40px]">
                <div className="bg-white dark:bg-slate-950 flex flex-col max-h-[90vh]">
                    <div className="p-10 pb-6 flex justify-between items-start bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-3">
                                <div className="size-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined text-3xl font-black">receipt_long</span>
                                </div>
                                <h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white">Auditoría de Turno</h2>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-1">ID: #{session.id.substring(0, 8)}...</span>
                        </div>
                        <div className={`px-6 py-2 rounded-2xl font-black uppercase italic tracking-widest text-[10px] border-2 shadow-lg ${session.status === 'OPEN' ? 'bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/20 animate-pulse' : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                            {session.status === 'OPEN' ? '🟢 EN CURSO' : '🔴 CERRADO'}
                        </div>
                    </div>

                    <div className="p-10 overflow-y-auto space-y-10 custom-scrollbar">
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
                                    <div className="relative z-10 flex flex-col gap-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha de Apertura</span>
                                        <span className="text-lg font-black italic tracking-tighter text-slate-900 dark:text-white">
                                            {format(new Date(session.openedAt), "dd 'de' MMMM, HH:mm", { locale: es })}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                            Por: {session.openedByUser?.name || "Desconocido"}
                                        </span>
                                    </div>
                                    <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-7xl text-slate-200/50 dark:text-slate-800/30 group-hover:rotate-12 transition-transform">login</span>
                                </div>
                                
                                <div className="p-8 bg-primary rounded-[32px] border-4 border-primary/50 shadow-xl shadow-primary/20 text-white relative overflow-hidden group">
                                    <div className="relative z-10 flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Fondo Inicial</span>
                                        <span className="text-4xl font-black italic tracking-tighter">{formatMoney(session.openingAmount)}</span>
                                    </div>
                                    <span className="material-symbols-outlined absolute -bottom-6 -right-6 text-[120px] text-white/10 group-hover:scale-110 transition-transform">account_balance_wallet</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {isClosed && (
                                    <>
                                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
                                            <div className="relative z-10 flex flex-col gap-1">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha de Cierre</span>
                                                <span className="text-lg font-black italic tracking-tighter text-slate-900 dark:text-white">
                                                    {format(new Date(session.closedAt), "dd 'de' MMMM, HH:mm", { locale: es })}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    Por: {session.closedByUser?.name || "Desconocido"}
                                                </span>
                                            </div>
                                            <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-7xl text-slate-200/50 dark:text-slate-800/30 group-hover:-rotate-12 transition-transform">logout</span>
                                        </div>

                                        <div className="p-8 bg-slate-900 rounded-[32px] border-4 border-slate-800 shadow-xl shadow-slate-900/20 text-white relative overflow-hidden group">
                                            <div className="relative z-10 flex flex-col">
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Efectivo Final (Auditado)</span>
                                                <span className="text-4xl font-black italic tracking-tighter">{formatMoney(session.closingAmountCash)}</span>
                                            </div>
                                            <span className="material-symbols-outlined absolute -bottom-6 -right-6 text-[120px] text-white/5 group-hover:scale-110 transition-transform">payments</span>
                                        </div>
                                    </>
                                )}
                                {!isClosed && (
                                    <div className="h-full bg-slate-50 dark:bg-slate-900/50 rounded-[32px] border-4 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center p-8 gap-4 opacity-60">
                                        <span className="material-symbols-outlined text-6xl text-slate-400 animate-pulse">sync</span>
                                        <p className="font-black italic uppercase tracking-widest text-slate-400 text-xs">Aguardando Cierre de Caja para Auditoría Final</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {isClosed && (
                            <div className={`p-8 rounded-[40px] border-4 flex items-center gap-8 ${hasDiff ? 'bg-rose-500 border-rose-400 shadow-rose-500/20' : 'bg-emerald-500 border-emerald-400 shadow-emerald-500/20'} text-white shadow-xl relative overflow-hidden group`}>
                                <div className="size-20 rounded-3xl bg-white/20 flex items-center justify-center text-white relative z-10">
                                    <span className="material-symbols-outlined text-5xl font-black">{hasDiff ? 'warning' : 'verified'}</span>
                                </div>
                                <div className="flex flex-col relative z-10">
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Resultado del Arqueo</span>
                                    <h3 className="text-3xl font-black italic tracking-tighter uppercase leading-none">
                                        {hasDiff ? `Diferencia de ${formatMoney(session.differenceCash)}` : 'Turno Cuadrado Correctamente'}
                                    </h3>
                                    {hasDiff && (
                                        <p className="text-[10px] font-bold uppercase tracking-widest mt-2 bg-white/10 px-4 py-2 rounded-full inline-block border border-white/20">
                                            Motivo: {session.differenceReason || "SIN ESPECIFICAR"}
                                        </p>
                                    )}
                                </div>
                                <span className="material-symbols-outlined absolute -bottom-8 -right-8 text-[180px] text-white/10 group-hover:rotate-12 transition-transform duration-700">analytics</span>
                            </div>
                        )}
                    </div>

                    <div className="p-10 pt-4 flex justify-end">
                        <Button
                            onClick={onClose}
                            className="h-16 px-16 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase italic tracking-widest text-lg shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95"
                        >
                            Cerrar
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
