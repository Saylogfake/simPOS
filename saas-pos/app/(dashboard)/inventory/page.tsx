"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { AddProductModal } from "@/components/AddProductModal"
import { API_URL } from "@/lib/api"
import { EditProductModal } from "@/components/EditProductModal"
import { RestockModal } from "@/components/RestockModal"
import { DiscountModal } from "@/components/DiscountModal"
import { InventoryWasteModal } from "@/components/inventory/InventoryWasteModal"
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal"
import { Badge } from "@/components/ui/badge"
import { AddProductTab } from "@/components/inventory/AddProductTab"
import { CategoriesManager } from "@/components/inventory/CategoriesManager"
import { InventoryKardex } from "@/components/inventory/InventoryKardex"

type Product = {
    id: string
    name: string
    internalCode: string
    barcode: string
    price: number
    cost: number
    stock: number
    minStock: number
    discountPercentage: number
    saleType: string
    status: string
    imageUrl: string
    categoryId: string
    category: { name: string } | null
    isPriority: boolean
    trackStock: boolean
}

const formatMoney = (amount: number) => {
    return "₲ " + new Intl.NumberFormat('es-PY', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
}

function InventoryContent() {
    const searchParams = useSearchParams()
    const router = useRouter()

    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [activeTab, setActiveTab] = useState("stock")

    // Modals
    const [editProduct, setEditProduct] = useState<Product | null>(null)
    const [restockProduct, setRestockProduct] = useState<Product | null>(null)
    const [discountProduct, setDiscountProduct] = useState<Product | null>(null)
    const [wasteProduct, setWasteProduct] = useState<Product | null>(null)
    const [deleteProduct, setDeleteProduct] = useState<Product | null>(null)

    useEffect(() => {
        fetchProducts()
        const tabParam = searchParams.get("tab")
        if (tabParam) setActiveTab(tabParam)
    }, [searchParams])

    const fetchProducts = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem("token")
            const res = await fetch(`${API_URL}/api/products`, {
                headers: { "Authorization": `Bearer ${token}` }
            })
            const data = await res.json()
            setProducts(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleTabChange = (value: string) => {
        setActiveTab(value)
        router.push(`/inventory?tab=${value}`)
    }

    const handleTogglePriority = async (product: Product) => {
        try {
            const token = localStorage.getItem("token")
            const res = await fetch(`${API_URL}/api/products/${product.id}/priority`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ isPriority: !product.isPriority })
            })
            if (res.ok) fetchProducts()
        } catch (e) { console.error(e) }
    }

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             p.barcode?.includes(searchTerm) || 
                             p.internalCode?.includes(searchTerm)
        if (!matchesSearch) return false
        if (activeTab === "offers") return p.discountPercentage > 0
        if (activeTab === "missing") return p.stock <= p.minStock
        return true
    })

    const stats = {
        total: products.length,
        lowStock: products.filter(p => p.stock <= p.minStock).length,
        value: products.reduce((acc, p) => acc + (p.price * p.stock), 0),
        discounted: products.filter(p => p.discountPercentage > 0).length
    }

    return (
        <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 p-4 md:p-8 pt-4">
            <header className="flex flex-col gap-2 mb-6">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight">Gestión de Inventario</h1>
                <p className="text-slate-500 dark:text-slate-400">Control total sobre existencias, precios y categorías.</p>
            </header>

            {/* Tabs Navigation */}
            <div className="flex gap-4 md:gap-8 border-b border-slate-200 dark:border-slate-800 mb-6 overflow-x-auto no-scrollbar">
                {["stock", "add", "offers", "categories", "missing", "kardex"].map(tab => (
                    <button
                        key={tab}
                        onClick={() => handleTabChange(tab)}
                        className={`pb-3 pt-2 text-xs md:text-sm font-bold tracking-wide transition-all border-b-2 whitespace-nowrap ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"}`}
                    >
                        {tab === "stock" && "Stock"}
                        {tab === "add" && "Agregar"}
                        {tab === "offers" && "Ofertas"}
                        {tab === "categories" && "Categorías"}
                        {tab === "missing" && "Faltantes"}
                        {tab === "kardex" && "Kardex"}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center py-20">
                    <span className="material-symbols-outlined animate-spin text-4xl text-primary">sync</span>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {activeTab === "stock" || activeTab === "offers" || activeTab === "missing" ? (
                        <>
                            {/* Toolbar */}
                            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-3">
                                <div className="relative flex-1 min-w-0 h-12 shadow-sm">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                                    <input 
                                        className="w-full h-full pl-12 pr-4 bg-white dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary text-base"
                                        placeholder="Buscar por nombre, código o categoría..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">
                                        <span className="material-symbols-outlined text-lg">filter_list</span>
                                        <span className="hidden sm:inline">Filtros</span>
                                    </button>
                                    <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                                        <span className="material-symbols-outlined text-lg">download</span>
                                        <span className="hidden sm:inline">Exportar</span>
                                    </button>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                                <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Producto</th>
                                                <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell">Código</th>
                                                <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:table-cell">Categoría</th>
                                                <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Precio</th>
                                                <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:table-cell">Stock</th>
                                                <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {filteredProducts.map(product => (
                                                <tr key={product.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                                    <td className="px-3 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="size-8 shrink-0 rounded-lg bg-primary/5 flex items-center justify-center text-primary overflow-hidden">
                                                                {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-base">package_2</span>}
                                                            </div>
                                                            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate max-w-[120px] sm:max-w-[180px]">{product.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 text-slate-400 font-mono text-xs hidden md:table-cell">{product.internalCode || product.barcode || '-'}</td>
                                                    <td className="px-3 py-3 hidden sm:table-cell">
                                                        <span className="px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-tighter whitespace-nowrap">
                                                            {product.category?.name || 'Gral'}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3 whitespace-nowrap">
                                                        <div className="flex flex-col">
                                                            {product.discountPercentage > 0 && <span className="text-[10px] line-through text-slate-400">{formatMoney(product.price)}</span>}
                                                            <span className="font-bold text-slate-900 dark:text-white text-sm">{formatMoney(product.price * (1 - product.discountPercentage/100))}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 hidden sm:table-cell">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-14 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                                                                <div 
                                                                    className={`h-full rounded-full ${!product.trackStock ? 'bg-sky-400' : product.stock <= product.minStock ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                                                                    style={{ width: !product.trackStock ? '100%' : `${Math.min(100, (product.stock / (product.minStock * 2)) * 100)}%` }}
                                                                ></div>
                                                            </div>
                                                            <span className={`text-xs font-black ${!product.trackStock ? 'text-sky-500' : product.stock <= product.minStock ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                                {!product.trackStock ? '∞' : product.stock}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 text-right">
                                                        <div className="flex justify-end gap-0.5">
                                                            <button onClick={() => handleTogglePriority(product)} className={`p-1.5 rounded-lg transition-colors ${product.isPriority ? 'text-amber-500 bg-amber-50' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'}`}>
                                                                <span className="material-symbols-outlined text-base" style={{fontVariationSettings: product.isPriority ? "'FILL' 1" : "'FILL' 0"}}>star</span>
                                                            </button>
                                                            <button onClick={() => setRestockProduct(product)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors">
                                                                <span className="material-symbols-outlined text-base">add_circle</span>
                                                            </button>
                                                            <button onClick={() => setDiscountProduct(product)} className="p-1.5 text-slate-400 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-colors">
                                                                <span className="material-symbols-outlined text-base">loyalty</span>
                                                            </button>
                                                            <button onClick={() => setEditProduct(product)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors">
                                                                <span className="material-symbols-outlined text-base">edit</span>
                                                            </button>
                                                            <button onClick={() => setWasteProduct(product)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                                                                <span className="material-symbols-outlined text-base">warning</span>
                                                            </button>
                                                            <button onClick={() => setDeleteProduct(product)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                                <span className="material-symbols-outlined text-base">delete</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Stats Summary */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4 shadow-sm">
                                    <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                        <span className="material-symbols-outlined">inventory_2</span>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Productos</p>
                                        <p className="text-2xl font-black text-slate-900 dark:text-white uppercase italic leading-none">{stats.total}</p>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4 shadow-sm">
                                    <div className="size-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                                        <span className="material-symbols-outlined">low_priority</span>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock Crítico</p>
                                        <p className="text-2xl font-black text-rose-600 uppercase italic leading-none">{stats.lowStock}</p>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4 shadow-sm">
                                    <div className="size-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                        <span className="material-symbols-outlined">payments</span>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Stock</p>
                                        <p className="text-2xl font-black text-emerald-600 uppercase italic leading-none">{formatMoney(stats.value)}</p>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4 shadow-sm">
                                    <div className="size-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                                        <span className="material-symbols-outlined">auto_awesome</span>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">En Oferta</p>
                                        <p className="text-2xl font-black text-purple-600 uppercase italic leading-none">{stats.discounted}</p>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                            {activeTab === "add" && <AddProductTab onSuccess={() => handleTabChange("stock")} />}
                            {activeTab === "categories" && <CategoriesManager />}
                            {activeTab === "kardex" && <InventoryKardex />}
                        </div>
                    )}
                </div>
            )}

            {/* Modals */}
            {editProduct && <EditProductModal isOpen={!!editProduct} product={editProduct} onClose={() => setEditProduct(null)} onSuccess={() => { fetchProducts(); setEditProduct(null); }} />}
            {restockProduct && <RestockModal isOpen={!!restockProduct} product={restockProduct} onClose={() => setRestockProduct(null)} onSuccess={() => { fetchProducts(); setRestockProduct(null); }} />}
            {discountProduct && <DiscountModal isOpen={!!discountProduct} product={discountProduct} onClose={() => setDiscountProduct(null)} onSuccess={() => { fetchProducts(); setDiscountProduct(null); }} />}
            {wasteProduct && <InventoryWasteModal isOpen={!!wasteProduct} product={wasteProduct} onClose={() => setWasteProduct(null)} onSuccess={() => { fetchProducts(); setWasteProduct(null); }} />}
            {deleteProduct && (
                <DeleteConfirmationModal
                    isOpen={!!deleteProduct}
                    productName={deleteProduct.name}
                    onClose={() => setDeleteProduct(null)}
                    onConfirm={async () => {
                        try {
                            const token = localStorage.getItem("token")
                            const res = await fetch(`${API_URL}/api/products/${deleteProduct.id}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${token}` }
                            })
                            if (res.ok) { fetchProducts(); setDeleteProduct(null); }
                        } catch (e) { console.error(e) }
                    }}
                />
            )}
        </div>
    )
}

export default function InventoryPage() {
    return (
        <Suspense fallback={
            <div className="flex-1 flex items-center justify-center py-20 bg-background-light dark:bg-background-dark min-h-screen">
                <span className="material-symbols-outlined animate-spin text-4xl text-primary">sync</span>
            </div>
        }>
            <InventoryContent />
        </Suspense>
    )
}
