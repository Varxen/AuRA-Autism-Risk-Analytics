import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthDemo } from '../contexts/AuthDemoContext'
import { demoRouteRedirect } from '../utils/onboarding'

export function DemoRouteGate({ children }: { children: ReactNode }) {
  const { state } = useAuthDemo()
  const { pathname } = useLocation()
  const redirect = demoRouteRedirect(state, pathname)
  useEffect(() => {
    if (redirect || !pathname.startsWith('/onboarding/')) return
    const heading = document.querySelector<HTMLElement>('.onboarding-card h1')
    heading?.setAttribute('tabindex', '-1')
    heading?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
  }, [pathname, redirect])
  return redirect ? <Navigate to={redirect} replace /> : children
}
