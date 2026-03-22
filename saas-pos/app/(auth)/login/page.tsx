"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { API_URL } from "@/lib/api"

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [showForgotInfo, setShowForgotInfo] = useState(false)
    const [emailError, setEmailError] = useState("")
    const [passwordError, setPasswordError] = useState("")

    const validateFields = () => {
        let valid = true
        setEmailError("")
        setPasswordError("")

        if (!email.trim()) {
            setEmailError("El correo es obligatorio")
            valid = false
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setEmailError("Ingresa un correo válido")
            valid = false
        }

        if (!password.trim()) {
            setPasswordError("La contraseña es obligatoria")
            valid = false
        } else if (password.length < 4) {
            setPasswordError("Mínimo 4 caracteres")
            valid = false
        }

        return valid
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validateFields()) return

        setLoading(true)
        setError("")

        try {
            const res = await fetch(`${API_URL}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            })

            if (!res.ok) throw new Error("Credenciales incorrectas")

            const data = await res.json()
            localStorage.setItem("token", data.access_token)
            localStorage.setItem("user", JSON.stringify(data.user))
            router.push("/pos")
        } catch {
            setError("Credenciales incorrectas. Verifica tu correo y contraseña.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen w-full flex bg-slate-950 font-display">
            {/* Left panel — branding */}
            <div className="hidden lg:flex flex-col justify-between w-[45%] bg-slate-900 border-r border-slate-800 p-12 relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-slate-800 rounded-full opacity-30" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-slate-800 rounded-full opacity-20" />
                </div>

                {/* Logo */}
                <div className="relative z-10 flex items-center gap-3">
                    <div className="size-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                        <span className="material-symbols-outlined text-white text-xl">point_of_sale</span>
                    </div>
                    <span className="text-white font-black text-xl tracking-tight">SaaS<span className="text-primary">POS</span></span>
                </div>

                {/* Center content */}
                <div className="relative z-10 space-y-8">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-4 py-2 rounded-full">
                            <span className="size-2 bg-primary rounded-full animate-pulse" />
                            <span className="text-primary text-[10px] font-black uppercase tracking-widest">Sistema Activo</span>
                        </div>
                        <h2 className="text-4xl font-black text-white leading-tight italic tracking-tighter">
                            Control total<br />de tu negocio<br /><span className="text-primary">en un solo lugar.</span>
                        </h2>
                        <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                            Gestiona ventas, inventario, caja y clientes desde un terminal unificado.
                        </p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { icon: "point_of_sale", label: "Ventas", value: "POS" },
                            { icon: "inventory_2", label: "Inventario", value: "Stock" },
                            { icon: "payments", label: "Caja", value: "Diaria" },
                        ].map((item) => (
                            <div key={item.label} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex flex-col gap-2">
                                <span className="material-symbols-outlined text-primary text-xl">{item.icon}</span>
                                <span className="text-white font-black text-sm italic">{item.value}</span>
                                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="relative z-10">
                    <p className="text-slate-600 text-xs font-bold uppercase tracking-widest">v2.1.0 &bull; Retail Management System</p>
                </div>
            </div>

            {/* Right panel — login form */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 relative">
                {/* Mobile logo */}
                <div className="lg:hidden flex items-center gap-3 mb-10">
                    <div className="size-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                        <span className="material-symbols-outlined text-white text-xl">point_of_sale</span>
                    </div>
                    <span className="text-white font-black text-xl tracking-tight">SaaS<span className="text-primary">POS</span></span>
                </div>

                <div className="w-full max-w-sm space-y-8">
                    {/* Header */}
                    <div className="space-y-2">
                        <h1 className="text-3xl font-black text-white italic tracking-tighter">Iniciar Sesión</h1>
                        <p className="text-slate-500 text-sm">Ingresa tus credenciales para acceder al sistema.</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-5" noValidate>
                        {/* Email */}
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Correo Electrónico
                            </label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl pointer-events-none">
                                    mail
                                </span>
                                <input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); setEmailError("") }}
                                    placeholder="usuario@empresa.com"
                                    className={`w-full pl-12 pr-4 py-4 bg-slate-900 border rounded-2xl text-white placeholder-slate-600 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-primary/50 ${emailError ? "border-rose-500 focus:ring-rose-500/30" : "border-slate-800 focus:border-primary"}`}
                                />
                            </div>
                            {emailError && (
                                <p className="text-rose-400 text-xs font-bold flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">error</span>
                                    {emailError}
                                </p>
                            )}
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Contraseña
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setShowForgotInfo(!showForgotInfo)}
                                    className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
                                >
                                    ¿Olvidaste tu contraseña?
                                </button>
                            </div>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl pointer-events-none">
                                    lock
                                </span>
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setPasswordError("") }}
                                    placeholder="••••••••"
                                    className={`w-full pl-12 pr-12 py-4 bg-slate-900 border rounded-2xl text-white placeholder-slate-600 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-primary/50 ${passwordError ? "border-rose-500 focus:ring-rose-500/30" : "border-slate-800 focus:border-primary"}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                >
                                    <span className="material-symbols-outlined text-xl">
                                        {showPassword ? "visibility_off" : "visibility"}
                                    </span>
                                </button>
                            </div>
                            {passwordError && (
                                <p className="text-rose-400 text-xs font-bold flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">error</span>
                                    {passwordError}
                                </p>
                            )}
                        </div>

                        {/* Forgot password info */}
                        {showForgotInfo && (
                            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 flex items-start gap-3">
                                <span className="material-symbols-outlined text-primary text-xl shrink-0 mt-0.5">info</span>
                                <p className="text-slate-400 text-xs leading-relaxed">
                                    Contacta al administrador del sistema para restablecer tu contraseña.
                                </p>
                            </div>
                        )}

                        {/* Global error */}
                        {error && (
                            <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-center gap-3">
                                <span className="material-symbols-outlined text-rose-400 text-xl shrink-0">gpp_bad</span>
                                <p className="text-rose-400 text-sm font-bold">{error}</p>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest italic rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-sm"
                        >
                            {loading ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                                    Verificando...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-xl">login</span>
                                    Ingresar al Sistema
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer note */}
                    <p className="text-center text-slate-600 text-xs font-bold uppercase tracking-widest">
                        Acceso restringido &bull; Solo personal autorizado
                    </p>
                </div>
            </div>
        </div>
    )
}
