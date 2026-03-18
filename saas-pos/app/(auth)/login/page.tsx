"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { API_URL } from "@/lib/api"

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            const res = await fetch(`${API_URL}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            })

            if (!res.ok) {
                throw new Error("Invalid credentials")
            }

            const data = await res.json()
            localStorage.setItem("token", data.access_token)
            localStorage.setItem("user", JSON.stringify(data.user))
            router.push("/pos")
        } catch (err) {
            setError("Failed to login. Please check your credentials.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex items-center justify-center w-full">
            <div className="flex h-screen w-full overflow-hidden">
                {/* Left Side: Login Form */}
                <div className="flex flex-col w-full lg:w-[450px] xl:w-[550px] bg-background-light dark:bg-background-dark p-8 md:p-12 lg:p-16 justify-center">
                    <div className="mb-10 flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white">
                            <span className="material-symbols-outlined text-2xl">point_of_sale</span>
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                            SaaS <span className="text-primary">POS</span>
                        </h1>
                    </div>
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Welcome back</h2>
                        <p className="text-slate-500 dark:text-slate-400">Manage your retail business with ease. Log in to access your dashboard.</p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-6">
                        {/* Email Field */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">mail</span>
                                <input 
                                    className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-slate-900 dark:text-white" 
                                    placeholder="name@company.com" 
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        {/* Password Field */}
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                                <a className="text-sm font-semibold text-primary hover:underline" href="#">Forgot password?</a>
                            </div>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">lock</span>
                                <input 
                                    className="w-full pl-12 pr-12 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-slate-900 dark:text-white" 
                                    placeholder="Enter your password" 
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        {/* Action Button */}
                        <button 
                            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2" 
                            type="submit"
                            disabled={loading}
                        >
                            <span>{loading ? "Signing in..." : "Sign In to Dashboard"}</span>
                            <span className="material-symbols-outlined text-xl">arrow_forward</span>
                        </button>
                    </form>
                    {/* Secondary Action */}
                    <div className="mt-10 pt-8 border-t border-slate-200 dark:border-slate-800 text-center">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Don&apos;t have an account yet? 
                            <a className="text-primary font-bold hover:underline" href="#"> Start free trial</a>
                        </p>
                    </div>
                </div>
                {/* Right Side: Hero Image / Visual */}
                <div className="hidden lg:block relative flex-1">
                    <div className="absolute inset-0 bg-primary/10 mix-blend-multiply z-10"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-background-dark/80 via-transparent to-transparent z-20"></div>
                    <img 
                        alt="Retail Environment" 
                        className="absolute inset-0 w-full h-full object-cover" 
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuD7c7ym33IDIWJLum9W4wFLt8n9jxqLE4D72oAMoInlmu4iUOogPU5pSSWf4l3KnWHzD9TD6-fuCHMS9ZJwh4rRR9Ty-4W34USdKUhM4_E2WFw8J3blfgMwHALtutGYxCy3__IZdcoW968azz5Q-UwFTNV6V8MdTwq90lbhb3iLp12gg7Xqe-bsx1ZaHWY914rKlEP3mf3skG6JiLxs7fueeLngs_z_Yap_G4W9JNY6m498HGZBRTHyhc4MHQCE0sO8K0W3NTS3R_A"
                    />
                    {/* Floating Card over Image */}
                    <div className="absolute bottom-16 left-16 right-16 z-30 bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-xl">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="flex -space-x-2">
                                <img alt="User" className="w-10 h-10 rounded-full border-2 border-white/20" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB4kqUJKMdfdlTa4VbPa6RVHh9sqzUZOAt9y6f8QDuEvoYexmq3d7v5qASdg_UnMHF9HvjdhDU3lKY54SE4pPAXrnyf_t2H9CFBbCUlyerqHbPt-JyG-_z3H1wjLGSontmYgioO04MT2K8Lo79C2kfhMb1NT0CdpercvwBcOnrwtJlkvB2uL39dvqNELPLWdnSQylAvrLnzCjmnCfB9B3oJbvsoFblohu_v2Gcyo6IeWRj7aTE7jGov5QAsNAc-fGMIf4VJc66-gnk"/>
                                <img alt="User" className="w-10 h-10 rounded-full border-2 border-white/20" src="https://lh3.googleusercontent.com/aida-public/AB6AXuButgfE3FyiOmr0OGYJxZN0WLtHgX_L03Gc0IYv82HEZzrmmZZIqN8FEunXUVQmZ8CexOVoswGFLARQ0_zZUB-n6MlIzxP3Jqi70avXQyJuNqX2haFFDSWACHPYtB3W6xWKOxmBmPyYUvOjYWdVL0dC0xvq7Y__3Cx1eW7-PjFDomx_YkHp_ByC8fQCpA_gKYnlWGzFjhbl0ETbf3C86kWYJuH9IQ3LLtbm5Ox9Mn22NH2XSDWVB4PTxJ15fgwVjkgFGMqjiJrP_wA"/>
                                <img alt="User" className="w-10 h-10 rounded-full border-2 border-white/20" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDtMqBGf4qOerwhR1gzRsiRWyH0E98N4UFhpyvek9Nlvr6Y7tHi4u2dskq9TWFl4ibrDTljuk5ZClnzyL0gzPgKwBkKmalQkHeXfxenUp5saaieqei-5CD0eaW-6gHcS7gDWBGsoZ1NxKdVxKns-V4b1NUF0YM65gGXnpE8D5LAl7xty1YVSuitrL4WZaOnRfXPw6kl1KXtvgXX4FMMrrA_zh1IvoacAwpZUqXTKfTal5Nnen1O8ecY4in8_Oh7w1GFk8xIf8NvoUQ"/>
                            </div>
                            <p className="text-white text-sm font-medium">Joined by 10,000+ retailers worldwide</p>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">&quot;The most intuitive POS system we&apos;ve ever used. Integration was seamless.&quot;</h3>
                        <p className="text-white/80">— Sarah Jenkins, Boutique Owner</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
