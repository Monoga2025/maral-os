import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import AppLayout from './components/layout/AppLayout'
import { TourProvider } from './components/tour/TourProvider'
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
import Catalog from './pages/Catalog'
import ProductForm from './pages/ProductForm'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Manual from './pages/Manual'
import Tareas from './pages/Tareas'
import Gastos from './pages/Gastos'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return (
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
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="clientes" element={<Clients />} />
        <Route path="clientes/nuevo" element={<ClientForm />} />
        <Route path="clientes/:id" element={<ClientDetail />} />
        <Route path="clientes/:id/editar" element={<ClientForm />} />
        <Route path="cotizaciones" element={<Quotations />} />
        <Route path="cotizaciones/nueva" element={<QuotationForm />} />
        <Route path="cotizaciones/:id" element={<QuotationForm />} />
        <Route path="cotizaciones/:id/editar" element={<QuotationForm />} />
        <Route path="pedidos" element={<Orders />} />
        <Route path="pedidos/nuevo" element={<OrderForm />} />
        <Route path="pedidos/:id" element={<OrderDetail />} />
        <Route path="inventario" element={<Inventory />} />
        <Route path="produccion" element={<Production />} />
        <Route path="compras" element={<Purchases />} />
        <Route path="credito" element={<Credit />} />
        <Route path="tareas" element={<Tareas />} />
        <Route path="gastos" element={<Gastos />} />
        <Route path="catalogo" element={<Catalog />} />
        <Route path="catalogo/nuevo" element={<ProductForm />} />
        <Route path="catalogo/:id/editar" element={<ProductForm />} />
        <Route path="reportes" element={<Reports />} />
        <Route path="configuracion" element={<Settings />} />
        <Route path="manual" element={<Manual />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </TourProvider>
  )
}
