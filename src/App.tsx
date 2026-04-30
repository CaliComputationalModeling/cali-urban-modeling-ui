import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AppRouter } from '@/app/router'
import { useAuthStore } from '@/store/authStore'

export const App = () => {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <BrowserRouter>
      <AppRouter />
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            fontFamily: 'var(--font-sans)',
          },
        }}
      />
    </BrowserRouter>
  )
}
