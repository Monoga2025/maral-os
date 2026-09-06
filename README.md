# MARAL OS — Plataforma de Gestión Empresarial

Sistema de gestión completo para Maral Tecnología y Comunicaciones S.A.S.

## Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript + Prisma
- **Base de datos**: PostgreSQL 16
- **Deploy**: EasyPanel (Docker)

## Módulos
- Dashboard con KPIs en tiempo real
- CRM / Gestión de Clientes
- Cotizaciones (generador de PDF)
- Pedidos (kanban + tabla)
- Producción (3 fases: Básico / Preensamble / Ensamble)
- Inventario con alertas de stock mínimo
- Compras y proveedores
- Crédito y cartera (factoring FINANCIA)
- Catálogo de productos
- Reportes y exportación

## Acceso inicial
No hay cuentas ni credenciales predeterminadas publicadas. Creá el acceso inicial mediante un proceso administrativo seguro y rotá las credenciales que hubieran estado expuestas anteriormente.

## Desarrollo local

```bash
# 1. Clonar y preparar la configuración local
cp .env.example .env

# 2. Reemplazar todos los placeholders de .env con valores locales seguros

# 3. Levantar con Docker Compose
docker compose up -d

# App disponible en: http://localhost
# API en: http://localhost:3001
```

Las migraciones se aplican al iniciar el contenedor del backend mediante `prisma migrate deploy`. Ejecutá el seed únicamente cuando necesites cargar datos no productivos de forma intencional; nunca lo uses para un despliegue de producción.

## Deploy en EasyPanel

1. Subir el código a un repositorio Git
2. En EasyPanel crear:
   - Servicio **PostgreSQL** configurado con variables de entorno seguras
   - Servicio **App** desde el repositorio (usa `docker-compose.yml`)
3. Configurar las variables de entorno requeridas en EasyPanel
4. Deploy → EasyPanel construye y levanta todo automáticamente

## Estructura
```
maral-os/
├── backend/          # Node.js + Prisma
│   ├── prisma/       # Schema + migrations + seed
│   └── src/          # Routes, middleware, lib
├── frontend/         # React + Vite
│   └── src/          # Pages, components, store
├── docker-compose.yml
└── .env.example
```
