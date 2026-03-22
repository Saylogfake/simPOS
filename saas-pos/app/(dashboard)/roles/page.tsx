"use client"

import { useEffect, useState } from "react"

/* ──────────── Types ──────────── */
interface Role {
    id: string
    name: string
    permissions: string[]
}

interface User {
    id: string
    name: string
    email: string
    roleId: string
    roleName: string
    isActive: boolean
    lastLoginAt: string | null
    createdAt: string
}

/* ──────────── Permissions master list ──────────── */
import { API_URL } from "@/lib/api"

const ALL_PERMISSIONS = [
    { code: "VIEW_INVENTORY",  label: "Ver Inventario",      group: "Inventory" },
    { code: "CREATE_PRODUCT",  label: "Crear Productos",     group: "Inventory" },
    { code: "EDIT_PRODUCT",    label: "Editar Productos",    group: "Inventory" },
    { code: "DELETE_PRODUCT",  label: "Eliminar Productos",  group: "Inventory" },
    { code: "POS_ACCESS",      label: "Acceso al POS",       group: "Sales"     },
    { code: "OPEN_CLOSE_CASH", label: "Abrir/Cerrar Caja",  group: "Cash"      },
    { code: "MANAGE_USERS",    label: "Gestionar Usuarios",  group: "Users"     },
    { code: "VIEW_REPORTS",    label: "Ver Reportes",        group: "Audit"     },
]

const API = API_URL

