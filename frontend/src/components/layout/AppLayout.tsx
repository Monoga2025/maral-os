import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { ErrorBoundary } from '../ErrorBoundary'
import ChatBot from '../ChatBot'
import { TourOverlay } from '../tour/TourOverlay'
import { CommandPalette } from '../CommandPalette'

export default function AppLayout() {
  return (
    <div className="flex bg-[#F8FAFC]" style={{ height: '100dvh' }}>
      <div className="relative shrink-0">
        <Sidebar />
      </div>

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      <CommandPalette />
      <ChatBot />
      <TourOverlay />
    </div>
  )
}
