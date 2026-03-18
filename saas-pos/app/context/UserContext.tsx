"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface User {
    id: string
    name: string
    email: string
    role: string
    permissions: string[]
}

interface UserContextType {
    user: User | null
    loading: boolean
    hasPermission: (code: string) => boolean
    refreshUser: () => void
}

const UserContext = createContext<UserContextType>({
    user: null,
    loading: true,
    hasPermission: () => false,
    refreshUser: () => { }
})

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(() => {
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem("user")
            return stored ? JSON.parse(stored) : null
        }
        return null
    })
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    const fetchUser = async () => {
        const token = localStorage.getItem("token") // Assuming token is here
        // For MVP, if we don't have a specific /me endpoint returning permissions, 
        // we might mock or rely on Login returns. 
        // But for robust implementation, we need a /me endpoint or similar.
        // Let's assume we implement /api/auth/me or store it in localStorage on login.

        // Strategy: Store user + permissions in localStorage on login for simplicity/speed?
        // Or fetch from API. API is safer.
        // Let's implement /api/auth/profile in backend.

        // Placeholder check for now:
        setLoading(false)
    }

    useEffect(() => {
        setTimeout(() => setLoading(false), 0)
    }, [])

    const hasPermission = (code: string) => {
        if (!user) return false
        if (user.role === "SUPERADMIN") return true // Superadmin bypass
        return user.permissions.includes(code)
    }

    return (
        <UserContext.Provider value={{ user, loading, hasPermission, refreshUser: fetchUser }}>
            {children}
        </UserContext.Provider>
    )
}

export const useUser = () => useContext(UserContext)
