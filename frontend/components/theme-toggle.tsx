"use client"

import { useEffect, useState } from "react"
import { getSession, getStoredToken } from "@/lib/clinic-api"

function WhatsAppIcon({ connected }: { connected: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`size-5 ${connected ? "text-[#25D366]" : "text-red-500"}`} fill="currentColor" aria-hidden="true">
      <path d="M19.05 4.94A9.91 9.91 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.26-1.38a9.91 9.91 0 0 0 4.78 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.91-7.02zm-7.01 15.24h-.01a8.3 8.3 0 0 1-4.23-1.16l-.3-.18-3.12.82.83-3.04-.2-.31a8.25 8.25 0 0 1-1.27-4.4c0-4.58 3.72-8.3 8.3-8.3 2.22 0 4.3.86 5.87 2.43a8.26 8.26 0 0 1 2.43 5.87c0 4.58-3.72 8.3-8.3 8.3zm4.55-6.21c-.25-.12-1.47-.73-1.7-.81-.23-.09-.39-.12-.56.12-.17.25-.64.81-.78.98-.14.17-.29.19-.54.07-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.42.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.86.84-.86 2.05s.88 2.38 1 2.54c.12.17 1.74 2.65 4.21 3.72.59.25 1.05.4 1.4.52.59.19 1.13.16 1.55.1.47-.07 1.47-.6 1.68-1.18.2-.58.2-1.08.14-1.18-.06-.11-.23-.17-.48-.29z" />
    </svg>
  )
}

export function ThemeToggle({ className }: { className?: string }) {
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        const clinicId = getSession()?.clinicId ?? null
        if (!clinicId) return
        const base = process.env.NEXT_PUBLIC_API_URL || ""
        const token = getStoredToken()
        const headers: Record<string,string> = {}
        if (token) headers["Authorization"] = `Bearer ${token}`
        const res = await fetch(`${base}/api/clinics/${clinicId}/whatsapp/session`, { cache: "no-store", headers })
        if (!res.ok) return
        const data = await res.json()
        // supports both /api/whatsapp/session {session:{status}} and /api/clinics/:id/whatsapp/session {connected, stage}
        const isConnected =
          data?.connected === true ||
          data?.session?.connected === true ||
          data?.stage === "ready" ||
          data?.stage === "authenticated" ||
          data?.session?.stage === "ready" ||
          ["connected", "open", "ready", "authenticated"].includes(data?.status) ||
          ["connected", "open", "ready", "authenticated"].includes(data?.session?.status)
        if (!cancelled) setConnected(isConnected)
      } catch {}
    }
    check()
    const id = setInterval(check, 30000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${connected ? "bg-[#25D366]/10 text-[#25D366] ring-[#25D366]/20" : "bg-red-50 text-red-600 ring-red-200"} ${className ?? ""}`} title={connected ? "WhatsApp connected" : "WhatsApp not connected"}>
      <WhatsAppIcon connected={connected} />
      {connected ? "Connected" : "Not connected"}
    </span>
  )
}
