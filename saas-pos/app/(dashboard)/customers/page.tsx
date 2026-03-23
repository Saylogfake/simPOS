"use client"

import { useState, useEffect } from "react"
import { CustomerDetailsModal } from "@/components/customers/CustomerDetailsModal"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { API_URL } from "@/lib/api"

type Customer = {
    id: string
    name: string
    email: string
    phone: string
    documentId?: string
    balance: number
}

const formatMoney = (amount: number) => {
    return "₲ " + new Intl.NumberFormat('es-PY', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
    const [detailsOpen, setDetailsOpen] = useState(false)
    const [newCustomerOpen, setNewCustomerOpen] = useState(false)
    const [newCustomer, setNewCustomer] = useState({ name: "", documentId: "", email: "", phone: "", birthDate: "" })
    const [customerErrors, setCustomerErrors] = useState<{ name?: string; documentId?: string; email?: string }>({})
    const [savingCustomer, setSavingCustomer] = useState(false)

    useEffect(() => {
        fetchCustomers()
    }, [])

    const fetchCustomers = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem("token")
            const res = await fetch(`${API_URL}/api/customers`, {
                headers: { "Authorization": `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setCustomers(data)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateCustomer = async () => {
        const errors: { name?: string; documentId?: string; email?: string } = {}
        if (!newCustomer.name.trim()) errors.name = "El nombre es obligatorio"
        else if (newCustomer.name.trim().length < 2) errors.name = "Mínimo 2 caracteres"
        if (!newCustomer.documentId.trim()) errors.documentId = "La cédula/RUC es obligatoria"
        if (newCustomer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCustomer.email)) errors.email = "Email no válido"
        if (Object.keys(errors).length > 0) { setCustomerErrors(errors); return }
        setCustomerErrors({})
        setSavingCustomer(true)
        try {
            const token = localStorage.getItem("token")
            const res = await fetch(`${API_URL}/api/customers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    name: newCustomer.name.trim(),
                    documentId: newCustomer.documentId.trim(),
                    phone: newCustomer.phone || null,
                    email: newCustomer.email || null,
                    birthDate: newCustomer.birthDate ? new Date(newCustomer.birthDate).toISOString() : null
                })
            })
            if (res.ok) {
                setNewCustomer({ name: "", documentId: "", email: "", phone: "", birthDate: "" })
                setCustomerErrors({})
                setNewCustomerOpen(false)
                fetchCustomers()
            } else {
                const err = await res.json().catch(() => ({ message: "Error" }))
                if (err.message?.includes("cédula")) setCustomerErrors({ documentId: err.message })
                else if (err.message?.includes("nombre")) setCustomerErrors({ name: err.message })
                else alert(err.message || "Error al crear cliente")
            }
        } catch (e) { console.error(e) }
        finally { setSavingCustomer(false) }
    }

    const filteredCustomers = customers.filter(c => {
        const q = search.toLowerCase()
        return (
            c.name.toLowerCase().includes(q) ||
            c.phone?.includes(search) ||
            c.email?.toLowerCase().includes(q) ||
            c.documentId?.includes(search)
        )
    })

    const stats = {
        total: customers.length,
        withDebt: customers.filter(c => c.balance > 0).length,
        totalBalance: customers.reduce((acc, c) => acc + (c.balance || 0), 0)
    }

    return (
        <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 p-4 md:p-8 pt-4">
            <header className="flex flex-col gap-2 mb-6">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight">Gestión de Clientes</h1>
                <p className="text-slate-500 dark:text-slate-400">Administra tu base de datos de clientes, saldos y cuentas corrientes.</p>
            </header>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-3 mb-6">
                <div className="relative flex-1 min-w-0 h-12 shadow-sm">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                    <input 
                        className="w-full h-full pl-12 pr-4 bg-white dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary text-base"
                        placeholder="Buscar por nombre, cédula, teléfono o email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <button 
                    onClick={() => setNewCustomerOpen(true)}
                    className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                    <span className="material-symbols-outlined text-lg">person_add</span>
                    Nuevo Cliente
                </button>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center py-20">
                    <span className="material-symbols-outlined animate-spin text-4xl text-primary">sync</span>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {/* Table Area */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre Completo</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contacto</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Deudor</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredCustomers.map(customer => (
                                        <tr key={customer.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black uppercase italic text-xs">
                                                        {customer.name.substring(0,2)}
                                                    </div>
                                                    <div className="font-bold text-slate-900 dark:text-slate-100">{customer.name}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400 font-medium text-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-sm opacity-50">call</span>
                                                    {customer.phone || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400 font-medium text-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-sm opacity-50">mail</span>
                                                    {customer.email || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`font-black text-sm italic ${customer.balance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                    {formatMoney(customer.balance || 0)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <button 
                                                    onClick={() => { setSelectedCustomer(customer); setDetailsOpen(true); }}
                                                    className="inline-flex items-center gap-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-black uppercase tracking-tighter hover:bg-primary hover:text-white transition-all shadow-sm"
                                                >
                                                    <span className="material-symbols-outlined text-sm">visibility</span>
                                                    Detalles
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredCustomers.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-12 text-center">
                                                <div className="flex flex-col items-center opacity-20">
                                                    <span className="material-symbols-outlined text-6xl">group_off</span>
                                                    <p className="font-bold text-lg uppercase italic mt-2">No se encontraron clientes</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Stats Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4 shadow-sm">
                            <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                <span className="material-symbols-outlined">groups</span>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clientes Totales</p>
                                <p className="text-2xl font-black text-slate-900 dark:text-white uppercase italic leading-none">{stats.total}</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4 shadow-sm">
                            <div className="size-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                                <span className="material-symbols-outlined">account_balance_wallet</span>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clientes con Deuda</p>
                                <p className="text-2xl font-black text-rose-600 uppercase italic leading-none">{stats.withDebt}</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4 shadow-sm">
                            <div className="size-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                <span className="material-symbols-outlined">savings</span>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Deuda Acumulada</p>
                                <p className="text-2xl font-black text-emerald-600 uppercase italic leading-none">{formatMoney(stats.totalBalance)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            <CustomerDetailsModal
                customer={selectedCustomer}
                isOpen={detailsOpen}
                onClose={() => setDetailsOpen(false)}
                onUpdate={fetchCustomers}
            />

            {newCustomerOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black italic tracking-tight uppercase">Nuevo Cliente</h2>
                            <button onClick={() => { setNewCustomerOpen(false); setCustomerErrors({}) }} className="text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Cédula / RUC <span className="text-rose-500">*</span></label>
                                <input 
                                    className={`w-full p-4 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:ring-2 focus:ring-primary font-mono ${customerErrors.documentId ? 'border-rose-500 focus:ring-rose-500' : 'border-transparent'}`}
                                    placeholder="Ej: 1234567"
                                    value={newCustomer.documentId}
                                    onChange={e => { setNewCustomer({ ...newCustomer, documentId: e.target.value }); setCustomerErrors(p => ({ ...p, documentId: undefined })) }}
                                />
                                {customerErrors.documentId && <p className="text-xs text-rose-500 ml-1">{customerErrors.documentId}</p>}
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nombre Completo <span className="text-rose-500">*</span></label>
                                <input 
                                    className={`w-full p-4 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:ring-2 focus:ring-primary ${customerErrors.name ? 'border-rose-500 focus:ring-rose-500' : 'border-transparent'}`}
                                    placeholder="Juan Pérez"
                                    value={newCustomer.name}
                                    onChange={e => { setNewCustomer({ ...newCustomer, name: e.target.value }); setCustomerErrors(p => ({ ...p, name: undefined })) }}
                                />
                                {customerErrors.name && <p className="text-xs text-rose-500 ml-1">{customerErrors.name}</p>}
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Teléfono</label>
                                <input 
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-transparent rounded-xl focus:ring-2 focus:ring-primary"
                                    placeholder="+595 9xx xxx xxx"
                                    value={newCustomer.phone}
                                    onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Email</label>
                                <input 
                                    className={`w-full p-4 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:ring-2 focus:ring-primary ${customerErrors.email ? 'border-rose-500 focus:ring-rose-500' : 'border-transparent'}`}
                                    placeholder="correo@ejemplo.com"
                                    type="email"
                                    value={newCustomer.email}
                                    onChange={e => { setNewCustomer({ ...newCustomer, email: e.target.value }); setCustomerErrors(p => ({ ...p, email: undefined })) }}
                                />
                                {customerErrors.email && <p className="text-xs text-rose-500 ml-1">{customerErrors.email}</p>}
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Fecha de Nacimiento</label>
                                <input 
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-transparent rounded-xl focus:ring-2 focus:ring-primary"
                                    type="date"
                                    value={newCustomer.birthDate}
                                    onChange={e => setNewCustomer({ ...newCustomer, birthDate: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button onClick={() => { setNewCustomerOpen(false); setCustomerErrors({}) }} className="flex-1 py-4 text-slate-500 font-bold uppercase tracking-widest text-xs hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all">Cancelar</button>
                            <button onClick={handleCreateCustomer} disabled={savingCustomer} className="flex-1 py-4 bg-primary text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60 disabled:scale-100">
                                {savingCustomer ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
