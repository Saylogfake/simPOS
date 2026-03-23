"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { WeightInputModal } from "@/components/WeightInputModal"
import { ReturnModal } from "@/components/pos/ReturnModal"
import { QuickWasteModal } from "@/components/pos/QuickWasteModal"
import { OpenCashModal } from "@/components/cash/OpenCashModal"
import { CloseCashWizard } from "@/components/cash/CloseCashWizard"
import { CashMovementsModal } from "@/components/cash/CashMovementsModal"
import CheckoutModal from "@/components/pos/CheckoutModal"
import { API_URL } from "@/lib/api"

type Customer = {
    id: string
    name: string
    email: string
    phone: string
    documentId?: string
}

type Product = {
    id: string
    name: string
    price: string | number
    imageUrl: string | null
    categoryId: string
    category: { id: string; name: string } | null
    saleType: "UNIT" | "WEIGHT"
    internalCode: string | null
    barcode: string | null
    stock: number
    discountPercentage: number
    wholesalePrice?: number
    wholesaleMinQty?: number
    trackStock: boolean
}

type Category = {
    id: string
    name: string
}

type CartItem = {
    product: Product
    quantity: number
    price: number
    saleItemId?: string
}

const formatMoney = (amount: number) => {
    return "₲ " + new Intl.NumberFormat('es-PY', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
}

export default function POSClient() {
    const router = useRouter()
    const [cart, setCart] = useState<CartItem[]>([])
    const [loading, setLoading] = useState(false)
    const [activeCategory, setActiveCategory] = useState("all")
    const [currentSaleId, setCurrentSaleId] = useState<string | null>(null)
    const [weightModalOpen, setWeightModalOpen] = useState(false)
    const [selectedWeightProduct, setSelectedWeightProduct] = useState<Product | null>(null)
    const [manualInput, setManualInput] = useState("")
    const [pendingMultiplier, setPendingMultiplier] = useState(1)
    const manualInputRef = useRef<HTMLInputElement>(null)
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
    const [customerSearch, setCustomerSearch] = useState("")
    const [showCustomerResults, setShowCustomerResults] = useState(false)
    const [customers, setCustomers] = useState<Customer[]>([])
    // Nuevo cliente desde POS
    const [newCustomerOpen, setNewCustomerOpen] = useState(false)
    const [newCustomerForm, setNewCustomerForm] = useState({ name: "", documentId: "", phone: "", email: "", birthDate: "" })
    const [newCustomerErrors, setNewCustomerErrors] = useState<{ name?: string; documentId?: string; email?: string }>({})
    const [savingCustomer, setSavingCustomer] = useState(false)
    const [products, setProducts] = useState<Product[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [checkoutOpen, setCheckoutOpen] = useState(false)
    const [returnModalOpen, setReturnModalOpen] = useState(false)
    const [wasteModalOpen, setWasteModalOpen] = useState(false)
    const [withdrawModalOpen, setWithdrawModalOpen] = useState(false)
    const [closeCashOpen, setCloseCashOpen] = useState(false)
    const [registerId, setRegisterId] = useState<string>("")
    const [cashOpen, setCashOpen] = useState<boolean>(false)
    const [showCashModal, setShowCashModal] = useState(false)
    const [mobileView, setMobileView] = useState<'products' | 'cart'>('products')

    useEffect(() => {
        const checkStatus = async () => {
            const token = localStorage.getItem("token")
            if (!token) return

            try {
                const [cashRes, custRes, productsRes, categoriesRes] = await Promise.all([
                    fetch(`${API_URL}/api/cash/status`, { headers: { "Authorization": `Bearer ${token}` } }),
                    fetch(`${API_URL}/api/customers`, { headers: { "Authorization": `Bearer ${token}` } }),
                    fetch(`${API_URL}/api/products`, { headers: { "Authorization": `Bearer ${token}` } }),
                    fetch(`${API_URL}/api/products/categories`, { headers: { "Authorization": `Bearer ${token}` } }),
                ])

                if (cashRes.ok) {
                    const data = await cashRes.json()
                    if (data.isOpen) { setCashOpen(true); setRegisterId(data.register.id) }
                    else setCashOpen(false)
                }
                if (custRes.ok) setCustomers(await custRes.json())
                if (productsRes.ok) setProducts(await productsRes.json())
                if (categoriesRes.ok) setCategories(await categoriesRes.json())

                const savedSaleId = localStorage.getItem("pos_sale_id")
                const lastActive = localStorage.getItem("pos_last_active")
                if (savedSaleId && lastActive) {
                    const diff = Date.now() - parseInt(lastActive)
                    if (diff < 600000) {
                        const res = await fetch(`${API_URL}/api/sales/${savedSaleId}`, {
                            headers: { "Authorization": `Bearer ${token}` }
                        })
                        if (res.ok) {
                            const data = await res.json()
                            if (data.status === "OPEN") {
                                setCurrentSaleId(savedSaleId)
                                const restoredCart: CartItem[] = data.items.map((item: any) => {
                                    const product = products.find(p => p.id === item.productId)
                                    if (!product) return null
                                    return { product, quantity: item.quantity, price: item.price, saleItemId: item.id }
                                }).filter(Boolean)
                                setCart(restoredCart)
                            }
                        }
                    } else {
                        localStorage.removeItem("pos_sale_id")
                        localStorage.removeItem("pos_last_active")
                    }
                }
            } catch (e) {
                console.error(e)
            }
        }
        checkStatus()
    }, [])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "F2") { e.preventDefault(); handleCheckout(); }
            if (e.key === "F9") { e.preventDefault(); setReturnModalOpen(true); }
            if (e.key === "F10") { e.preventDefault(); setWasteModalOpen(true); }
            if (e.key === "F4") { e.preventDefault(); setWithdrawModalOpen(true); }
            if (e.key === "F12") { e.preventDefault(); setCloseCashOpen(true); }
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [cart])

    const calculateFinalPrice = (product: Product, quantity: number) => {
        let price = Number(product.price)
        if (product.wholesaleMinQty && product.wholesaleMinQty > 0 && quantity >= product.wholesaleMinQty) {
            price = Number(product.wholesalePrice)
        }
        if (product.discountPercentage > 0) {
            return price * (1 - product.discountPercentage / 100)
        }
        return price
    }

    const getOrCreateSaleId = async (): Promise<string> => {
        if (currentSaleId) return currentSaleId
        const token = localStorage.getItem("token")
        const res = await fetch(`${API_URL}/api/sales`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ customerId: selectedCustomer?.id || null })
        })
        const data = await res.json()
        setCurrentSaleId(data.sale_id)
        localStorage.setItem("pos_sale_id", data.sale_id)
        localStorage.setItem("pos_last_active", Date.now().toString())
        return data.sale_id
    }

    const processAddToCart = async (product: Product, quantity: number = 1) => {
        const currentInCart = cart.find(i => i.product.id === product.id)?.quantity || 0
        if (product.trackStock && product.stock < (currentInCart + quantity)) {
            alert(`Stock insuficiente. Disponible: ${product.stock}`)
            return
        }

        setLoading(true)
        try {
            const saleId = await getOrCreateSaleId()
            const finalPrice = calculateFinalPrice(product, quantity)
            const token = localStorage.getItem("token")
            const res = await fetch(`${API_URL}/api/sales/${saleId}/items`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ productId: product.id, quantity })
            })

            if (res.ok) {
                const data = await res.json()
                setCart(prev => [...prev, { product, quantity, price: finalPrice, saleItemId: data.itemId }])
                localStorage.setItem("pos_last_active", Date.now().toString())
                setManualInput("")
                setPendingMultiplier(1)
            }
        } catch (e) {
            alert("Error al agregar producto")
        } finally {
            setLoading(false)
            manualInputRef.current?.focus()
        }
    }
    const initiateAddToCart = (product: Product) => {
        let quantity = pendingMultiplier
        if (manualInput.startsWith("*")) {
            const manualQty = parseFloat(manualInput.substring(1))
            if (!isNaN(manualQty) && manualQty > 0) quantity = manualQty
        }

        if (product.saleType === "WEIGHT") {
            setSelectedWeightProduct(product)
            setWeightModalOpen(true)
        } else {
            processAddToCart(product, quantity)
        }
    }

    const removeFromCart = async (saleItemId: string | undefined) => {
        if (!currentSaleId || !saleItemId) return
        setLoading(true)
        try {
            const token = localStorage.getItem("token")
            await fetch(`${API_URL}/api/sales/${currentSaleId}/items/${saleItemId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            setCart(prev => prev.filter(item => item.saleItemId !== saleItemId))
        } catch (e) { alert("Error al eliminar item") }
        finally { setLoading(false); manualInputRef.current?.focus(); }
    }

    const cancelTicket = async () => {
        if (!currentSaleId || !confirm("¿Seguro que deseas cancelar?")) return
        setLoading(true)
        try {
            const token = localStorage.getItem("token")
            await fetch(`${API_URL}/api/sales/${currentSaleId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            setCart([])
            setCurrentSaleId(null)
            localStorage.removeItem("pos_sale_id")
        } catch (e) { alert("Error") }
        finally { setLoading(false) }
    }

    const handleManualInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            const input = manualInput.trim()
            if (input.startsWith("*")) {
                const qty = parseFloat(input.substring(1))
                if (!isNaN(qty)) { setPendingMultiplier(qty); setManualInput(""); return; }
            }
            const product = products.find(p => p.barcode === input || p.internalCode === input)
            if (product) initiateAddToCart(product)
            else if (filteredProducts.length === 1) initiateAddToCart(filteredProducts[0])
        }
    }

    const handleCheckout = () => {
        if (cart.length > 0) setCheckoutOpen(true)
    }

    const filteredProducts = products.filter(p => {
        const matchesCategory = activeCategory === "all" || p.categoryId === activeCategory
        if (!manualInput || manualInput.startsWith("*")) return matchesCategory
        const term = manualInput.toLowerCase()
        return matchesCategory && (p.name.toLowerCase().includes(term) || p.barcode?.includes(term) || p.internalCode?.includes(term))
    })

    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)

    const handleCreateCustomer = async () => {
        const errors: { name?: string; documentId?: string; email?: string } = {}
        if (!newCustomerForm.name.trim()) errors.name = "El nombre es obligatorio"
        else if (newCustomerForm.name.trim().length < 2) errors.name = "Mínimo 2 caracteres"
        if (!newCustomerForm.documentId.trim()) errors.documentId = "La cédula/RUC es obligatoria"
        if (newCustomerForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCustomerForm.email)) errors.email = "Email no válido"
        if (Object.keys(errors).length > 0) { setNewCustomerErrors(errors); return }
        setNewCustomerErrors({})
        setSavingCustomer(true)
        try {
            const token = localStorage.getItem("token")
            const res = await fetch(`${API_URL}/api/customers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    name: newCustomerForm.name.trim(),
                    documentId: newCustomerForm.documentId.trim(),
                    phone: newCustomerForm.phone || null,
                    email: newCustomerForm.email || null,
                    birthDate: newCustomerForm.birthDate ? new Date(newCustomerForm.birthDate).toISOString() : null
                })
            })
            if (res.ok) {
                const created = await res.json()
                const custRes = await fetch(`${API_URL}/api/customers`, { headers: { "Authorization": `Bearer ${token}` } })
                if (custRes.ok) setCustomers(await custRes.json())
                setSelectedCustomer(created)
                setNewCustomerOpen(false)
                setShowCustomerResults(false)
                setNewCustomerForm({ name: "", documentId: "", phone: "", email: "", birthDate: "" })
                setNewCustomerErrors({})
            } else {
                const err = await res.json().catch(() => ({ message: "Error al crear cliente" }))
                if (err.message?.includes("cédula")) setNewCustomerErrors({ documentId: err.message })
                else if (err.message?.includes("nombre")) setNewCustomerErrors({ name: err.message })
                else alert(err.message || "Error al crear cliente")
            }
        } catch (e) { alert("Error de conexión") }
        finally { setSavingCustomer(false) }
    }

    return (
        <div className="flex flex-col h-full overflow-hidden bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
            {!cashOpen && (
                <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-2xl text-center max-w-sm w-full">
                        <span className="material-symbols-outlined text-6xl text-primary mb-4">lock</span>
                        <h2 className="text-2xl font-bold mb-2">Caja Cerrada</h2>
                        <p className="text-slate-500 mb-6">Debes abrir la caja para poder operar el terminal de ventas.</p>
                        <button 
                            onClick={() => setShowCashModal(true)}
                            className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/30"
                        >
                            ABRIR CAJA
                        </button>
                    </div>
                </div>
            )}

            {/* Mobile tab switcher */}
            <div className="flex md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                <button
                    onClick={() => setMobileView('products')}
                    className={`flex-1 py-3 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${mobileView === 'products' ? 'text-primary border-b-2 border-primary' : 'text-slate-400'}`}
                >
                    <span className="material-symbols-outlined text-sm">grid_view</span>
                    Productos
                </button>
                <button
                    onClick={() => setMobileView('cart')}
                    className={`flex-1 py-3 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${mobileView === 'cart' ? 'text-primary border-b-2 border-primary' : 'text-slate-400'}`}
                >
                    <span className="material-symbols-outlined text-sm">shopping_basket</span>
                    Ticket {cart.length > 0 && <span className="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]">{cart.length}</span>}
                </button>
            </div>

            <main className="flex flex-1 overflow-hidden">
                <section className={`flex flex-col w-full md:w-[65%] min-h-0 border-r border-slate-200 dark:border-slate-800 ${mobileView === 'cart' ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 bg-white dark:bg-slate-900 space-y-4 shadow-sm z-10">
                        <div className="relative group">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
                            <input 
                                ref={manualInputRef}
                                className="w-full pl-12 pr-4 py-4 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-primary text-lg transition-all"
                                placeholder={pendingMultiplier > 1 ? `Cantidad fija: ${pendingMultiplier}x` : "Escanear o buscar producto..."}
                                value={manualInput}
                                onChange={(e) => setManualInput(e.target.value)}
                                onKeyDown={handleManualInput}
                                autoFocus
                            />
                            {pendingMultiplier > 1 && (
                                <button onClick={() => setPendingMultiplier(1)} className="absolute right-4 top-1/2 -translate-y-1/2 bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold animate-pulse">
                                    x{pendingMultiplier} | Limpiar
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                            <button 
                                onClick={() => setActiveCategory("all")}
                                className={`px-6 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${activeCategory === 'all' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}
                            >
                                Todos
                            </button>
                            {categories.map(cat => (
                                <button 
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className={`px-6 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${activeCategory === cat.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto p-2">
                        <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
                        {filteredProducts.map(product => {
                            const finalPrice = calculateFinalPrice(product, 1)
                            const hasDiscount = product.discountPercentage > 0
                            const outOfStock = product.trackStock && product.stock <= 0
                            return (
                                <button
                                    key={product.id}
                                    type="button"
                                    disabled={outOfStock}
                                    onClick={() => initiateAddToCart(product)}
                                    className={`relative flex flex-col w-full text-left bg-white dark:bg-slate-900 rounded-lg border overflow-hidden transition-all select-none
                                        ${outOfStock
                                            ? 'opacity-40 grayscale cursor-not-allowed border-slate-200 dark:border-slate-800'
                                            : 'border-slate-200 dark:border-slate-800 hover:border-primary active:scale-95 active:bg-primary/5 cursor-pointer'
                                        }`}
                                >
                                    {/* Image */}
                                    <img
                                        src={
                                            product.imageUrl && !product.imageUrl.includes('placehold')
                                                ? product.imageUrl
                                                : "https://png.pngtree.com/png-vector/20190927/ourlarge/pngtree-cancel-cart-product-icon-png-image_1736147.jpg"
                                        }
                                        alt={product.name}
                                        className="w-full aspect-square object-cover bg-slate-100 dark:bg-slate-800"
                                        onError={e => { (e.target as HTMLImageElement).src = "https://png.pngtree.com/png-vector/20190927/ourlarge/pngtree-cancel-cart-product-icon-png-image_1736147.jpg" }}
                                    />

                                    {hasDiscount && (
                                        <span className="absolute top-1 right-1 bg-red-500 text-white text-[8px] font-black px-1 py-0.5 rounded leading-none">
                                            -{product.discountPercentage}%
                                        </span>
                                    )}
                                    {product.saleType === "WEIGHT" && (
                                        <span className="absolute top-1 left-1 bg-amber-500 text-white text-[8px] font-black px-1 py-0.5 rounded leading-none">kg</span>
                                    )}

                                    <div className="p-1.5 flex flex-col gap-0.5">
                                        <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-200 leading-tight line-clamp-2">{product.name}</span>
                                        <span className="text-xs font-black text-primary leading-none">{formatMoney(finalPrice)}</span>
                                        <span className="text-[8px] text-slate-400 leading-none">
                                            {!product.trackStock ? '∞' : Number(product.stock).toFixed(product.saleType === "WEIGHT" ? 1 : 0)}
                                        </span>
                                    </div>
                                </button>
                            )
                        })}
                        </div>
                    </div>
                </section>

                <aside className={`w-full md:w-[35%] bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 ${mobileView === 'products' ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/30">
                        <div className="flex flex-col relative">
                            <h2 className="text-lg font-black flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">shopping_basket</span>
                                TICKET ACTUAL
                            </h2>
                            <button 
                                onClick={() => setShowCustomerResults(!showCustomerResults)}
                                className="text-xs font-bold text-slate-400 hover:text-primary mt-1 flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-xs">person</span>
                                {selectedCustomer ? selectedCustomer.name : 'Añadir Cliente'}
                            </button>
                            {showCustomerResults && (
                                <div className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                                    {!newCustomerOpen ? (
                                        <>
                                            <input
                                                autoFocus
                                                className="w-full px-3 py-2 text-sm border-b border-slate-200 dark:border-slate-700 bg-transparent outline-none"
                                                placeholder="Buscar por nombre, teléfono o cédula..."
                                                value={customerSearch}
                                                onChange={(e) => setCustomerSearch(e.target.value)}
                                            />
                                            <div className="max-h-48 overflow-y-auto">
                                                {selectedCustomer && (
                                                    <button
                                                        onClick={() => { setSelectedCustomer(null); setShowCustomerResults(false); setCustomerSearch(""); }}
                                                        className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold"
                                                    >
                                                        Quitar cliente
                                                    </button>
                                                )}
                                                {customers
                                                    .filter(c => !customerSearch || 
                                                        c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
                                                        c.phone?.includes(customerSearch) ||
                                                        c.documentId?.includes(customerSearch)
                                                    )
                                                    .map(c => (
                                                        <button
                                                            key={c.id}
                                                            onClick={() => { setSelectedCustomer(c); setShowCustomerResults(false); setCustomerSearch(""); }}
                                                            className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                                        >
                                                            <p className="text-sm font-bold">{c.name}</p>
                                                            <p className="text-xs text-slate-400">{c.documentId ? `CI: ${c.documentId}` : c.phone}</p>
                                                        </button>
                                                    ))
                                                }
                                                {customers.filter(c => !customerSearch || 
                                                    c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
                                                    c.phone?.includes(customerSearch) ||
                                                    c.documentId?.includes(customerSearch)
                                                ).length === 0 && (
                                                    <p className="px-3 py-2 text-xs text-slate-400">No se encontraron clientes</p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => setNewCustomerOpen(true)}
                                                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-black text-primary hover:bg-primary/5 border-t border-slate-100 dark:border-slate-700 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-sm">person_add</span>
                                                Nuevo Cliente
                                            </button>
                                        </>
                                    ) : (
                                        <div className="p-4 space-y-3">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Nuevo Cliente</span>
                                                <button onClick={() => { setNewCustomerOpen(false); setNewCustomerErrors({}) }} className="text-slate-400 hover:text-slate-600">
                                                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                                                </button>
                                            </div>
                                            <div className="space-y-2">
                                                <div>
                                                    <input
                                                        autoFocus
                                                        className={`w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg outline-none focus:border-primary ${newCustomerErrors.documentId ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'}`}
                                                        placeholder="Cédula / RUC *"
                                                        value={newCustomerForm.documentId}
                                                        onChange={e => { setNewCustomerForm(f => ({ ...f, documentId: e.target.value })); setNewCustomerErrors(p => ({ ...p, documentId: undefined })) }}
                                                    />
                                                    {newCustomerErrors.documentId && <p className="text-[10px] text-rose-500 mt-0.5 px-1">{newCustomerErrors.documentId}</p>}
                                                </div>
                                                <div>
                                                    <input
                                                        className={`w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg outline-none focus:border-primary ${newCustomerErrors.name ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'}`}
                                                        placeholder="Nombre completo *"
                                                        value={newCustomerForm.name}
                                                        onChange={e => { setNewCustomerForm(f => ({ ...f, name: e.target.value })); setNewCustomerErrors(p => ({ ...p, name: undefined })) }}
                                                    />
                                                    {newCustomerErrors.name && <p className="text-[10px] text-rose-500 mt-0.5 px-1">{newCustomerErrors.name}</p>}
                                                </div>
                                                <input
                                                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary"
                                                    placeholder="Teléfono"
                                                    value={newCustomerForm.phone}
                                                    onChange={e => setNewCustomerForm(f => ({ ...f, phone: e.target.value }))}
                                                />
                                                <div>
                                                    <input
                                                        type="email"
                                                        className={`w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg outline-none focus:border-primary ${newCustomerErrors.email ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'}`}
                                                        placeholder="Correo electrónico"
                                                        value={newCustomerForm.email}
                                                        onChange={e => { setNewCustomerForm(f => ({ ...f, email: e.target.value })); setNewCustomerErrors(p => ({ ...p, email: undefined })) }}
                                                    />
                                                    {newCustomerErrors.email && <p className="text-[10px] text-rose-500 mt-0.5 px-1">{newCustomerErrors.email}</p>}
                                                </div>
                                                <div className="space-y-0.5">
                                                    <label className="text-[9px] font-bold text-slate-400 uppercase px-1">Fecha de nacimiento (opcional)</label>
                                                    <input
                                                        type="date"
                                                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary"
                                                        value={newCustomerForm.birthDate}
                                                        onChange={e => setNewCustomerForm(f => ({ ...f, birthDate: e.target.value }))}
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleCreateCustomer}
                                                disabled={savingCustomer}
                                                className="w-full py-2.5 bg-primary text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {savingCustomer
                                                    ? <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                                                    : <span className="material-symbols-outlined text-sm">save</span>
                                                }
                                                Guardar Cliente
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <span className="bg-primary text-white px-3 py-1 rounded-full text-xs font-black italic">{cart.length} ITEMS</span>
                    </div>

                    <div className="flex-1 overflow-y-auto px-2">
                        {cart.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full opacity-20">
                                <span className="material-symbols-outlined text-8xl">shopping_cart</span>
                                <p className="font-bold text-xl uppercase italic">Ticket Vacío</p>
                            </div>
                        )}
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {cart.map((item, idx) => (
                                <div key={item.saleItemId || idx} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-between group rounded-xl transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white font-black text-xs">
                                            {Number(item.quantity).toFixed(item.product.saleType === 'WEIGHT' ? 2 : 0)}
                                        </div>
                                        <div className="flex flex-col max-w-[120px]">
                                            <p className="font-bold text-xs truncate uppercase leading-none mb-1">{item.product.name}</p>
                                            <p className="text-[10px] text-slate-400 font-bold">{formatMoney(item.price)} ea</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <p className="font-black text-sm text-primary">{formatMoney(item.price * item.quantity)}</p>
                                        <button 
                                            onClick={() => removeFromCart(item.saleItemId)}
                                            className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <span className="material-symbols-outlined text-xl">delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 space-y-4 shadow-inner">
                        <div className="space-y-2">
                            <div className="flex justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                                <span>Subtotal</span>
                                <span>{formatMoney(total)}</span>
                            </div>
                            <div className="flex justify-between text-slate-900 dark:text-white text-3xl font-black italic pt-2 border-t border-slate-200 dark:border-slate-700">
                                <span>TOTAL</span>
                                <span>{formatMoney(total)}</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 pt-2">
                            <button 
                                onClick={handleCheckout}
                                disabled={loading || cart.length === 0}
                                className="w-full py-5 bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-xl shadow-primary/30 flex flex-col items-center justify-center transition-all transform active:scale-[0.98] disabled:opacity-50"
                            >
                                <span className="text-2xl font-black uppercase tracking-widest italic leading-none">COBRAR (F2)</span>
                                <span className="text-[10px] opacity-70 font-bold mt-1 uppercase">Efectivo / Tarjeta / Otros</span>
                            </button>
                            <button 
                                onClick={cancelTicket}
                                className="w-full py-3 border-2 border-red-500/10 hover:bg-red-500/5 text-red-500 rounded-xl flex items-center justify-center gap-2 font-black text-xs uppercase transition-all"
                            >
                                <span className="material-symbols-outlined text-sm">block</span>
                                Cancelar Ticket
                            </button>
                        </div>
                    </div>
                </aside>
            </main>

            <footer className="bg-slate-900 text-white flex items-center px-3 md:px-6 justify-between shrink-0 border-t border-slate-800 shadow-2xl z-20 overflow-x-auto h-14">
                <div className="flex items-center gap-4 md:gap-8 min-w-max">
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setReturnModalOpen(true)}>
                        <kbd className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-black text-slate-400 group-hover:bg-primary group-hover:text-white transition-all">F9</kbd>
                        <span className="text-[10px] text-slate-500 font-black uppercase group-hover:text-slate-300 transition-colors">Devoluciones</span>
                    </div>
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setWasteModalOpen(true)}>
                        <kbd className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-black text-slate-400 group-hover:bg-primary group-hover:text-white transition-all">F10</kbd>
                        <span className="text-[10px] text-slate-500 font-black uppercase group-hover:text-slate-300 transition-colors">Merma</span>
                    </div>
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setWithdrawModalOpen(true)}>
                        <kbd className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-black text-slate-400 group-hover:bg-primary group-hover:text-white transition-all">F4</kbd>
                        <span className="text-[10px] text-slate-500 font-black uppercase group-hover:text-slate-300 transition-colors">Retiro</span>
                    </div>
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setCloseCashOpen(true)}>
                        <kbd className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-black text-slate-400 group-hover:bg-primary group-hover:text-white transition-all">F12</kbd>
                        <span className="text-[10px] text-slate-500 font-black uppercase group-hover:text-slate-300 transition-colors">Cerrar Caja</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className={`size-2 rounded-full animate-pulse ${cashOpen ? 'bg-green-400' : 'bg-red-500'}`}></span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{cashOpen ? 'En Línea' : 'Cerrado'}</span>
                    </div>
                    <div className="h-4 w-px bg-slate-800"></div>
                    <div className="text-[10px] font-bold font-mono text-slate-600">
                        v2.1.0-Retail
                    </div>
                </div>
            </footer>

            <CheckoutModal
                isOpen={checkoutOpen}
                onClose={() => setCheckoutOpen(false)}
                saleId={currentSaleId}
                total={total}
                onSuccess={() => {
                    setCart([]); setCurrentSaleId(null); setSelectedCustomer(null);
                    localStorage.removeItem("pos_sale_id");
                    router.refresh();
                }}
                customerId={selectedCustomer?.id || null}
                customerName={selectedCustomer?.name || null}
                registerId={registerId}
            />
            <WeightInputModal
                isOpen={weightModalOpen}
                onClose={() => setWeightModalOpen(false)}
                onConfirm={(weight) => selectedWeightProduct && processAddToCart(selectedWeightProduct, weight)}
                productName={selectedWeightProduct?.name || ""}
                pricePerKg={Number(selectedWeightProduct?.price || 0)}
            />
            <ReturnModal isOpen={returnModalOpen} onClose={() => setReturnModalOpen(false)} onSuccess={() => router.refresh()} />
            <QuickWasteModal isOpen={wasteModalOpen} onClose={() => setWasteModalOpen(false)} onSuccess={() => router.refresh()} />
            <OpenCashModal isOpen={showCashModal} onClose={() => setShowCashModal(false)} onOpenSuccess={(id) => { setCashOpen(true); setRegisterId(id); }} />
            <CashMovementsModal isOpen={withdrawModalOpen} onClose={() => setWithdrawModalOpen(false)} type="EGRESO" registerId={registerId} onSuccess={() => {}} />
            <CloseCashWizard isOpen={closeCashOpen} onClose={() => setCloseCashOpen(false)} registerId={registerId} onSuccess={() => window.location.reload()} />
        </div>
    )
}
