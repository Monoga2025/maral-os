import { useState, useRef, useEffect } from 'react'
import { HelpCircle } from 'lucide-react'

interface HintProps {
  text: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

export function Hint({ text, side = 'top', className = '' }: HintProps) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!visible) return
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setVisible(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [visible])

  const posClass = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[side]

  const arrowClass = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-800',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-800',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-800',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-800',
  }[side]

  return (
    <div ref={ref} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onClick={() => setVisible((v) => !v)}
        className="text-gray-400 hover:text-blue-500 transition-colors focus:outline-none"
        aria-label="Ayuda"
      >
        <HelpCircle size={14} />
      </button>

      {visible && (
        <div className={`absolute z-50 ${posClass} w-56 pointer-events-none`}>
          <div className="bg-gray-800 text-white text-xs rounded-lg px-3 py-2 leading-relaxed shadow-lg">
            {text}
          </div>
          <div className={`absolute w-0 h-0 border-4 ${arrowClass}`} />
        </div>
      )}
    </div>
  )
}
