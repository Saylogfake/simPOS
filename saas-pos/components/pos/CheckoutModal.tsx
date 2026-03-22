import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Badge } from '../ui/badge'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { Loader2 } from 'lucide-react'
import { formatMoney } from '@/lib/utils'

import { API_URL } from "@/lib/api"

interface CheckoutModalProps {
    isOpen: boolean
    onClose: () => void
    saleId: string | null
    total: number
    onSuccess: () => void
    customerId: string | null
    customerName: string | null
    registerId: string | null
}

type PaymentMethod = 'CASH' | 'CARD' | 'QR' | 'CREDIT' | null

export default function CheckoutModal({
    isOpen,
    onClose,
    saleId,
    total,
    onSuccess,
    customerId,
    customerName,
    registerId
}: CheckoutModalProps) {
    const [method, setMethod] = useState<PaymentMethod>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    // Cash State
    const [cashReceived, setCashReceived] = useState<string>('')
    const [change, setChange] = useState(0)

    // Credit State
    const [dueDate, setDueDate] = useState<string>('')

    const cashInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isOpen) {
            setMethod(null)
            setLoading(false)
            setError(null)
            setSuccess(false)
            setCashReceived('')
            setChange(0)
            setDueDate('')
        }
    }, [isOpen, total])

    useEffect(() => {
        if (method === 'CASH' && cashInputRef.current) {
            setTimeout(() => cashInputRef.current?.focus(), 100)
        }
    }, [method])

    const handleCashChange = (val: string) => {
        setCashReceived(val)
        const received = parseFloat(val)
        if (!isNaN(received)) {
            setChange(received - total)
        } else {
            setChange(0)
        }
    }

    const handleConfirmPayment = async () => {
        if (!saleId) {
            setError("No hay venta activa")
            return
        }

        setLoading(true)
        setError(null)

        try {
            const payments = []

            if (method === 'CASH') {
                const amount = parseFloat(cashReceived)
                if (isNaN(amount) || amount < total) {
                    throw new Error("Monto insuficiente")
                }
                payments.push({
                    method: 'CASH',
                    amount: total // Pay exact total, change is handled physically
                })
            } else if (method === 'CARD') {
                // Simulate Bancard
                await new Promise(resolve => setTimeout(resolve, 2000))
                payments.push({
                    method: 'CARD',
                    amount: total
                })
            } else if (method === 'QR') {
                payments.push({
                    method: 'QR',
                    amount: total
                })
            } else if (method === 'CREDIT') {
                if (!customerId) throw new Error("Requiere Cliente")
                if (!dueDate) throw new Error("Requiere Fecha de Vencimiento")

                payments.push({
                    method: 'CREDIT',
                    amount: total,
                    dueDate: new Date(dueDate).toISOString()
                })
            }

            const token = localStorage.getItem('token')
            const res = await fetch(`${API_URL}/api/sales/${saleId}/pay`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    payments,
                    cashRegisterId: registerId
                })
            })

            if (!res.ok) {
                const err = await res.text()
                throw new Error(err)
            }

            setSuccess(true)
            setTimeout(() => {
                onSuccess()
                onClose()
            }, 1500)

        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            if (method) setMethod(null)
            else onClose()
        }
        if (e.key === 'Enter' && method === 'CASH') {
            handleConfirmPayment()
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-full sm:max-w-2xl lg:max-w-5xl h-[95vh] sm:h-[90vh] p-0 border-none bg-background-light dark:bg-background-dark font-display overflow-hidden rounded-none sm:rounded-3xl">
                <div className="flex flex-col h-full bg-slate-950 text-white">
                    {/* High-Impact Header */}
                    <div className="px-10 py-10 bg-gradient-to-br from-slate-900 to-slate-950 border-b border-slate-800 flex justify-between items-end relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <span className="material-symbols-outlined text-[120px] rotate-12">payments</span>
                        </div>
                        
                        <div className="flex flex-col gap-4 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined text-2xl font-bold">point_of_sale</span>
                                </div>
                                <h2 className="text-3xl font-black italic tracking-tighter uppercase">Finalizar Venta</h2>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700/50 w-fit">
                                <span className="material-symbols-outlined text-sm text-slate-400">person</span>
                                <span className="text-xs font-black uppercase tracking-widest text-slate-300">{customerName || "Consumidor Final"}</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-end relative z-10">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2">Total a Recibir</span>
                            <div className="text-7xl font-black italic tracking-tighter text-emerald-400 drop-shadow-2xl">
                                {formatMoney(total)}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col sm:flex-row overflow-hidden bg-white dark:bg-slate-900">
                        {/* Sidebar: Payment Methods */}
                        <div className="w-full sm:w-64 lg:w-80 bg-slate-50 dark:bg-slate-950/50 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-slate-800 p-4 sm:p-6 flex flex-row sm:flex-col gap-3 sm:gap-4 overflow-x-auto sm:overflow-x-visible">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-2">Método de Pago</h3>
                            
                            <button
                                onClick={() => setMethod('CASH')}
                                className={`flex flex-col gap-3 p-6 rounded-2xl transition-all duration-300 text-left border-2 group ${
                                    method === 'CASH' 
                                    ? 'bg-emerald-500 border-emerald-400 shadow-xl shadow-emerald-500/20 text-white scale-[1.02]' 
                                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-emerald-500/50'
                                }`}
                            >
                                <span className={`material-symbols-outlined text-3xl ${method === 'CASH' ? 'text-white' : 'text-emerald-500'}`}>payments</span>
                                <div className="flex flex-col">
                                    <span className="text-xs font-black uppercase tracking-widest">Efectivo</span>
                                    <span className="text-[10px] opacity-60 font-bold uppercase tracking-tighter">Billetes y Monedas</span>
                                </div>
                            </button>

                            <button
                                onClick={() => setMethod('CARD')}
                                className={`flex flex-col gap-3 p-6 rounded-2xl transition-all duration-300 text-left border-2 group ${
                                    method === 'CARD' 
                                    ? 'bg-primary border-primary shadow-xl shadow-primary/20 text-white scale-[1.02]' 
                                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-primary/50'
                                }`}
                            >
                                <span className={`material-symbols-outlined text-3xl ${method === 'CARD' ? 'text-white' : 'text-primary'}`}>credit_card</span>
                                <div className="flex flex-col">
                                    <span className="text-xs font-black uppercase tracking-widest">Tarjeta (POS)</span>
                                    <span className="text-[10px] opacity-60 font-bold uppercase tracking-tighter">Débito / Crédito</span>
                                </div>
                            </button>

                            <button
                                onClick={() => setMethod('QR')}
                                className={`flex flex-col gap-3 p-6 rounded-2xl transition-all duration-300 text-left border-2 group ${
                                    method === 'QR' 
                                    ? 'bg-purple-600 border-purple-500 shadow-xl shadow-purple-600/20 text-white scale-[1.02]' 
                                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-purple-500/50'
                                }`}
                            >
                                <span className={`material-symbols-outlined text-3xl ${method === 'QR' ? 'text-white' : 'text-purple-500'}`}>qr_code_2</span>
                                <div className="flex flex-col">
                                    <span className="text-xs font-black uppercase tracking-widest">QR Pagos</span>
                                    <span className="text-[10px] opacity-60 font-bold uppercase tracking-tighter">Billeteras Digitales</span>
                                </div>
                            </button>

                            <button
                                onClick={() => setMethod('CREDIT')}
                                disabled={!customerId}
                                className={`flex flex-col gap-3 p-6 rounded-2xl transition-all duration-300 text-left border-2 group ${
                                    method === 'CREDIT' 
                                    ? 'bg-orange-600 border-orange-500 shadow-xl shadow-orange-600/20 text-white scale-[1.02]' 
                                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-orange-500/50'
                                } ${!customerId ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                            >
                                <span className={`material-symbols-outlined text-3xl ${method === 'CREDIT' ? 'text-white' : 'text-orange-500'}`}>description</span>
                                <div className="flex flex-col">
                                    <span className="text-xs font-black uppercase tracking-widest">Crédito</span>
                                    <span className="text-[10px] opacity-60 font-bold uppercase tracking-tighter">Cuenta Corriente</span>
                                </div>
                            </button>
                        </div>

                        {/* Payment Area */}
                        <div className="flex-1 p-12 flex flex-col items-center justify-center relative bg-white dark:bg-slate-900">
                            {loading && (
                                <div className="absolute inset-0 bg-white/90 dark:bg-slate-950/90 z-50 flex flex-col items-center justify-center backdrop-blur-sm animate-in fade-in duration-500">
                                    <div className="relative">
                                        <div className="size-32 rounded-full border-4 border-slate-100 dark:border-slate-800 border-t-primary animate-spin"></div>
                                        <span className="material-symbols-outlined absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl text-primary animate-pulse">lock</span>
                                    </div>
                                    <h3 className="mt-8 text-2xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">Procesando Pago...</h3>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 px-12 text-center">Espere un momento mientras confirmamos la transacción</p>
                                </div>
                            )}

                            {success && (
                                <div className="absolute inset-0 bg-emerald-500 z-50 flex flex-col items-center justify-center animate-in zoom-in slide-in-from-bottom-20 duration-500">
                                    <div className="size-32 rounded-full bg-white flex items-center justify-center text-emerald-500 mb-8 shadow-2xl">
                                        <span className="material-symbols-outlined text-6xl font-black">check_circle</span>
                                    </div>
                                    <h2 className="text-5xl font-black uppercase italic tracking-tighter text-white">¡Venta Exitosa!</h2>
                                    <p className="text-emerald-100 text-sm font-bold uppercase tracking-[0.2em] mt-2">Imprimiendo comprobante...</p>
                                    <div className="mt-12 flex gap-4">
                                        <div className="px-6 py-3 bg-white/20 rounded-full text-white text-[10px] font-black uppercase tracking-widest">Vuelto: {formatMoney(change > 0 ? change : 0)}</div>
                                    </div>
                                </div>
                            )}

                            {!method && !success && (
                                <div className="flex flex-col items-center text-slate-200 dark:text-slate-800">
                                    <span className="material-symbols-outlined text-[160px]">point_of_sale</span>
                                    <p className="text-xl font-black italic uppercase tracking-tighter text-slate-300 dark:text-slate-700 -mt-8">Seleccione Método</p>
                                </div>
                            )}

                            {method === 'CASH' && (
                                <div className="w-full max-w-lg space-y-10 animate-in fade-in slide-in-from-right-10 duration-500">
                                    <div className="space-y-4">
                                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-2">Importe Recibido</Label>
                                        <div className="relative group">
                                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-4xl font-black text-emerald-500 group-focus-within:scale-125 transition-transform duration-300">₲</span>
                                            <input
                                                ref={cashInputRef}
                                                type="number"
                                                className="w-full h-32 pl-16 pr-8 bg-slate-50 dark:bg-slate-950/50 border-4 border-slate-100 dark:border-slate-800 rounded-[32px] text-7xl font-black italic tracking-tighter text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-0 transition-all text-right"
                                                placeholder="0"
                                                value={cashReceived}
                                                onChange={(e) => handleCashChange(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="p-6 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col gap-1 items-center justify-center">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">A Cobrar</span>
                                            <span className="text-2xl font-black italic tracking-tight text-slate-900 dark:text-white">{formatMoney(total)}</span>
                                        </div>
                                        <div className={`p-6 rounded-2xl border-2 flex flex-col gap-1 items-center justify-center transition-all duration-500 ${change >= 0 ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600' : 'bg-rose-500/10 border-rose-500 text-rose-600'}`}>
                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{change >= 0 ? 'Vuelto' : 'Faltante'}</span>
                                            <span className="text-2xl font-black italic tracking-tight">{formatMoney(Math.abs(change))}</span>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleConfirmPayment}
                                        disabled={change < 0 || !cashReceived}
                                        className="w-full h-20 bg-emerald-500 hover:bg-emerald-600 text-white rounded-3xl font-black uppercase italic tracking-widest text-lg shadow-2xl shadow-emerald-500/30 transform active:scale-95 transition-all flex items-center justify-center gap-4"
                                    >
                                        <span className="material-symbols-outlined text-3xl font-black">check</span>
                                        Confirmar Cobro
                                    </Button>
                                </div>
                            )}

                            {method === 'CARD' && (
                                <div className="w-full max-w-md text-center animate-in zoom-in duration-500">
                                    <div className="size-48 rounded-full bg-primary/5 flex items-center justify-center text-primary mx-auto mb-8 border-2 border-primary/20 animate-pulse">
                                        <span className="material-symbols-outlined text-[80px]">tap_and_play</span>
                                    </div>
                                    <h3 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white">Conectando POS</h3>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Monto a Transmitir: <span className="text-primary font-black">{formatMoney(total)}</span></p>
                                    <Button 
                                        onClick={handleConfirmPayment}
                                        className="w-full h-16 mt-12 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black uppercase tracking-widest"
                                    >
                                        Iniciar Cobro POS
                                    </Button>
                                </div>
                            )}

                            {method === 'QR' && (
                                <div className="w-full max-w-md text-center animate-in zoom-in duration-500">
                                    <div className="bg-white p-6 rounded-3xl border-8 border-slate-950 inline-block shadow-2xl relative group overflow-hidden">
                                        <div className="p-4 bg-white">
                                            <span className="material-symbols-outlined text-[200px] text-slate-900">qr_code_2</span>
                                        </div>
                                        <div className="absolute inset-0 bg-primary/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                                    </div>
                                    <h3 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white mt-10">Escanea y Paga</h3>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Importe: <span className="text-purple-500 font-black">{formatMoney(total)}</span></p>
                                    <Button 
                                        onClick={handleConfirmPayment}
                                        className="w-full h-16 mt-12 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-purple-600/30"
                                    >
                                        Confirmar Recepción
                                    </Button>
                                </div>
                            )}

                            {method === 'CREDIT' && (
                                <div className="w-full max-w-lg space-y-10 animate-in fade-in slide-in-from-right-10 duration-500">
                                    <div className="p-8 bg-orange-500/10 rounded-[32px] border-2 border-orange-500/20 flex items-center gap-6">
                                        <div className="size-20 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
                                            <span className="material-symbols-outlined text-4xl">warning</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <h3 className="text-xl font-black italic uppercase tracking-tighter text-orange-600">Venta al Crédito</h3>
                                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">El cliente pagará en una fecha posterior</p>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-2">Fecha de Vencimiento de Factura</Label>
                                            <input
                                                type="date"
                                                className="w-full h-16 px-6 bg-slate-50 dark:bg-slate-950/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl text-xl font-black italic tracking-tight text-slate-900 dark:text-white focus:border-orange-50 focus:ring-primary transition-all"
                                                value={dueDate}
                                                onChange={(e) => setDueDate(e.target.value)}
                                            />
                                        </div>
                                        
                                        <div className="p-6 bg-slate-50 dark:bg-slate-950/50 rounded-2xl flex justify-between items-center px-8 border border-slate-100 dark:border-slate-800">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monto a Deudar</span>
                                            <span className="text-2xl font-black italic text-slate-900 dark:text-white uppercase tracking-tighter">{formatMoney(total)}</span>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleConfirmPayment}
                                        disabled={!dueDate}
                                        className="w-full h-20 bg-orange-600 hover:bg-orange-700 text-white rounded-3xl font-black uppercase italic tracking-widest text-lg shadow-2xl shadow-orange-600/30 transform active:scale-95 transition-all"
                                    >
                                        Confirmar Crédito
                                    </Button>
                                </div>
                            )}

                            {error && (
                                <Alert variant="destructive" className="mt-8 absolute bottom-8 max-w-md bg-rose-500 border-none text-white rounded-2xl shadow-2xl animate-in slide-in-from-bottom-5">
                                    <div className="flex gap-4 items-center">
                                        <span className="material-symbols-outlined font-black">error</span>
                                        <div className="flex flex-col">
                                            <AlertTitle className="text-xs font-black uppercase tracking-widest">Error al Procesar</AlertTitle>
                                            <AlertDescription className="text-sm font-bold opacity-90">{error}</AlertDescription>
                                        </div>
                                    </div>
                                </Alert>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