/* ══════════════════════════════════════════════════════════ */
export default function RolesPage() {
    /* — view toggle — */
    const [activeSection, setActiveSection] = useState<"users" | "roles">("users")

    /* — roles state — */
    const [roles, setRoles]               = useState<Role[]>([])
    const [selectedRole, setSelectedRole] = useState<Role | null>(null)
    const [roleSaving, setRoleSaving]     = useState(false)

    /* — users state — */
    const [users, setUsers]       = useState<User[]>([])
    const [usersLoading, setUsersLoading] = useState(false)
    const [search, setSearch]     = useState("")

    /* — user modals — */
    const [showAddUser,    setShowAddUser]    = useState(false)
    const [showEditUser,   setShowEditUser]   = useState(false)
    const [showDeleteUser, setShowDeleteUser] = useState(false)
    const [targetUser,     setTargetUser]     = useState<User | null>(null)
    const [formError,      setFormError]      = useState("")
    const [formLoading,    setFormLoading]    = useState(false)

    /* — add form — */
    const [addName,     setAddName]     = useState("")
    const [addEmail,    setAddEmail]    = useState("")
    const [addPassword, setAddPassword] = useState("")
    const [addRoleId,   setAddRoleId]   = useState("")

    /* — edit form — */
    const [editName,     setEditName]     = useState("")
    const [editEmail,    setEditEmail]    = useState("")
    const [editPassword, setEditPassword] = useState("")
    const [editRoleId,   setEditRoleId]   = useState("")
    const [editIsActive, setEditIsActive] = useState(true)

    const token = () => localStorage.getItem("token")

    /* ── initial load ── */
    useEffect(() => {
        fetchRoles()
        fetchUsers()
    }, [])

    /* ─────────── ROLES API ─────────── */
    const fetchRoles = async () => {
        try {
            const res = await fetch(`${API}/api/roles`, {
                headers: { Authorization: `Bearer ${token()}` },
            })
            if (res.ok) {
                const data = await res.json()
                setRoles(data)
                if (data.length > 0) setSelectedRole(data[0])
            }
        } catch (e) { console.error(e) }
    }

    const togglePermission = (code: string) => {
        if (!selectedRole) return
        const has = selectedRole.permissions.includes(code)
        const newPerms = has
            ? selectedRole.permissions.filter(p => p !== code)
            : [...selectedRole.permissions, code]
        setSelectedRole({ ...selectedRole, permissions: newPerms })
    }

    const savePermissions = async () => {
        if (!selectedRole) return
        setRoleSaving(true)
        try {
            const res = await fetch(`${API}/api/roles/${selectedRole.id}/permissions`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
                body: JSON.stringify({ permissionCodes: selectedRole.permissions }),
            })
            if (res.ok) fetchRoles()
        } catch (e) { console.error(e) }
        finally { setRoleSaving(false) }
    }

    /* ─────────── USERS API ─────────── */
    const fetchUsers = async () => {
        setUsersLoading(true)
        try {
            const res = await fetch(`${API}/api/users`, {
                headers: { Authorization: `Bearer ${token()}` },
            })
            if (res.ok) setUsers(await res.json())
        } catch (e) { console.error(e) }
        finally { setUsersLoading(false) }
    }

    const handleAddUser = async () => {
        setFormError("")
        if (!addName.trim() || !addEmail.trim() || !addPassword.trim() || !addRoleId)
            return setFormError("Todos los campos son obligatorios.")
        setFormLoading(true)
        try {
            const res = await fetch(`${API}/api/users`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
                body: JSON.stringify({ name: addName, email: addEmail, password: addPassword, roleId: addRoleId }),
            })
            if (res.ok) {
                setShowAddUser(false)
                setAddName(""); setAddEmail(""); setAddPassword(""); setAddRoleId("")
                fetchUsers()
            } else {
                const err = await res.json().catch(() => ({}))
                setFormError(err?.message || "Error al crear usuario.")
            }
        } catch { setFormError("Error de conexión.") }
        finally { setFormLoading(false) }
    }

    const openEditUser = (u: User) => {
        setTargetUser(u)
        setEditName(u.name); setEditEmail(u.email); setEditPassword("")
        setEditRoleId(u.roleId); setEditIsActive(u.isActive)
        setFormError(""); setShowEditUser(true)
    }

    const handleEditUser = async () => {
        if (!targetUser) return
        setFormError("")
        if (!editName.trim() || !editEmail.trim() || !editRoleId)
            return setFormError("Nombre, email y rol son obligatorios.")
        setFormLoading(true)
        try {
            const res = await fetch(`${API}/api/users/${targetUser.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
                body: JSON.stringify({ name: editName, email: editEmail, password: editPassword || null, roleId: editRoleId, isActive: editIsActive }),
            })
            if (res.ok) {
                setShowEditUser(false)
                fetchUsers()
            } else {
                const err = await res.json().catch(() => ({}))
                setFormError(err?.message || "Error al actualizar usuario.")
            }
        } catch { setFormError("Error de conexión.") }
        finally { setFormLoading(false) }
    }

    const openDeleteUser = (u: User) => { setTargetUser(u); setShowDeleteUser(true) }

    const handleDeleteUser = async () => {
        if (!targetUser) return
        setFormLoading(true)
        try {
            const res = await fetch(`${API}/api/users/${targetUser.id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token()}` },
            })
            if (res.ok) { setShowDeleteUser(false); fetchUsers() }
            else setFormError("Error al eliminar usuario.")
        } catch { setFormError("Error de conexión.") }
        finally { setFormLoading(false) }
    }

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.roleName.toLowerCase().includes(search.toLowerCase())
    )

    /* ────────── ROLE colors ────────── */
    const roleColor = (name: string) => {
        switch (name?.toUpperCase()) {
            case "SUPERADMIN": return "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
            case "ADMIN":      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
            case "SUPERVISOR": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
            default:           return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
        }
    }

    /* ══════════════════ RENDER ══════════════════ */
    return (
        <div className="flex flex-1 overflow-hidden h-screen bg-slate-50 dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">

            {/* ── Left sidebar ── */}
            <aside className="w-64 hidden xl:flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shrink-0">
                <div className="mb-6 px-2">
                    <h1 className="text-slate-900 dark:text-white text-base font-bold leading-normal">Administración</h1>
                    <p className="text-slate-500 text-xs font-normal">Usuarios y accesos</p>
                </div>
                <nav className="flex flex-col gap-1">
                    <button
                        onClick={() => setActiveSection("users")}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${activeSection === "users" ? "bg-primary/10 text-primary" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                    >
                        <span className="material-symbols-outlined text-[20px]" style={activeSection === "users" ? { fontVariationSettings: "'FILL' 1" } : {}}>group</span>
                        <span className={`text-sm uppercase tracking-tighter ${activeSection === "users" ? "font-black italic" : "font-medium"}`}>Lista de Usuarios</span>
                    </button>
                    <button
                        onClick={() => setActiveSection("roles")}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${activeSection === "roles" ? "bg-primary/10 text-primary" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                    >
                        <span className="material-symbols-outlined text-[20px]" style={activeSection === "roles" ? { fontVariationSettings: "'FILL' 1" } : {}}>shield_person</span>
                        <span className={`text-sm uppercase tracking-tighter ${activeSection === "roles" ? "font-black italic" : "font-medium"}`}>Roles y Permisos</span>
                    </button>
                </nav>
            </aside>

            {/* ══════════ MAIN ══════════ */}
            <main className="flex-1 overflow-y-auto p-6 lg:p-10 pb-32">

                {/* ─────── USERS SECTION ─────── */}
                {activeSection === "users" && (
                    <div className="max-w-5xl mx-auto flex flex-col gap-6">
                        {/* Header */}
                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <div>
                                <h2 className="text-slate-900 dark:text-white text-3xl font-black tracking-tight uppercase italic">Lista de Usuarios</h2>
                                <p className="text-slate-500 text-sm mt-1">Gestiona los accesos y datos de cada operador del sistema.</p>
                            </div>
                            <button
                                onClick={() => { setFormError(""); setShowAddUser(true) }}
                                className="flex items-center gap-2 px-6 py-3 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all shadow-xl shadow-primary/20"
                            >
                                <span className="material-symbols-outlined text-[18px]">person_add</span>
                                <span>Nuevo Usuario</span>
                            </button>
                        </div>

                        {/* Search bar */}
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Buscar por nombre, email o rol..."
                                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        {/* Users Table */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                            {usersLoading ? (
                                <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
                                    <span className="material-symbols-outlined animate-spin text-[24px]">progress_activity</span>
                                    <span className="text-sm font-bold uppercase tracking-widest">Cargando...</span>
                                </div>
                            ) : filteredUsers.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-300 dark:text-slate-600">
                                    <span className="material-symbols-outlined text-[48px]">person_off</span>
                                    <p className="text-sm font-bold uppercase tracking-widest">Sin usuarios{search && " que coincidan"}</p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                            <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuario</th>
                                            <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rol</th>
                                            <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</th>
                                            <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Último acceso</th>
                                            <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                        {filteredUsers.map(u => (
                                            <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors group">
                                                <td className="p-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-primary font-black text-sm uppercase shrink-0">
                                                            {u.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-900 dark:text-white">{u.name}</p>
                                                            <p className="text-xs text-slate-400">{u.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-5">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${roleColor(u.roleName)}`}>
                                                        {u.roleName}
                                                    </span>
                                                </td>
                                                <td className="p-5 text-center">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${u.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-400 dark:bg-slate-800"}`}>
                                                        <span className={`size-1.5 rounded-full ${u.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                                                        {u.isActive ? "Activo" : "Inactivo"}
                                                    </span>
                                                </td>
                                                <td className="p-5 text-xs text-slate-400 font-medium">
                                                    {u.lastLoginAt
                                                        ? new Date(u.lastLoginAt).toLocaleString("es", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                                                        : <span className="italic">Nunca</span>}
                                                </td>
                                                <td className="p-5 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => openEditUser(u)}
                                                            title="Editar"
                                                            className="size-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-primary/10 hover:text-primary transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">edit</span>
                                                        </button>
                                                        <button
                                                            onClick={() => openDeleteUser(u)}
                                                            title="Eliminar"
                                                            className="size-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-rose-100 hover:text-rose-500 dark:hover:bg-rose-900/20 transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Summary bar */}
                        {!usersLoading && (
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                                {filteredUsers.length} usuario{filteredUsers.length !== 1 ? "s" : ""} {search && "encontrados"}
                            </p>
                        )}
                    </div>
                )}

                {/* ─────── ROLES SECTION ─────── */}
                {activeSection === "roles" && (
                    <div className="max-w-5xl mx-auto flex flex-col gap-8">
                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <div>
                                <h2 className="text-slate-900 dark:text-white text-3xl font-black tracking-tight uppercase italic">Roles y Permisos</h2>
                                <p className="text-slate-500 text-sm max-w-lg mt-1">Configura el control de acceso. Define permisos granulares para asegurar la integridad operativa.</p>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
                                {roles.map(role => (
                                    <button
                                        key={role.id}
                                        onClick={() => setSelectedRole(role)}
                                        className={`flex-1 min-w-[150px] py-5 px-6 text-xs font-black uppercase tracking-widest transition-all ${selectedRole?.id === role.id ? "border-b-4 border-primary text-primary bg-primary/5 italic" : "border-b-4 border-transparent text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}
                                    >
                                        {role.name}
                                    </button>
                                ))}
                            </div>

                            <div className="p-8">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-slate-900 dark:text-white text-lg font-black italic tracking-tight">
                                        Matriz de Permisos: <span className="text-primary">{selectedRole?.name}</span>
                                    </h3>
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-2">
                                            <div className="size-4 rounded-md border-2 border-slate-200 bg-white" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sin Acceso</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="size-4 rounded-md bg-primary flex items-center justify-center">
                                                <span className="material-symbols-outlined text-white text-[10px]">check</span>
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Concedido</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-inner">
                                    <table className="w-full border-collapse text-left">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Módulo / Funcionalidad</th>
                                                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Acceso</th>
                                                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Código</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                            {ALL_PERMISSIONS.map(permission => (
                                                <tr key={permission.code} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                                    <td className="p-5">
                                                        <div className="flex items-center gap-4">
                                                            <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                                                                <span className="material-symbols-outlined text-[20px]">
                                                                    {permission.group === "Inventory" && "inventory_2"}
                                                                    {permission.group === "Sales"     && "point_of_sale"}
                                                                    {permission.group === "Cash"      && "payments"}
                                                                    {permission.group === "Users"     && "manage_accounts"}
                                                                    {permission.group === "Audit"     && "monitoring"}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tighter">{permission.label}</p>
                                                                <p className="text-[10px] text-slate-400 font-bold uppercase">{permission.group}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-5 text-center">
                                                        <button
                                                            onClick={() => togglePermission(permission.code)}
                                                            className={`size-6 rounded-lg border-2 transition-all flex items-center justify-center mx-auto ${selectedRole?.permissions.includes(permission.code) ? "bg-primary border-primary text-white shadow-lg shadow-primary/30" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-transparent"}`}
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">check</span>
                                                        </button>
                                                    </td>
                                                    <td className="p-5 text-right font-mono text-[10px] text-slate-400 font-bold">{permission.code}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Save bar */}
                        <div className="fixed bottom-0 left-0 right-0 xl:left-64 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-6 z-40">
                            <div className="max-w-5xl mx-auto flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="size-2 rounded-full bg-amber-500 animate-pulse" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        Cambios pendientes para <span className="text-slate-900 dark:text-white italic">{selectedRole?.name}</span>
                                    </p>
                                </div>
                                <div className="flex gap-4">
                                    <button onClick={fetchRoles} className="px-6 py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">Descartar</button>
                                    <button onClick={savePermissions} disabled={roleSaving} className="px-10 py-3 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
                                        {roleSaving ? "Guardando..." : "Guardar Cambios"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* ══════════ MODALS ══════════ */}

            {/* ── Add User Modal ── */}
            {showAddUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddUser(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-8 border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>person_add</span>
                            </div>
                            <div>
                                <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">Nuevo Usuario</h3>
                                <p className="text-xs text-slate-400">Completa los datos del nuevo operador</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Nombre completo</label>
                                <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="Ej: Juan Pérez" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Email</label>
                                <input value={addEmail} onChange={e => setAddEmail(e.target.value)} placeholder="correo@ejemplo.com" type="email" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Contraseña</label>
                                <input value={addPassword} onChange={e => setAddPassword(e.target.value)} placeholder="Mínimo 6 caracteres" type="password" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Rol</label>
                                <select value={addRoleId} onChange={e => setAddRoleId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none">
                                    <option value="">Seleccionar rol...</option>
                                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                            {formError && <p className="text-xs text-rose-500 font-bold bg-rose-50 dark:bg-rose-900/20 px-4 py-2 rounded-lg">{formError}</p>}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowAddUser(false)} className="flex-1 py-3 text-xs font-black uppercase tracking-widest text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancelar</button>
                            <button onClick={handleAddUser} disabled={formLoading} className="flex-1 py-3 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 shadow-lg shadow-primary/20">
                                {formLoading ? "Creando..." : "Crear Usuario"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Edit User Modal ── */}
            {showEditUser && targetUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowEditUser(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-8 border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="size-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <span className="material-symbols-outlined text-amber-500 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>edit</span>
                            </div>
                            <div>
                                <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">Editar Usuario</h3>
                                <p className="text-xs text-slate-400">{targetUser.email}</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Nombre completo</label>
                                <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Email</label>
                                <input value={editEmail} onChange={e => setEditEmail(e.target.value)} type="email" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Nueva contraseña <span className="text-slate-300 dark:text-slate-600 normal-case font-medium">(dejar vacío para no cambiar)</span></label>
                                <input value={editPassword} onChange={e => setEditPassword(e.target.value)} type="password" placeholder="•••••••••" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Rol</label>
                                <select value={editRoleId} onChange={e => setEditRoleId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none">
                                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                <div>
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Usuario activo</p>
                                    <p className="text-[10px] text-slate-400">Permite o bloquea el inicio de sesión</p>
                                </div>
                                <button
                                    onClick={() => setEditIsActive(!editIsActive)}
                                    className={`relative w-11 h-6 rounded-full transition-colors ${editIsActive ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"}`}
                                >
                                    <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform ${editIsActive ? "translate-x-5" : ""}`} />
                                </button>
                            </div>
                            {formError && <p className="text-xs text-rose-500 font-bold bg-rose-50 dark:bg-rose-900/20 px-4 py-2 rounded-lg">{formError}</p>}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowEditUser(false)} className="flex-1 py-3 text-xs font-black uppercase tracking-widest text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancelar</button>
                            <button onClick={handleEditUser} disabled={formLoading} className="flex-1 py-3 bg-amber-500 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-amber-600 transition-all disabled:opacity-50 shadow-lg shadow-amber-500/20">
                                {formLoading ? "Guardando..." : "Guardar Cambios"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete User Modal ── */}
            {showDeleteUser && targetUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteUser(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-8 border border-rose-100 dark:border-rose-900/40" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col items-center text-center gap-4 mb-6">
                            <div className="size-14 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                                <span className="material-symbols-outlined text-rose-500 text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>person_remove</span>
                            </div>
                            <div>
                                <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white mb-1">¿Eliminar Usuario?</h3>
                                <p className="text-sm text-slate-500">
                                    Esta acción desactivará permanentemente a <span className="font-bold text-slate-700 dark:text-slate-300">{targetUser.name}</span>. No podrá iniciar sesión.
                                </p>
                            </div>
                        </div>
                        {formError && <p className="text-xs text-rose-500 font-bold bg-rose-50 dark:bg-rose-900/20 px-4 py-2 rounded-lg mb-4 text-center">{formError}</p>}
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteUser(false)} className="flex-1 py-3 text-xs font-black uppercase tracking-widest text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancelar</button>
                            <button onClick={handleDeleteUser} disabled={formLoading} className="flex-1 py-3 bg-rose-500 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-rose-600 transition-all disabled:opacity-50 shadow-lg shadow-rose-500/20">
                                {formLoading ? "Eliminando..." : "Eliminar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
