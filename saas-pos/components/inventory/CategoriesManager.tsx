"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { API_URL } from "@/lib/api"

type Category = {
    id: string
    name: string
}

export function CategoriesManager() {
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState("")
    const [newName, setNewName] = useState("")

    useEffect(() => {
        fetchCategories()
    }, [])

    const fetchCategories = async () => {
        setLoading(true)
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
            toast.error("Error al cargar categorías")
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async () => {
        if (!newName.trim()) return
        try {
            const token = localStorage.getItem("token")
            const res = await fetch(`${API_URL}/api/products/categories`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ name: newName })
            })
            if (res.ok) {
                setNewName("")
                fetchCategories()
                toast.success("Categoría creada")
            }
        } catch (e) {
            toast.error("Error al crear")
        }
    }

    const handleUpdate = async (id: string) => {
        if (!editName.trim()) return
        try {
            const token = localStorage.getItem("token")
            const res = await fetch(`${API_URL}/api/products/categories/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ name: editName })
            })
            if (res.ok) {
                setEditingId(null)
                fetchCategories()
                toast.success("Categoría actualizada")
            }
        } catch (e) {
            toast.error("Error al actualizar")
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Seguro que desea eliminar esta categoría? Si tiene productos asociados fallará.")) return
        try {
            const token = localStorage.getItem("token")
            const res = await fetch(`${API_URL}/api/products/categories/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            })
            if (res.ok) {
                fetchCategories()
                toast.success("Categoría eliminada")
            } else {
                const txt = await res.text()
                toast.error("Error: " + txt)
            }
        } catch (e) {
            toast.error("Error de conexión")
        }
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Create Section */}
            <div className="bg-white dark:bg-slate-950 p-10 rounded-[40px] border-4 border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/20 grid grid-cols-1 md:grid-cols-3 gap-8 items-end relative overflow-hidden group">
                <div className="md:col-span-2 space-y-4 relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="size-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30">
                            <span className="material-symbols-outlined text-2xl font-black">category</span>
                        </div>
                        <h3 className="text-2xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white leading-none">Nueva Categoría</h3>
                    </div>
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-2 italic">Nombre de la Categoría</label>
                    <input
                        placeholder="EJ: BEBIDAS, SNACKS, LIMPIEZA..."
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        className="w-full h-16 bg-slate-50 dark:bg-slate-900 border-4 border-slate-100 dark:border-slate-800 rounded-2xl text-lg font-black italic tracking-tighter uppercase text-slate-900 dark:text-white px-8 focus:border-primary transition-all placeholder:opacity-20"
                    />
                </div>
                <div className="relative z-10">
                    <Button 
                        onClick={handleCreate} 
                        disabled={!newName.trim()} 
                        className="w-full h-16 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black uppercase italic tracking-widest text-[10px] shadow-2xl shadow-primary/20 transform active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        <span className="material-symbols-outlined text-xl font-black">add_circle</span>
                        Agregar Ahora
                    </Button>
                </div>
                <span className="material-symbols-outlined absolute -bottom-8 -right-8 text-[180px] text-slate-100 dark:text-slate-900 opacity-30 pointer-events-none group-hover:rotate-12 transition-transform duration-1000">category</span>
            </div>

            {/* List Section */}
            <div className="bg-white dark:bg-slate-950 rounded-[40px] border-4 border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/20 overflow-hidden">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 flex items-center gap-3">
                        <span className="material-symbols-outlined text-sm">format_list_bulleted</span>
                        Categorías Registradas ({categories.length})
                    </h4>
                </div>
                
                <div className="divide-y-2 divide-slate-50 dark:divide-slate-900">
                    {categories.map((cat) => (
                        <div key={cat.id} className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all group">
                            <div className="flex items-center gap-6 flex-1">
                                <div className="size-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all transform group-hover:rotate-6 shadow-lg shadow-transparent group-hover:shadow-primary/20">
                                    <span className="material-symbols-outlined font-black">inventory_2</span>
                                </div>
                                {editingId === cat.id ? (
                                    <input
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        className="h-12 bg-white dark:bg-slate-800 border-2 border-primary rounded-xl px-4 font-black italic tracking-tighter uppercase text-slate-900 dark:text-white outline-none w-full max-w-md animate-in zoom-in-95 duration-200"
                                        autoFocus
                                    />
                                ) : (
                                    <span className="text-xl font-black italic tracking-tighter uppercase text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{cat.name}</span>
                                )}
                            </div>
                            
                            <div className="flex gap-2">
                                {editingId === cat.id ? (
                                    <>
                                        <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            onClick={() => handleUpdate(cat.id)} 
                                            className="size-12 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-transparent hover:shadow-emerald-500/20"
                                        >
                                            <span className="material-symbols-outlined font-black">save</span>
                                        </Button>
                                        <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            onClick={() => setEditingId(null)} 
                                            className="size-12 rounded-xl bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white transition-all shadow-lg shadow-transparent hover:shadow-rose-500/20"
                                        >
                                            <span className="material-symbols-outlined font-black">close</span>
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            onClick={() => {
                                                setEditingId(cat.id)
                                                setEditName(cat.name)
                                            }}
                                            className="size-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-primary hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <span className="material-symbols-outlined font-black">edit</span>
                                        </Button>
                                        <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            onClick={() => handleDelete(cat.id)}
                                            className="size-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <span className="material-symbols-outlined font-black">delete</span>
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                    {categories.length === 0 && (
                        <div className="p-20 flex flex-col items-center justify-center text-center opacity-30">
                            <span className="material-symbols-outlined text-8xl transition-all group-hover:scale-110">search_off</span>
                            <p className="font-black italic uppercase tracking-[0.3em] mt-4 text-xs">No se encontraron categorías registradas</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
