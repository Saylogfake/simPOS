"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { API_URL } from "@/lib/api"

type AddProductTabProps = {
    onSuccess: () => void
}

type Category = {
    id: string
    name: string
}

export function AddProductTab({ onSuccess }: AddProductTabProps) {
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
    const [wholesalePrice, setWholesalePrice] = useState("")
    const [wholesaleMinQty, setWholesaleMinQty] = useState("")
    const [expirationDate, setExpirationDate] = useState("")

    useEffect(() => {
        fetchCategories()
    }, [])

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
            toast.error("Por favor complete los campos obligatorios (*)")
            return
        }

        setLoading(true)
        try {
            const payload = {
                name,
                code: internalCode,
                internalCode,
                barcode: barcode || null,
                price: parseFloat(price),
                cost: parseFloat(cost) || 0,
                stock: parseFloat(stock) || 0,
                minStock: parseFloat(minStock) || 0,
                categoryId,
                saleType,
                imageUrl: imageUrl || "https://placehold.co/100",
                wholesalePrice: parseFloat(wholesalePrice) || 0,
                wholesaleMinQty: parseFloat(wholesaleMinQty) || 0,
                expirationDate: expirationDate ? new Date(expirationDate).toISOString() : null
            }

            const token = localStorage.getItem("token")
            const res = await fetch(`${API_URL}/api/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            })

            if (!res.ok) {
                const err = await res.text()
                throw new Error(err || "Error creating product")
            }

            toast.success("Producto creado exitosamente")

            // Clear Form
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
            setWholesalePrice("")
            setWholesaleMinQty("")
            setExpirationDate("")

            onSuccess()
        } catch (e: any) {
            toast.error(`Error: ${e.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Area */}
            <div className="bg-white dark:bg-slate-950 p-10 rounded-[40px] border-4 border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/20 mb-8 relative overflow-hidden group">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <div className="size-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30">
                                <span className="material-symbols-outlined text-3xl font-black">add_box</span>
                            </div>
                            <h2 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white leading-none">Alta de Producto</h2>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 px-1 italic">Módulo de expansión de inventario centralizado</p>
                    </div>
                    
                    <button 
                        onClick={handleSubmit} 
                        disabled={loading}
                        className="h-16 px-12 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase italic tracking-widest text-sm shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                    >
                        {loading ? <span className="material-symbols-outlined animate-spin">sync</span> : <span className="material-symbols-outlined font-black">save</span>}
                        Registrar Ítem
                    </button>
                </div>
                <span className="material-symbols-outlined absolute -bottom-10 -right-10 text-[200px] text-slate-100 dark:text-slate-900 opacity-40 group-hover:rotate-6 transition-transform duration-1000">inventory_2</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Visuals & Essential (4 cols) */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white dark:bg-slate-950 p-8 rounded-[40px] border-4 border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/20">
                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 block mb-6 px-2 italic">Representación Visual</label>
                        <div className="flex flex-col items-center gap-8">
                            <div className="size-56 bg-slate-50 dark:bg-slate-900 rounded-[32px] border-4 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden shadow-inner group/img relative">
                                {imageUrl ? (
                                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                ) : (
                                    <div className="flex flex-col items-center opacity-30">
                                        <span className="material-symbols-outlined text-7xl">image</span>
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] mt-2">Sin Imagen</span>
                                    </div>
                                )}
                            </div>
                            <div className="w-full space-y-2">
                                <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 px-2">Enlace de Imagen (URL)</label>
                                <input
                                    placeholder="https://..."
                                    value={imageUrl}
                                    onChange={e => setImageUrl(e.target.value)}
                                    className="w-full h-14 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-6 text-xs font-bold text-slate-600 outline-none focus:border-primary transition-all overflow-hidden text-ellipsis"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-950 p-8 rounded-[40px] border-4 border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/20 space-y-6">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-2 italic">Nombre del Producto <span className="text-rose-500">*</span></label>
                            <input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="EJ: COCA COLA 2.5L"
                                className="w-full h-16 bg-slate-50 dark:bg-slate-900 border-4 border-slate-100 dark:border-slate-800 rounded-2xl text-xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white px-8 focus:border-primary transition-all outline-none"
                            />
                        </div>
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-2 italic">Categoría <span className="text-rose-500">*</span></label>
                            <select 
                                value={categoryId} 
                                onChange={e => setCategoryId(e.target.value)}
                                className="w-full h-16 bg-slate-50 dark:bg-slate-900 border-4 border-slate-100 dark:border-slate-800 rounded-2xl text-lg font-black italic tracking-tighter uppercase text-slate-900 dark:text-white px-8 focus:border-primary transition-all outline-none appearance-none cursor-pointer"
                            >
                                <option value="">SELECCIONAR...</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* technical Details (8 cols) */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Identification Table Style */}
                    <div className="bg-white dark:bg-slate-950 p-10 rounded-[40px] border-4 border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/20 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-2 italic">Código Interno <span className="text-rose-500">*</span></label>
                            <input
                                value={internalCode}
                                onChange={e => setInternalCode(e.target.value)}
                                placeholder="EJ: 101"
                                className="w-full h-16 bg-slate-50 dark:bg-slate-900 border-4 border-slate-100 dark:border-slate-800 rounded-2xl text-2xl font-black italic tracking-tighter text-slate-900 dark:text-white px-8 focus:border-primary transition-all outline-none font-mono"
                            />
                        </div>
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-2 italic">Código de Barras</label>
                            <div className="relative">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-300 font-black">barcode_scanner</span>
                                <input
                                    value={barcode}
                                    onChange={e => setBarcode(e.target.value)}
                                    placeholder="ESCANEE AHORA..."
                                    className="w-full h-16 bg-slate-50 dark:bg-slate-900 border-4 border-slate-100 dark:border-slate-800 rounded-2xl text-2xl font-black italic tracking-tighter text-slate-900 dark:text-white pl-16 pr-8 focus:border-primary transition-all outline-none font-mono"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Pricing & Logic */}
                    <div className="bg-white dark:bg-slate-950 p-10 rounded-[40px] border-4 border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/20">
                        <div className="flex items-center justify-between mb-8 border-b-4 border-slate-50 dark:border-slate-900 pb-6">
                            <h3 className="text-2xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary font-black">sell</span>
                                Precios y Venta
                            </h3>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setSaleType("UNIT")}
                                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all ${saleType === "UNIT" ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}
                                >
                                    Por Unidad
                                </button>
                                <button 
                                    onClick={() => setSaleType("WEIGHT")}
                                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all ${saleType === "WEIGHT" ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}
                                >
                                    Por Peso
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-2 italic">Precio Retail (PVP) <span className="text-rose-500">*</span></label>
                                <div className="relative">
                                    <span className="absolute left-8 top-1/2 -translate-y-1/2 text-5xl font-black italic text-slate-200">₲</span>
                                    <input
                                        type="number"
                                        value={price}
                                        onChange={e => setPrice(e.target.value)}
                                        className="w-full h-32 bg-slate-50 dark:bg-slate-900 border-4 border-slate-100 dark:border-slate-800 rounded-[32px] text-6xl font-black italic tracking-tighter text-emerald-500 px-16 focus:border-emerald-500 transition-all text-right outline-none"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-2 italic">Costo de Adquisición</label>
                                <div className="relative">
                                    <span className="absolute left-8 top-1/2 -translate-y-1/2 text-5xl font-black italic text-slate-200">₲</span>
                                    <input
                                        type="number"
                                        value={cost}
                                        onChange={e => setCost(e.target.value)}
                                        className="w-full h-32 bg-slate-50 dark:bg-slate-900 border-4 border-slate-100 dark:border-slate-800 rounded-[32px] text-5xl font-black italic tracking-tighter text-slate-400 px-16 focus:border-slate-400 transition-all text-right outline-none"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-10 p-8 bg-slate-50 dark:bg-slate-900/50 rounded-[32px] border-2 border-dashed border-slate-200 dark:border-slate-800">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-2">Precio Mayorista</label>
                                <input
                                    type="number"
                                    value={wholesalePrice}
                                    onChange={e => setWholesalePrice(e.target.value)}
                                    className="w-full h-14 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-6 text-xl font-black italic text-primary outline-none"
                                    placeholder="0"
                                />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-2">Cantidad Mín. Mayorista</label>
                                <input
                                    type="number"
                                    value={wholesaleMinQty}
                                    onChange={e => setWholesaleMinQty(e.target.value)}
                                    className="w-full h-14 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-6 text-xl font-black italic text-primary outline-none"
                                    placeholder="EJ: 6"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Stock & Expiration */}
                    <div className="bg-white dark:bg-slate-950 p-10 rounded-[40px] border-4 border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/20">
                        <div className="flex items-center gap-3 mb-8 border-b-4 border-slate-50 dark:border-slate-900 pb-6">
                            <span className="material-symbols-outlined text-primary font-black">inventory</span>
                            <h3 className="text-2xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white">Inventario e Insumos</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-2">Stock Inicial</label>
                                <input
                                    type="number"
                                    value={stock}
                                    onChange={e => setStock(e.target.value)}
                                    className="w-full h-20 bg-slate-50 dark:bg-slate-900 border-4 border-slate-100 dark:border-slate-800 rounded-2xl text-3xl font-black italic text-slate-900 dark:text-white text-center outline-none"
                                    placeholder="0"
                                />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-2">Stock Mínimo</label>
                                <input
                                    type="number"
                                    value={minStock}
                                    onChange={e => setMinStock(e.target.value)}
                                    className="w-full h-20 bg-slate-50 dark:bg-slate-900 border-4 border-slate-100 dark:border-slate-800 rounded-2xl text-3xl font-black italic text-rose-500 text-center outline-none"
                                    placeholder="5"
                                />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-2">Vencimiento</label>
                                <input
                                    type="date"
                                    value={expirationDate}
                                    onChange={e => setExpirationDate(e.target.value)}
                                    className="w-full h-20 bg-slate-50 dark:bg-slate-900 border-4 border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-black uppercase italic tracking-widest text-slate-900 dark:text-white text-center outline-none cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-10 bg-slate-900 rounded-[40px] text-white flex justify-between items-center shadow-2xl">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Resumen de Operación</span>
                            <div className="mt-2 flex items-center gap-3">
                                <div className="size-3 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50"></div>
                                <span className="text-sm font-black uppercase tracking-[0.2em] italic">Listo para despliegue en punto de venta</span>
                            </div>
                        </div>
                        <Button 
                            onClick={handleSubmit} 
                            disabled={loading}
                            className="h-20 px-16 bg-white hover:bg-slate-100 text-slate-900 rounded-[24px] font-black uppercase italic tracking-widest text-lg shadow-2xl transform active:scale-95 transition-all flex items-center gap-4"
                        >
                            <span className="material-symbols-outlined font-black text-2xl">rocket_launch</span>
                            Lanzar Producto
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
