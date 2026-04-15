import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { TOURS, type Tour, type TourStep } from './tours'

interface TourContextValue {
  activeTour: Tour | null
  currentStep: TourStep | null
  stepIndex: number
  totalSteps: number
  startTour: (tourId: string) => void
  nextStep: () => void
  prevStep: () => void
  endTour: () => void
  hasSeenTour: (tourId: string) => boolean
  showWelcome: boolean
  dismissWelcome: () => void
}

const TourContext = createContext<TourContextValue | null>(null)

const STORAGE_PREFIX = 'maral-tour-done-'
const WELCOME_KEY = 'maral-welcome-seen'

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [activeTour, setActiveTour] = useState<Tour | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [showWelcome, setShowWelcome] = useState(false)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    const seen = localStorage.getItem(WELCOME_KEY)
    if (!seen) setShowWelcome(true)
  }, [])

  const hasSeenTour = useCallback((tourId: string) => {
    return !!localStorage.getItem(`${STORAGE_PREFIX}${tourId}`)
  }, [])

  const startTour = useCallback((tourId: string) => {
    const tour = TOURS[tourId]
    if (!tour) return
    setActiveTour(tour)
    setStepIndex(0)
  }, [])

  const nextStep = useCallback(() => {
    if (!activeTour) return
    if (stepIndex < activeTour.steps.length - 1) {
      setStepIndex((i) => i + 1)
    } else {
      // Mark as done
      localStorage.setItem(`${STORAGE_PREFIX}${activeTour.id}`, '1')
      setActiveTour(null)
      setStepIndex(0)
    }
  }, [activeTour, stepIndex])

  const prevStep = useCallback(() => {
    if (stepIndex > 0) setStepIndex((i) => i - 1)
  }, [stepIndex])

  const endTour = useCallback(() => {
    if (activeTour) {
      localStorage.setItem(`${STORAGE_PREFIX}${activeTour.id}`, '1')
    }
    setActiveTour(null)
    setStepIndex(0)
  }, [activeTour])

  const dismissWelcome = useCallback(() => {
    localStorage.setItem(WELCOME_KEY, '1')
    setShowWelcome(false)
  }, [])

  // Escape cierra tour o welcome modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (showWelcome) {
        dismissWelcome()
      } else if (activeTour) {
        if (activeTour) localStorage.setItem(`${STORAGE_PREFIX}${activeTour.id}`, '1')
        setActiveTour(null)
        setStepIndex(0)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showWelcome, activeTour, dismissWelcome])

  const currentStep = activeTour ? activeTour.steps[stepIndex] : null

  return (
    <TourContext.Provider
      value={{
        activeTour,
        currentStep,
        stepIndex,
        totalSteps: activeTour?.steps.length ?? 0,
        startTour,
        nextStep,
        prevStep,
        endTour,
        hasSeenTour,
        showWelcome,
        dismissWelcome,
      }}
    >
      {children}
    </TourContext.Provider>
  )
}

export function useTour() {
  const ctx = useContext(TourContext)
  if (!ctx) throw new Error('useTour must be used within TourProvider')
  return ctx
}
