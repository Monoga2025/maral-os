import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import AppLayout from './components/layout/AppLayout'
import MobileLayout from './components/layout/MobileLayout'
import { TourProvider } from './components/tour/TourProvider'
import { ErrorBoundary } from './components/ErrorBoundary'
import { RequireRole } from './components/auth/RequireRole'
import { useMobile } from './hooks/useMobile'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import ClientDetail from './pages/ClientDetail'
import ClientForm from './pages/ClientForm'
import Quotations from './pages/Quotations'
import QuotationForm from './pages/QuotationForm'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import OrderForm from './pages/OrderForm'
import Inventory from './pages/Inventory'
import Production from './pages/Production'
import Purchases from './pages/Purchases'
import Credit from './pages/Credit'
import InvoiceDetail from './pages/InvoiceDetail'
import Catalog from './pages/Catalog'
import ProductForm from './pages/ProductForm'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Manual from './pages/Manual'
import Tareas from './pages/Tareas'
import Gastos from './pages/Gastos'
import Whatsapp from './pages/Whatsapp'
import Campaigns from './pages/Campaigns'
import CampaignComposer from './components/campaigns/CampaignComposer'
import CampaignWizard from './pages/CampaignWizard'
import CampaignLiveView from './components/campaigns/CampaignLiveView'
import ImageLibrary from './pages/ImageLibrary'
import CampaignLeads from './pages/CampaignLeads'
import CampaignReports from './pages/CampaignReports'
import Tags from './pages/Tags'
import MobileDashboard from './pages/mobile/MobileDashboard'
import MobileOrders from './pages/mobile/MobileOrders'
import MobileClients from './pages/mobile/MobileClients'
import MobileQuotations from './pages/mobile/MobileQuotations'
import MobileGastos from './pages/mobile/MobileGastos'
import MobileTareas from './pages/mobile/MobileTareas'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isMobile = useMobile()

  return (
    <ErrorBoundary>
      <TourProvider>
        <Routes>
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                {isMobile ? <MobileLayout /> : <AppLayout />}
              </ProtectedRoute>
            }
          >
            {/* Dashboard & Tareas - Disponibles para todos los roles */}
            <Route index element={isMobile ? <MobileDashboard /> : <Dashboard />} />
            <Route path="tareas" element={isMobile ? <MobileTareas /> : <Tareas />} />
            <Route path="manual" element={<Manual />} />

            {/* Pedidos & Despachos - Compartido comercial / taller / facturación */}
            <Route path="pedidos" element={isMobile ? <MobileOrders /> : <Orders />} />
            <Route path="pedidos/nuevo" element={<OrderForm />} />
            <Route path="pedidos/:id" element={<OrderDetail />} />

            {/* Comercial & Clientes - Solo Gerente y Ventas */}
            <Route path="clientes" element={
              <RequireRole roles={['GERENTE', 'VENTAS']}>
                {isMobile ? <MobileClients /> : <Clients />}
              </RequireRole>
            } />
            <Route path="clientes/nuevo" element={<RequireRole roles={['GERENTE', 'VENTAS']}><ClientForm /></RequireRole>} />
            <Route path="clientes/:id" element={<RequireRole roles={['GERENTE', 'VENTAS']}><ClientDetail /></RequireRole>} />
            <Route path="clientes/:id/editar" element={<RequireRole roles={['GERENTE', 'VENTAS']}><ClientForm /></RequireRole>} />
            
            <Route path="cotizaciones" element={
              <RequireRole roles={['GERENTE', 'VENTAS']}>
                {isMobile ? <MobileQuotations /> : <Quotations />}
              </RequireRole>
            } />
            <Route path="cotizaciones/nueva" element={<RequireRole roles={['GERENTE', 'VENTAS']}><QuotationForm /></RequireRole>} />
            <Route path="cotizaciones/:id" element={<RequireRole roles={['GERENTE', 'VENTAS']}><QuotationForm /></RequireRole>} />
            <Route path="cotizaciones/:id/editar" element={<RequireRole roles={['GERENTE', 'VENTAS']}><QuotationForm /></RequireRole>} />
            
            <Route path="whatsapp" element={<RequireRole roles={['GERENTE', 'VENTAS']}><Whatsapp /></RequireRole>} />
            <Route path="campanas" element={<RequireRole roles={['GERENTE', 'VENTAS']}><Campaigns /></RequireRole>} />
            <Route path="campanas/nueva" element={<RequireRole roles={['GERENTE', 'VENTAS']}><CampaignWizard /></RequireRole>} />
            <Route path="campanas/:id" element={<RequireRole roles={['GERENTE', 'VENTAS']}><CampaignLiveView /></RequireRole>} />
            <Route path="campanas/:id/editar" element={<RequireRole roles={['GERENTE', 'VENTAS']}><CampaignComposer /></RequireRole>} />
            <Route path="whatsapp/biblioteca" element={<RequireRole roles={['GERENTE', 'VENTAS']}><ImageLibrary /></RequireRole>} />
            <Route path="whatsapp/leads" element={<RequireRole roles={['GERENTE', 'VENTAS']}><CampaignLeads /></RequireRole>} />
            <Route path="reportes/campanas" element={<RequireRole roles={['GERENTE', 'VENTAS']}><CampaignReports /></RequireRole>} />
            <Route path="etiquetas" element={<RequireRole roles={['GERENTE', 'VENTAS']}><Tags /></RequireRole>} />

            {/* Taller & Producción - Solo Gerente y Logística */}
            <Route path="produccion" element={<RequireRole roles={['GERENTE', 'LOGISTICA']}><Production /></RequireRole>} />
            <Route path="inventario" element={<RequireRole roles={['GERENTE', 'LOGISTICA']}><Inventory /></RequireRole>} />
            <Route path="compras" element={<RequireRole roles={['GERENTE', 'LOGISTICA']}><Purchases /></RequireRole>} />

            {/* Finanzas & Cartera - Solo Gerente y Contadora */}
            <Route path="credito" element={<RequireRole roles={['GERENTE', 'CONTADORA']}><Credit /></RequireRole>} />
            <Route path="facturas/:id" element={<RequireRole roles={['GERENTE', 'CONTADORA']}><InvoiceDetail /></RequireRole>} />
            <Route path="gastos" element={
              <RequireRole roles={['GERENTE', 'CONTADORA']}>
                {isMobile ? <MobileGastos /> : <Gastos />}
              </RequireRole>
            } />
            <Route path="reportes" element={<RequireRole roles={['GERENTE', 'CONTADORA']}><Reports /></RequireRole>} />

            {/* Catálogo de Productos - Gerente, Ventas y Logística */}
            <Route path="catalogo" element={<RequireRole roles={['GERENTE', 'VENTAS', 'LOGISTICA']}><Catalog /></RequireRole>} />
            <Route path="catalogo/nuevo" element={<RequireRole roles={['GERENTE', 'LOGISTICA']}><ProductForm /></RequireRole>} />
            <Route path="catalogo/:id/editar" element={<RequireRole roles={['GERENTE', 'LOGISTICA']}><ProductForm /></RequireRole>} />

            {/* Configuración Administrativa - Solo Gerente */}
            <Route path="configuracion" element={<RequireRole roles={['GERENTE']}><Settings /></RequireRole>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </TourProvider>
    </ErrorBoundary>
  )
}
