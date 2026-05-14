import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { ErrorBoundary } from '../ErrorBoundary'
import ChatBot from '../ChatBot'
import { TourOverlay } from '../tour/TourOverlay'
import { CommandPalette } from '../CommandPalette'
import HotLeadsToast from '../HotLeadsToast'

export default function AppLayout() {
  const [hotCount, setHotCount] = useState(0)
  const { pathname } = useLocation()
  return (
    <div className="flex bg-[#F8FAFC]" style={{ height: '100dvh' }}>
      <div className="relative shrink-0">
        <Sidebar hotLeadCount={hotCount} />
      </div>

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <ErrorBoundary key={pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      <CommandPalette />
      <ChatBot />
      <TourOverlay />
      <HotLeadsToast onHotCount={setHotCount} />
    </div>
  )
}
