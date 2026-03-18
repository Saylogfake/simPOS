"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { API_URL } from "@/lib/api"

type Tenant = {
    id: string
    name: string
    slug: string
    email: string | null
    phone: string | null
    plan: string
    isActive: boolean
    createdAt: string
    userCount: number
    productCount: number
    salesCount: number
    totalRevenue: number
}

type Stats = {
    totalTenants: number
    activeTenants: number
    totalUsers: number
    totalSales: number
    totalRevenue: number
    recentTenants: Tenant[]
}

const PLANS = ["FREE", "PRO", "ENTERPRISE"]

const planColor: Record<string, string> = {
    FREE: "bg-slate-700 text-slate-300",
    PRO: "bg-blue-900 text-blue-300",
    ENTERPRISE: "bg-purple-900 text-purple-300",
}

const fmt = (n: number) =>
    new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n)

export default function SuperAdminPage() {
    const [stats, setStats] = useState<Stats | null>(null)
    const [tenants, setTenants] = useState<Tenant[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editTenant, setEditTenant] = useState<Tenant | null>(null)
    const [search, setSearch] = useState("")

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` }

    const fetchAll = useCallback(async () => {
        setLoading(true)
        try {
            const [statsRes, tenantsRes] = await Promise.all([
                fetch(`${API_URL}/api/tenants/stats`, { headers }),
                fetch(`${API_URL}/api/tenants`, { headers }),
            ])
            if (statsRes.ok) setStats(await statsRes.json())
            if (tenantsRes.ok) setTenants(await tenantsRes.json())
        } catch {
            toast.error("Error al cargar datos")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchAll() }, [fetchAll])

    const handleDisable = async (id: string, isActive: boolean) => {
        if (!confirm(`¿${isActive ? "Desactivar" : "Activar"} este negocio?`)) return
        const res = await fetch(`${API_URL}/api/tenants/${id}`, {
            method: "DELETE",
            headers,
        })
        if (res.ok) {
            toast.success(isActive ? "Negocio desactivado" : "Negocio actualizado")
            fetchAll()
        } else {
            toast.error("Error al actualizar")
        }
    }

    const filtered = tenants.filter(
        (t) =>
            t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.slug.toLowerCase().includes(search.toLowerCase()) ||
            (t.email ?? "").toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tight italic">Panel Superadmin</h1>
                    <p className="text-slate-400 text-sm mt-1">Gestión global de negocios</p>
                </div>
                <button
                    onClick={() => { setEditTenant(null); setShowModal(true) }}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95"
                >
                    <span className="material-symbols-outlined text-lg">add_business</span>
                    Nuevo Negocio
                </button>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    {[
                        { label: "Negocios Totales", value: stats.totalTenants, icon: "storefront", color: "text-blue-400" },
                        { label: "Negocios Activos", value: stats.activeTenants, icon: "check_circle", color: "text-emerald-400" },
                        { label: "Usuarios Totales", value: stats.totalUsers, icon: "group", color: "text-violet-400" },
                        { label: "Ventas Totales", value: stats.totalSales, icon: "receipt_long", color: "text-amber-400" },
                        { label: "Ingresos Globales", value: fmt(stats.totalRevenue), icon: "payments", color: "text-rose-400" },
                    ].map((s) => (
                        <div key={s.label} className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
                            <span className={`material-symbols-outlined text-2xl ${s.color}`}>{s.icon}</span>
                            <p className="text-2xl font-black text-white mt-2">{s.value}</p>
                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">{s.label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Search */}
            <div className="relative max-w-sm">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar negocio..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>

            {/* Table */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-widest">
                            <th className="text-left px-6 py-4">Negocio</th>
                            <th className="text-left px-4 py-4">Plan</th>
                            <th className="text-right px-4 py-4">Usuarios</th>
                            <th className="text-right px-4 py-4">Productos</th>
                            <th className="text-right px-4 py-4">Ventas</th>
                            <th className="text-right px-4 py-4">Ingresos</th>
                            <th className="text-center px-4 py-4">Estado</th>
                            <th className="text-right px-6 py-4">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={8} className="text-center py-12 text-slate-500">Cargando...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={8} className="text-center py-12 text-slate-500">No hay negocios</td></tr>
                        ) : filtered.map((t) => (
                            <tr key={t.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                                <td className="px-6 py-4">
                                    <p className="font-bold text-white">{t.name}</p>
                                    <p className="text-xs text-slate-500">/{t.slug}</p>
                                    {t.email && <p className="text-xs text-slate-500">{t.email}</p>}
                                </td>
                                <td className="px-4 py-4">
                                    <span className={`text-xs font-black px-2 py-1 rounded-full uppercase ${planColor[t.plan] ?? "bg-slate-700 text-slate-300"}`}>
                                        {t.plan}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-right text-slate-300">{t.userCount}</td>
                                <td className="px-4 py-4 text-right text-slate-300">{t.productCount}</td>
                                <td className="px-4 py-4 text-right text-slate-300">{t.salesCount}</td>
                                <td className="px-4 py-4 text-right text-slate-300">{fmt(t.totalRevenue)}</td>
                                <td className="px-4 py-4 text-center">
                                    <span className={`text-xs font-black px-2 py-1 rounded-full uppercase ${t.isActive ? "bg-emerald-900 text-emerald-300" : "bg-red-900 text-red-300"}`}>
                                        {t.isActive ? "Activo" : "Inactivo"}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => { setEditTenant(t); setShowModal(true) }}
                                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-600 rounded-lg transition-colors"
                                            title="Editar"
                                        >
                                            <span className="material-symbols-outlined text-lg">edit</span>
                                        </button>
                                        <button
                                            onClick={() => handleDisable(t.id, t.isActive)}
                                            className={`p-1.5 rounded-lg transition-colors ${t.isActive ? "text-slate-400 hover:text-rose-400 hover:bg-rose-900/30" : "text-slate-400 hover:text-emerald-400 hover:bg-emerald-900/30"}`}
                                            title={t.isActive ? "Desactivar" : "Activar"}
                                        >
                                            <span className="material-symbols-outlined text-lg">{t.isActive ? "block" : "check_circle"}</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <TenantModal
                    tenant={editTenant}
                    headers={headers}
                    onClose={() => setShowModal(false)}
                    onSuccess={() => { setShowModal(false); fetchAll() }}
                />
            )}
        </div>
    )
}

// ── Modal crear/editar tenant ──────────────────────────────────────────────────
function TenantModal({
    tenant,
    headers,
    onClose,
    onSuccess,
}: {
    tenant: Tenant | null
    headers: Record<string, string>
    onClose: () => void
    onSuccess: () => void
}) {
    const isEdit = !!tenant
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        name: tenant?.name ?? "",
        slug: tenant?.slug ?? "",
        email: tenant?.email ?? "",
        phone: tenant?.phone ?? "",
        address: "",
        plan: tenant?.plan ?? "FREE",
        isActive: tenant?.isActive ?? true,
        // Solo para creación
        adminName: "",
        adminEmail: "",
        adminPassword: "",
    })

    const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const url = isEdit
                ? `${API_URL}/api/tenants/${tenant!.id}`
                : `${API_URL}/api/tenants`
            const method = isEdit ? "PUT" : "POST"
            const body = isEdit
                ? { name: form.name, slug: form.slug, email: form.email, phone: form.phone, address: form.address, plan: form.plan, isActive: form.isActive }
                : { name: form.name, slug: form.slug, email: form.email, phone: form.phone, address: form.address, plan: form.plan, adminName: form.adminName, adminEmail: form.adminEmail, adminPassword: form.adminPassword }

            const res = await fetch(url, { method, headers, body: JSON.stringify(body) })
            const data = await res.json()
            if (!res.ok) throw new Error(data.message ?? "Error")
            toast.success(isEdit ? "Negocio actualizado" : "Negocio creado")
            onSuccess()
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Error")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <h2 className="text-lg font-black text-white uppercase tracking-tight italic">
                        {isEdit ? "Editar Negocio" : "Nuevo Negocio"}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nombre del Negocio *</label>
                            <input required value={form.name} onChange={(e) => set("name", e.target.value)}
                                className="mt-1 w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Slug * <span className="text-slate-500 normal-case font-normal">(único, sin espacios)</span></label>
                            <input required value={form.slug} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                                className="mt-1 w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Plan</label>
                            <select value={form.plan} onChange={(e) => set("plan", e.target.value)}
                                className="mt-1 w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                                {PLANS.map((p) => <option key={p}>{p}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email</label>
                            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
                                className="mt-1 w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Teléfono</label>
                            <input value={form.phone} onChange={(e) => set("phone", e.target.value)}
                                className="mt-1 w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        {isEdit && (
                            <div className="col-span-2 flex items-center gap-3">
                                <input type="checkbox" id="isActive" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)}
                                    className="w-4 h-4 accent-primary" />
                                <label htmlFor="isActive" className="text-sm text-slate-300">Negocio activo</label>
                            </div>
                        )}
                    </div>

                    {!isEdit && (
                        <>
                            <div className="border-t border-slate-700 pt-4">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Administrador Inicial</p>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nombre *</label>
                                        <input required value={form.adminName} onChange={(e) => set("adminName", e.target.value)}
                                            className="mt-1 w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email *</label>
                                        <input required type="email" value={form.adminEmail} onChange={(e) => set("adminEmail", e.target.value)}
                                            className="mt-1 w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contraseña *</label>
                                        <input required type="password" minLength={6} value={form.adminPassword} onChange={(e) => set("adminPassword", e.target.value)}
                                            className="mt-1 w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm font-bold hover:bg-slate-700 transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading}
                            className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-black uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50">
                            {loading ? "Guardando..." : isEdit ? "Guardar Cambios" : "Crear Negocio"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
