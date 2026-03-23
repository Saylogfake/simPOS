"use client"

import { useState, useEffect, useRef } from "react"
import { API_URL } from "@/lib/api"

type Notification = {
    id: string
    type: "INFO" | "WARNING" | "DANGER" | "PAYMENT"
    title: string
    message: string
    isRead: boolean
    createdAt: string
    tenantId: string | null
}

const typeConfig = {
    INFO:    { icon: "info",               color: "text-blue-500",   bg: "bg-blue-50 dark:bg-blue-900/20",   border: "border-blue-100 dark:border-blue-800" },
    WARNING: { icon: "warning",            color: "text-amber-500",  bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-100 dark:border-amber-800" },
    DANGER:  { icon: "priority_high",      color: "text-rose-500",   bg: "bg-rose-50 dark:bg-rose-900/20",   border: "border-rose-100 dark:border-rose-800" },
    PAYMENT: { icon: "payments",           color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-900/20", border: "border-violet-100 dark:border-violet-800" },
}

function timeAgo(date: string) {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (diff < 60) return "ahora"
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    return `${Math.floor(diff / 86400)}d`
}

export function NotificationsPanel() {
    const [open, setOpen] = useState(false)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const panelRef = useRef<HTMLDivElement>(null)

    const unreadCount = notifications.filter(n => !n.isRead).length

    const fetchNotifications = async () => {
        const token = localStorage.getItem("token")
        if (!token) return
        try {
            const res = await fetch(`${API_URL}/api/notifications`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.ok) setNotifications(await res.json())
        } catch {}
    }

    useEffect(() => {
        fetchNotifications()
        const interval = setInterval(fetchNotifications, 30000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node))
                setOpen(false)
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [])

    const markAllRead = async () => {
        const token = localStorage.getItem("token")
        await fetch(`${API_URL}/api/notifications/read-all`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` }
        })
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    }

    const markRead = async (id: string) => {
        const token = localStorage.getItem("token")
        await fetch(`${API_URL}/api/notifications/${id}/read`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` }
        })
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    }

    return (
        <div className="relative" ref={panelRef}>
            <button
                onClick={() => { setOpen(o => !o); if (!open) fetchNotifications() }}
                className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full relative transition-colors"
            >
                <span className="material-symbols-outlined">notifications</span>
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[9px] font-black text-white px-0.5">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-lg">notifications</span>
                            <span className="text-sm font-black uppercase tracking-widest">Notificaciones</span>
                            {unreadCount > 0 && (
                                <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button onClick={markAllRead} className="text-[10px] font-black text-primary hover:underline uppercase">
                                Leer todo
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-96 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 opacity-30">
                                <span className="material-symbols-outlined text-4xl">notifications_off</span>
                                <p className="text-xs font-bold mt-2">Sin notificaciones</p>
                            </div>
                        ) : notifications.map(n => {
                            const cfg = typeConfig[n.type] ?? typeConfig.INFO
                            return (
                                <button
                                    key={n.id}
                                    onClick={() => markRead(n.id)}
                                    className={`w-full text-left flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${!n.isRead ? 'bg-slate-50/80 dark:bg-slate-800/30' : ''}`}
                                >
                                    <span className={`material-symbols-outlined text-xl mt-0.5 shrink-0 ${cfg.color}`}>{cfg.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className={`text-xs font-black uppercase truncate ${!n.isRead ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>{n.title}</p>
                                            <span className="text-[9px] text-slate-400 shrink-0">{timeAgo(n.createdAt)}</span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 leading-snug mt-0.5 line-clamp-2">{n.message}</p>
                                    </div>
                                    {!n.isRead && <span className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1.5"></span>}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
