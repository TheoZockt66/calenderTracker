"use client"

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

interface PwaInstallContextValue {
  canInstall: boolean
  isInstalled: boolean
  install: () => Promise<boolean>
}

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null)

function getStandaloneState() {
  if (typeof window === "undefined") return false

  const navigatorWithStandalone = window.navigator as Navigator & {
    standalone?: boolean
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  )
}

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(() => getStandaloneState())

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {})
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }

    const handleInstalled = () => {
      setInstallPrompt(null)
      setIsInstalled(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleInstalled)
    }
  }, [])

  const value = useMemo<PwaInstallContextValue>(() => {
    return {
      canInstall: !!installPrompt,
      isInstalled,
      install: async () => {
        if (!installPrompt) return false

        await installPrompt.prompt()
        const choice = await installPrompt.userChoice
        setInstallPrompt(null)

        if (choice.outcome === "accepted") {
          setIsInstalled(true)
          return true
        }

        return false
      },
    }
  }, [installPrompt, isInstalled])

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
    </PwaInstallContext.Provider>
  )
}

export function usePwaInstall() {
  const context = useContext(PwaInstallContext)

  if (!context) {
    throw new Error("usePwaInstall must be used within PwaInstallProvider")
  }

  return context
}
