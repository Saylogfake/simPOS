"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { API_URL } from "@/lib/api"

type AddProductModalProps = {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

type Category = {
    id: string
    name: string
}

export function AddProductModal({ isOpen, onClose, onSuccess }: AddProductModalProps) {
    const [loading, setLoading] = useState(false)
    const [categories, setCategories] = useState<Category[]>([])

    // Form State
    const [name, setName] = useState("")
    const [internalCode, setInternalCode] = useState("")
    const [barcode, setBarcode] = useState("")
    const [price, setPrice] = useState("")
    const [cost, setCost] = useState("")
    const [stock, setStock] = useState("")
    const [minStock, setMinStock] = useState("")
    const [categoryId, setCategoryId] = useState("")
    const [saleType, setSaleType] = useState("UNIT")
    const [imageUrl, setImageUrl] = useState("")

    useEffect(() => {
        if (isOpen) {
            fetchCategories()
            // Reset form
            setName("")
            setInternalCode("")
            setBarcode("")
            setPrice("")
            setCost("")
            setStock("")
            setMinStock("")
            setCategoryId("")
            setSaleType("UNIT")
            setImageUrl("")
        }
    }, [isOpen])

    const fetchCategories = async () => {
        try {
            const token = localStorage.getItem("token")
            const res = await fetch(`${API_URL}/api/products/categories`, {
                headers: { "Authorization": `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setCategories(data)
            }
        } catch (e) {
            console.error(e)
        }
    }

    const handleSubmit = async () => {
        if (!name || !internalCode || !price || !categoryId) {
            alert("Por favor complete los campos obligatorios (*)")
            return
        }

        setLoading(true)
        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

            const payload = {
                name,
                code: internalCode, // Backend requires 'Code' field
                internalCode,
                barcode: barcode || null,
                price: parseFloat(price),
                cost: parseFloat(cost) || 0,
                stock: parseFloat(stock) || 0,
                minStock: parseFloat(minStock) || 0,
                categoryId,
                saleType,
                imageUrl: imageUrl || null,
            }

            const token = localStorage.getItem("token")
            const res = await fetch(`${API_URL}/api/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload),
                signal: controller.signal
            })
            clearTimeout(timeoutId)

            if (!res.ok) {
                const err = await res.text()
                throw new Error(err || "Error creating product")
            }

            alert("Producto creado exitosamente")
            onSuccess()
            onClose()
        } catch (e: any) {
            const msg = e.name === 'AbortError' ? "Tiempo de espera agotado. El servidor no responde." : e.message
            alert(`Error: ${msg}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 border-none bg-background-light dark:bg-background-dark font-display">
                <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">Nuevo Producto</h2>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Ingrese los detalles para registrar</p>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition-colors">
                            <span className="material-symbols-outlined text-2xl">close</span>
                        </button>
                    </div>

                    <div className="p-8 space-y-8">
                        {/* Section: General Info */}
                        <div className="space-y-6">
                            <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                                <span className="material-symbols-outlined text-base">info</span>
                                Información General
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2 space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400">Nombre del Producto *</Label>
                                    <Input 
                                        value={name} 
                                        onChange={e => setName(e.target.value)} 
                                        placeholder="Ej: Coca Cola 2.5L" 
                                        className="h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-primary font-bold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400">Categoría *</Label>
                                    <Select value={categoryId} onValueChange={setCategoryId}>
                                        <SelectTrigger className="h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl font-bold">
                                            <SelectValue placeholder="Seleccionar..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map(c => (
                                                <SelectItem key={c.id} value={c.id} className="font-bold">{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400">Tipo de Venta</Label>
                                    <Select value={saleType} onValueChange={setSaleType}>
                                        <SelectTrigger className="h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl font-bold">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="UNIT" className="font-bold">Por Unidad</SelectItem>
                                            <SelectItem value="WEIGHT" className="font-bold">Por Peso (Kg)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400">Código Interno *</Label>
                                    <Input 
                                        value={internalCode} 
                                        onChange={e => setInternalCode(e.target.value)} 
                                        placeholder="Ej: 101" 
                                        className="h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400">Código de Barras</Label>
                                    <div className="relative">
                                        <Input 
                                            value={barcode} 
                                            onChange={e => setBarcode(e.target.value)} 
                                            placeholder="Escanee..." 
                                            className="h-12 pl-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs"
                                        />
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">barcode_scanner</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section: Pricing & Stock */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6 p-6 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                                <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <span className="material-symbols-outlined text-base">payments</span>
                                    Precios
                                </h3>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400">Precio de Venta *</Label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-bold">₲</span>
                                            <Input 
                                                type="number" 
                                                value={price} 
                                                onChange={e => setPrice(e.target.value)} 
                                                className="h-12 pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl text-lg font-black italic text-emerald-600"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400">Costo</Label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₲</span>
                                            <Input 
                                                type="number" 
                                                value={cost} 
                                                onChange={e => setCost(e.target.value)} 
                                                className="h-12 pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6 p-6 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                                <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <span className="material-symbols-outlined text-base">inventory</span>
                                    Inventario
                                </h3>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400">Stock Inicial</Label>
                                        <Input 
                                            type="number" 
                                            value={stock} 
                                            onChange={e => setStock(e.target.value)} 
                                            className="h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400">Stock Mínimo (Alerta)</Label>
                                        <Input 
                                            type="number" 
                                            value={minStock} 
                                            onChange={e => setMinStock(e.target.value)} 
                                            className="h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl font-bold text-rose-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Image URL */}
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">URL de Imagen (Opcional)</Label>
                            <Input
                                placeholder="http://..."
                                value={imageUrl}
                                onChange={e => setImageUrl(e.target.value)}
                                className="h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl font-bold truncate"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-4 shadow-inner">
                        <Button variant="outline" onClick={onClose} className="h-12 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                            Descartar
                        </Button>
                        <Button onClick={handleSubmit} disabled={loading} className="h-12 px-10 bg-primary hover:bg-primary/90 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/30 flex items-center gap-2 transform active:scale-95 transition-all">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="material-symbols-outlined text-lg">save</span>}
                            Guardar Producto
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
