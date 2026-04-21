import axios from 'axios'
import type {
  Client,
  Product,
  ProductComponent,
  Quotation,
  Order,
  ProductionOrder,
  Invoice,
  Supplier,
  PurchaseOrder,
  DashboardData,
  PaginatedResponse,
  InventoryMovement,
  User,
  Task,
  Expense,
} from '../types'
import type {
  CreateQuotationRequest,
  UpdateQuotationRequest,
  CreateOrderRequest,
  CreateProductionRequest,
  InventoryMovementRequest,
  CreatePurchaseRequest,
  CreateClientRequest,
  UpdateClientRequest,
  CreateProductRequest,
  UpdateProductRequest,
  UpdateProductComponentsRequest,
} from './contracts'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: User }>('/auth/login', { email, password }),
  me: () => api.get<User>('/auth/me'),
}

// Dashboard
export const dashboardApi = {
  getSummary: () => api.get<DashboardData>('/dashboard/kpis'),
  getSalesChart: () => api.get<{ month: string; label: string; sales: number; orders: number }[]>('/dashboard/sales-chart'),
  getSalesByLine: () => api.get<{ byLine: { line: string; revenue: number; units: number; percentage: number }[] }>('/dashboard/sales-by-line'),
}

// Clients
export const clientsApi = {
  getAll: (params?: {
    search?: string
    category?: string
    city?: string
    isActive?: boolean
    page?: number
    pageSize?: number
  }) => api.get<PaginatedResponse<Client>>('/clients', { params }),
  getById: (id: string) => api.get<Client>(`/clients/${id}`),
  create: (data: CreateClientRequest) => api.post<Client>('/clients', data),
  update: (id: string, data: UpdateClientRequest) =>
    api.put<Client>(`/clients/${id}`, data),
  delete: (id: string) => api.delete(`/clients/${id}`),
  getCities: () => api.get<string[]>('/clients/cities'),
}

