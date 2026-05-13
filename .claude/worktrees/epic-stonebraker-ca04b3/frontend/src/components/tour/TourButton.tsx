import { Sparkles } from 'lucide-react'
import { useTour } from './TourProvider'

export function TourButton({ tourId }: { tourId: string }) {
  const { startTour, hasSeenTour } = useTour()
  const seen = hasSeenTour(tourId)

  return (
    <button
      onClick={() => startTour(tourId)}
      className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        seen
          ? 'border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50'
          : 'bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100'
      }`}
      title="Ver tour de este módulo"
    >
      <Sparkles size={12} />
      {seen ? 'Tour' : '¿Cómo funciona?'}
      {!seen && (
        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
      )}
    </button>
  )
}
