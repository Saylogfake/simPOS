"use client"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { API_URL } from "@/lib/api"

type QuickWasteModalProps = {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

type Product = {
    id: string
    name: string
    internalCode: string
    barcode: string
    stock: number
    saleType: string
}

export function QuickWasteModal({ isOpen, onClose, onSuccess }: QuickWasteModalProps) {
    const [step, setStep] = useState(1) // 1: Scan, 2: Waste Form
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [product, setProduct] = useState<Product | null>(null)

    // Form Stats
    const [quantity, setQuantity] = useState("")
    const [reasonType, setReasonType] = useState("EXPIRED")
    const [comment, setComment] = useState("")

    const searchInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isOpen) {
            setStep(1)
            setSearchTerm("")
            setProduct(null)
            setQuantity("")
            setReasonType("EXPIRED")
            setComment("")
            setTimeout(() => searchInputRef.current?.focus(), 100)
        }
    }, [isOpen])

    const handleSearch = async () => {
        if (!searchTerm) return
        setLoading(true)
        try {
            const token = localStorage.getItem("token")
            const res = await fetch(`${API_URL}/api/products`, {
                headers: { "Authorization": `Bearer ${token}` }
            })
            if (!res.ok) throw new Error("Error cargando productos")
            const allProducts: Product[] = await res.json()

            const found = allProducts.find(p =>
                p.internalCode === searchTerm ||
                p.barcode === searchTerm ||
                p.name.toLowerCase().includes(searchTerm.toLowerCase())
            )

            if (found) {
                setProduct(found)
                setStep(2)
            } else {
                toast.error("Producto no encontrado")
                searchInputRef.current?.focus()
            }
        } catch (e) {
            toast.error("Error buscando producto")
        } finally {
            setLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleSearch()
    }

    const handleSubmit = async () => {
        if (!product) return

        const qty = parseFloat(quantity)
        if (isNaN(qty) || qty <= 0) {
            toast.error("Ingrese una cantidad válida")
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
                    quantity: -qty,
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
                    <div className="p-10 pb-6 flex justify-between items-start">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-amber-500 text-3xl font-black">delete_sweep</span>
                                <h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white">Registro de Merma</h2>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-1">Control de Stock y Vencimientos</span>
                        </div>
                    </div>

                    <div className="px-10 py-6 min-h-[300px]">
                        {step === 1 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-2">Escanear Código o Nombre</label>
                                    <div className="relative">
                                        <input
                                            ref={searchInputRef}
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder="SCANNER / TECLADO..."
                                            className="w-full h-24 bg-slate-50 dark:bg-slate-900 border-4 border-slate-100 dark:border-slate-800 rounded-3xl text-3xl font-black italic tracking-tighter text-slate-900 dark:text-white px-8 focus:border-amber-500 transition-all uppercase placeholder:opacity-30"
                                        />
                                        <button 
                                            onClick={handleSearch}
                                            disabled={loading}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 size-16 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                                        >
                                            {loading ? <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span> : <span className="material-symbols-outlined text-3xl font-black">search</span>}
                                        </button>
                                    </div>
                                </div>
                                <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 flex items-center gap-4 text-slate-400">
                                    <span className="material-symbols-outlined text-4xl">barcode_scanner</span>
                                    <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">Pase el producto por el scanner o ingrese el código interno manualmente para continuar.</p>
                                </div>
                            </div>
                        )}

                        {step === 2 && product && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="bg-slate-50 dark:bg-slate-900 p-8 rounded-[32px] border-4 border-slate-100 dark:border-slate-800 relative overflow-hidden group">
                                    <div className="relative z-10 flex justify-between items-end">
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">Producto Seleccionado</span>
                                            <h3 className="text-3xl font-black italic tracking-tighter text-slate-900 dark:text-white leading-none">{product.name}</h3>
                                            <div className="flex gap-4 pt-2">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-700">Stock: {product.stock}</span>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-700">Code: {product.internalCode}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <span className="material-symbols-outlined absolute -bottom-8 -right-8 text-[200px] text-slate-200/30 dark:text-slate-800/20 pointer-events-none transition-transform group-hover:rotate-12 duration-700">package_2</span>
                                </div>

                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-2">Cantidad</label>
                                        <input
                                            type="number"
                                            value={quantity}
                                            onChange={e => setQuantity(e.target.value)}
                                            className="w-full h-20 bg-slate-50 dark:bg-slate-900 border-4 border-slate-100 dark:border-slate-800 rounded-2xl text-4xl font-black italic tracking-tighter text-slate-900 dark:text-white px-6 focus:border-amber-500 transition-all text-center"
                                            placeholder="0"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-2">Motivo</label>
                                        <select 
                                            value={reasonType}
                                            onChange={e => setReasonType(e.target.value)}
                                            className="w-full h-20 bg-slate-50 dark:bg-slate-900 border-4 border-slate-100 dark:border-slate-800 rounded-2xl text-lg font-black italic tracking-tighter uppercase text-slate-900 dark:text-white px-6 focus:border-amber-500 transition-all appearance-none text-center cursor-pointer"
                                        >
                                            <option value="EXPIRED">Vencimiento</option>
                                            <option value="BROKEN">Rotura / Daño</option>
                                            <option value="LOST">Pérdida / Robo</option>
                                            <option value="OTHER">Otro</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-2">Comentario Adicional</label>
                                    <input
                                        value={comment}
                                        onChange={e => setComment(e.target.value)}
                                        placeholder="OPCIONAL..."
                                        className="w-full h-16 bg-slate-50 dark:bg-slate-900 border-4 border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-bold uppercase tracking-widest text-slate-900 dark:text-white px-6 focus:border-amber-500 transition-all"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-10 pt-4 flex gap-4">
                        {step === 2 && (
                            <Button
                                variant="ghost" 
                                onClick={() => setStep(1)}
                                className="h-16 px-10 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                                <span className="material-symbols-outlined mr-2">arrow_back</span>
                                Volver
                            </Button>
                        )}
                        <Button
                            onClick={step === 1 ? handleSearch : handleSubmit}
                            disabled={loading || (step === 1 && !searchTerm) || (step === 2 && !quantity)}
                            className={`flex-1 h-16 ${step === 2 ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary hover:bg-primary/90'} text-white rounded-2xl font-black uppercase italic tracking-widest text-lg shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95`}
                        >
                            {loading ? <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span> : <span className="material-symbols-outlined text-2xl font-black">{step === 1 ? 'search' : 'check_circle'}</span>}
                            {step === 1 ? 'Buscar' : 'Confirmar Merma'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