// Products
export const productsApi = {
  getAll: (params?: {
    search?: string
    line?: string
    category?: string
    isActive?: boolean
    page?: number
    pageSize?: number
  }) => api.get<PaginatedResponse<Product>>('/products', { params }),
  getById: (id: string) => api.get<Product>(`/products/${id}`),
  create: (data: CreateProductRequest) => api.post<Product>('/products', data),
  update: (id: string, data: UpdateProductRequest) =>
    api.put<Product>(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
  getCritical: () => api.get<Product[]>('/products/low-stock'),
  // Kit components (BOM)
  getComponents: (id: string) =>
    api.get<ProductComponent[]>(`/products/${id}/components`),
  setComponents: (id: string, data: UpdateProductComponentsRequest) =>
    api.put<ProductComponent[]>(`/products/${id}/components`, data),
}

// Quotations
export const quotationsApi = {
  getAll: (params?: {
    search?: string
    status?: string
    clientId?: string
    page?: number
    pageSize?: number
  }) => api.get<PaginatedResponse<Quotation>>('/quotations', { params }),
  getById: (id: string) => api.get<Quotation>(`/quotations/${id}`),
  create: (data: CreateQuotationRequest) =>
    api.post<Quotation>('/quotations', data),
  update: (id: string, data: UpdateQuotationRequest) =>
    api.put<Quotation>(`/quotations/${id}`, data),
  delete: (id: string) => api.delete(`/quotations/${id}`),
  convertToOrder: (id: string, data: import('./contracts').ConvertToOrderRequest) =>
    api.post<Order>(`/quotations/${id}/convert-to-order`, data),
  duplicate: (id: string) => api.post<Quotation>(`/quotations/${id}/duplicate`),
  updateStatus: (id: string, status: string) =>
    api.patch<Quotation>(`/quotations/${id}/status`, { status }),
  downloadPDF: async (id: string, _number: number | string): Promise<void> => {
    const token = localStorage.getItem('token')
    // Opens HTML in new tab — user prints/saves as PDF from browser
    const url = `/api/quotations/${id}/html?token=${encodeURIComponent(token || '')}`
    window.open(url, '_blank')
  },
  viewPDF: async (id: string): Promise<void> => {
    const token = localStorage.getItem('token')
    const url = `/api/quotations/${id}/html?token=${encodeURIComponent(token || '')}`
    window.open(url, '_blank')
  },
  parseQuotationImage: (imageBase64: string, mimeType: string) =>
    api.post<{
      clientName: string | null
      notes: string | null
      items: { productName: string; productReference: string | null; qty: number; unitPrice: number; discount: number }[]
    }>('/ai/parse-quotation-image', { imageBase64, mimeType }),
}

// Orders
export const ordersApi = {
  getAll: (params?: {
    search?: string
    status?: string
    clientId?: string
    page?: number
    pageSize?: number
  }) => api.get<PaginatedResponse<Order>>('/orders', { params }),
  getById: (id: string) => api.get<Order>(`/orders/${id}`),
  create: (data: CreateOrderRequest) => api.post<Order>('/orders', data),
  update: (id: string, data: Partial<CreateOrderRequest>) =>
    api.put<Order>(`/orders/${id}`, data),
  updateStatus: (id: string, status: string) =>
    api.patch<Order>(`/orders/${id}/status`, { status }),
  updateItemDisposition: (orderId: string, itemId: string, disposition: string) =>
    api.patch(`/orders/${orderId}/items/${itemId}/disposition`, { disposition }),
  pickItem: (orderId: string, itemId: string, picked: boolean) =>
    api.patch(`/orders/${orderId}/items/${itemId}/pick`, { picked }),
  uploadPhoto: (id: string, formData: FormData) =>
    api.post(`/orders/${id}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  generateDispatchPdf: (id: string) =>
    api.get(`/orders/${id}/dispatch-pdf`, { responseType: 'arraybuffer' }),
}

// Inventory
export const inventoryApi = {
  getAll: (params?: {
    search?: string
    line?: string
    category?: string
    page?: number
    pageSize?: number
  }) => api.get<PaginatedResponse<Product>>('/inventory', { params }),
  registerMovement: (data: InventoryMovementRequest) =>
    api.post<InventoryMovement>('/inventory/movement', data),
  getMovements: (productId?: string) =>
    api.get<InventoryMovement[]>('/inventory/movements', {
      params: { productId },
    }),
}

// Production
export const productionApi = {
  getAll: (params?: {
    status?: string
    phase?: string
    assignedTo?: string
    page?: number
    pageSize?: number
  }) =>
    api.get<PaginatedResponse<ProductionOrder>>('/production', { params }),
  getById: (id: string) => api.get<ProductionOrder>(`/production/${id}`),
  create: (data: CreateProductionRequest) =>
    api.post<ProductionOrder>('/production', data),
  update: (id: string, data: Partial<CreateProductionRequest>) =>
    api.put<ProductionOrder>(`/production/${id}`, data),
  updateStatus: (id: string, status: string) =>
    api.patch<ProductionOrder>(`/production/${id}/status`, { status }),
}

// Purchases
export const purchasesApi = {
  getAll: (params?: {
    status?: string
    supplierId?: string
    page?: number
    pageSize?: number
  }) => api.get<PaginatedResponse<PurchaseOrder>>('/purchases', { params }),
  getById: (id: string) => api.get<PurchaseOrder>(`/purchases/${id}`),
  create: (data: CreatePurchaseRequest) =>
    api.post<PurchaseOrder>('/purchases', data),
  update: (id: string, data: Partial<CreatePurchaseRequest>) =>
    api.put<PurchaseOrder>(`/purchases/${id}`, data),
  receive: (id: string, itemIds?: string[]) =>
    api.put(`/purchases/${id}/receive`, itemIds ? { itemIds } : {}),
  getSuppliers: () => api.get<Supplier[]>('/suppliers'),
  createSupplier: (data: Partial<Supplier>) =>
    api.post<Supplier>('/suppliers', data),
}

// Invoices / Credit
export const invoicesApi = {
  getAll: (params?: {
    status?: string
    clientId?: string
    page?: number
    pageSize?: number
  }) => api.get<PaginatedResponse<Invoice>>('/invoices', { params }),
  getById: (id: string) => api.get<Invoice>(`/invoices/${id}`),
  registerPayment: (id: string, amount: number, notes?: string) =>
    api.put(`/invoices/${id}/pay`, { amount, notes }),
  getCreditSummary: () =>
    api.get<{
      totalVigente: number
      totalVencida: number
      proximaVencer: number
      byClient: {
        client: Client
        cupo: number
        usado: number
        disponible: number
        diasMora: number
        factoringStatus: string
      }[]
    }>('/invoices/credit-summary'),
}

// Reports
export const reportsApi = {
  getSalesReport: (from: string, to: string) =>
    api.get('/reports/sales', { params: { from, to } }),
  getOperationsReport: (from: string, to: string) =>
    api.get('/reports/operations', { params: { from, to } }),
}

// Users
export const usersApi = {
  getAll: () => api.get<User[]>('/users'),
  getById: (id: string) => api.get<User>(`/users/${id}`),
  create: (data: { name: string; email: string; password: string; role: string }) =>
    api.post<User>('/users', data),
  update: (id: string, data: Partial<User> & { password?: string }) =>
    api.put<User>(`/users/${id}`, data),
  deactivate: (id: string) => api.delete(`/users/${id}`),
}

// Tasks (comunicación interna)
export const tasksApi = {
  getAll: (params?: {
    status?: string
    priority?: string
    assignedToId?: string
    createdById?: string
    clientId?: string
    orderId?: string
  }) => api.get<Task[]>('/tasks', { params }),
  getById: (id: string) => api.get<Task>(`/tasks/${id}`),
  create: (data: {
    title: string
    description?: string
    priority?: 'URGENTE' | 'NORMAL' | 'DESPUES'
    assignedToId: string
    clientId?: string
    orderId?: string
    dueDate?: string
  }) => api.post<Task>('/tasks', data),
  update: (id: string, data: Partial<Task>) =>
    api.put<Task>(`/tasks/${id}`, data),
  updateStatus: (id: string, status: string) =>
    api.patch<Task>(`/tasks/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/tasks/${id}`),
}

// Expenses (caja menor / gastos)
export const expensesApi = {
  getAll: (params?: {
    type?: string
    from?: string
    to?: string
    page?: number
    limit?: number
  }) =>
    api.get<{ data: Expense[]; pagination: { page: number; limit: number; total: number; pages: number }; totals: Record<string, number> }>(
      '/expenses',
      { params }
    ),
  getById: (id: string) => api.get<Expense>(`/expenses/${id}`),
  create: (data: {
    date: string
    concept: string
    amount: number
    type: 'CAJA_MENOR' | 'TARJETA'
    receiptUrl?: string
    notes?: string
  }) => api.post<Expense>('/expenses', data),
  approve: (id: string) => api.patch<Expense>(`/expenses/${id}/approve`),
  uploadReceipt: (id: string, formData: FormData) =>
    api.post<Expense>(`/expenses/${id}/receipt`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
}
