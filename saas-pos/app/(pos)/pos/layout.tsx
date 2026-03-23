"use client"

export default function POSLayout({ children }: { children: React.ReactNode }) {

    return (
        <div className="flex flex-col h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
            {/* Minimal header */}
            <header className="flex items-center gap-4 px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
                <button
                    onClick={() => {
                        window.open("/", "_blank")
                        window.close()
                    }}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs font-black uppercase tracking-widest"
                >
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                    <span className="hidden sm:inline">Volver</span>
                </button>
                <div className="h-5 w-px bg-slate-700" />
                <div className="flex items-center gap-2">
                    <div className="size-7 bg-primary rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-sm">point_of_sale</span>
                    </div>
                    <span className="text-white font-black text-sm tracking-tight">SaaS<span className="text-primary">POS</span></span>
                </div>
            </header>
            <div className="flex-1 overflow-hidden">
                {children}
            </div>
        </div>
    )
}
