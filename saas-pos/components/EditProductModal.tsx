"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { API_URL } from "@/lib/api"

type Product = {
    id: string
    name: string
    internalCode: string
    barcode: string
    price: number
    cost: number
    stock: number
    minStock: number
    categoryId: string
    saleType: string
    imageUrl: string
    status: string
    wholesalePrice?: number
    wholesaleMinQty?: number
    expirationDate?: string
    trackStock?: boolean
}

type EditProductModalProps = {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    product: Product | null
}

type Category = {
    id: string
    name: string
}

export function EditProductModal({ isOpen, onClose, onSuccess, product }: EditProductModalProps) {
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
    const [status, setStatus] = useState("ACTIVE")
    const [wholesalePrice, setWholesalePrice] = useState("")
    const [wholesaleMinQty, setWholesaleMinQty] = useState("")
    const [expirationDate, setExpirationDate] = useState("")
    const [trackStock, setTrackStock] = useState(true)

    useEffect(() => {
        if (isOpen) {
            fetchCategories()
        }
    }, [isOpen])

    useEffect(() => {
        if (product && isOpen) {
            setName(product.name || "")
            setInternalCode(product.internalCode || "")
            setBarcode(product.barcode || "")
            setPrice(product.price?.toString() || "")
            setCost(product.cost?.toString() || "")
            setStock(product.stock?.toString() || "")
            setMinStock(product.minStock?.toString() || "")
            setCategoryId(product.categoryId || "")
            setSaleType(product.saleType || "UNIT")
            setImageUrl(product.imageUrl || "")
            setStatus(product.status || "ACTIVE")
            setWholesalePrice(product.wholesalePrice?.toString() || "")
            setWholesaleMinQty(product.wholesaleMinQty?.toString() || "")
            setExpirationDate(product.expirationDate ? product.expirationDate.split('T')[0] : "")
            setTrackStock(product.trackStock !== false)
        }
    }, [product, isOpen])

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
        if (!product || !name || !internalCode || !price || !categoryId) {
            toast.error("Por favor complete los campos obligatorios (*) marcadaos.")
            return
        }

        const parsedPrice = parseFloat(price)
        const parsedCost = parseFloat(cost) || 0
        const parsedStock = parseFloat(stock) || 0
        const parsedMinStock = parseFloat(minStock) || 0
        const parsedWholesalePrice = parseFloat(wholesalePrice) || 0
        const parsedWholesaleMinQty = parseFloat(wholesaleMinQty) || 0

        if (parsedPrice <= 0) { toast.error("El precio debe ser mayor a 0"); return }
        if (parsedCost < 0) { toast.error("El costo no puede ser negativo"); return }
        if (parsedStock < 0) { toast.error("El stock no puede ser negativo"); return }
        if (parsedMinStock < 0) { toast.error("El stock mínimo no puede ser negativo"); return }
        if (parsedWholesalePrice < 0) { toast.error("El precio mayorista no puede ser negativo"); return }
        if (parsedWholesaleMinQty < 0) { toast.error("La cantidad mínima mayorista no puede ser negativa"); return }

        setLoading(true)
        try {
            const payload = {
                name,
                internalCode,
                barcode: barcode || null,
                price: parsedPrice,
                cost: parsedCost,
                stock: parsedStock,
                minStock: parsedMinStock,
                categoryId,
                saleType,
                imageUrl,
                status,
                wholesalePrice: parsedWholesalePrice,
                wholesaleMinQty: parsedWholesaleMinQty,
                expirationDate: expirationDate ? new Date(expirationDate).toISOString() : null,
                trackStock
            }

            const token = localStorage.getItem("token")
            const res = await fetch(`${API_URL}/api/products/${product.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            })

            if (!res.ok) {
                const err = await res.text()
                throw new Error(err || "Error updating product")
            }

            toast.success("Producto actualizado exitosamente")
            onSuccess()
            onClose()
        } catch (e: any) {
            toast.error(`Error: ${e.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0 border-none bg-background-light dark:bg-background-dark font-display">
                <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">Editar Producto</h2>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Modificando: {product?.name}</p>
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
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-2 space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400">Nombre del Producto *</Label>
                                    <Input 
                                        value={name} 
                                        onChange={e => setName(e.target.value)} 
                                        className="h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-primary font-bold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400">Estado</Label>
                                    <Select value={status} onValueChange={setStatus}>
                                        <SelectTrigger className="h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl font-bold">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ACTIVE" className="font-bold">Activo</SelectItem>
                                            <SelectItem value="INACTIVE" className="font-bold">Inactivo</SelectItem>
                                            <SelectItem value="OUT_OF_STOCK" className="font-bold">Agotado</SelectItem>
                                        </SelectContent>
                                    </Select>
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
                                        className="h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs"
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400">Código de Barras</Label>
                                    <div className="relative">
                                        <Input 
                                            value={barcode} 
                                            onChange={e => setBarcode(e.target.value)} 
                                            className="h-12 pl-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs"
                                        />
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">barcode_scanner</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400">Vencimiento</Label>
                                    <Input 
                                        type="date"
                                        value={expirationDate} 
                                        onChange={e => setExpirationDate(e.target.value)} 
                                        className="h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section: Pricing & Wholesale */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6 p-6 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                                <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <span className="material-symbols-outlined text-base">payments</span>
                                    Precios y Costos
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400">Precio Minorista *</Label>
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
                                        <Label className="text-[10px] font-black uppercase text-slate-400">Precio Mayorista</Label>
                                        <Input 
                                            type="number" 
                                            value={wholesalePrice} 
                                            onChange={e => setWholesalePrice(e.target.value)} 
                                            className="h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl font-bold text-blue-600"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400">Cant. Mínima</Label>
                                        <Input 
                                            type="number" 
                                            value={wholesaleMinQty} 
                                            onChange={e => setWholesaleMinQty(e.target.value)} 
                                            className="h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400">Costo Unitario</Label>
                                        <Input 
                                            type="number" 
                                            value={cost} 
                                            onChange={e => setCost(e.target.value)} 
                                            className="h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6 p-6 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                                <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <span className="material-symbols-outlined text-base">inventory</span>
                                    Control de Stock
                                </h3>
                                <div className="space-y-4">
                                    {/* Tipo de control */}
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setTrackStock(true)}
                                            className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${trackStock ? "border-primary bg-primary/5 text-primary" : "border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300"}`}
                                        >
                                            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: trackStock ? "'FILL' 1" : "'FILL' 0" }}>inventory_2</span>
                                            <div className="text-left">
                                                <p className="text-[10px] font-black uppercase tracking-widest">Por Inventario</p>
                                                <p className="text-[9px] font-bold opacity-60">Descuenta stock</p>
                                            </div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTrackStock(false)}
                                            className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${!trackStock ? "border-emerald-500 bg-emerald-500/5 text-emerald-600" : "border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300"}`}
                                        >
                                            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: !trackStock ? "'FILL' 1" : "'FILL' 0" }}>sell</span>
                                            <div className="text-left">
                                                <p className="text-[10px] font-black uppercase tracking-widest">Venta Directa</p>
                                                <p className="text-[9px] font-bold opacity-60">Sin stock</p>
                                            </div>
                                        </button>
                                    </div>
                                    <div className={`space-y-4 transition-opacity ${!trackStock ? "opacity-30 pointer-events-none" : ""}`}>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400">Stock Actual (Ajuste Manual)</Label>
                                        <div className="relative">
                                            <Input 
                                                type="number" 
                                                value={stock} 
                                                onChange={e => setStock(e.target.value)} 
                                                className="h-16 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl text-3xl font-black italic text-center text-slate-900 dark:text-white"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">Unidades</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400">Stock Mínimo (Alerta Crítica)</Label>
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
                        </div>

                        {/* Image URL */}
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">URL de Imagen del Producto</Label>
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
                            Cancelar
                        </Button>
                        <Button onClick={handleSubmit} disabled={loading} className="h-12 px-10 bg-primary hover:bg-primary/90 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/30 flex items-center gap-2 transform active:scale-95 transition-all">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="material-symbols-outlined text-lg">save</span>}
                            Guardar Cambios
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
