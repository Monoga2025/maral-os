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

## Usuarios demo
| Rol | Email | Contraseña |
|---|---|---|
| Gerente | john@maral.com | maral2024 |
| Ventas | lady@maral.com | maral2024 |
| Logística | angelo@maral.com | maral2024 |

## Desarrollo local

```bash
# 1. Clonar y configurar variables
cp .env.example .env

# 2. Levantar con Docker Compose
docker compose up -d

# 3. Correr migraciones y seed
docker exec maral-os-backend npx prisma migrate deploy
docker exec maral-os-backend npm run db:seed

# App disponible en: http://localhost
# API en: http://localhost:3001
```

## Deploy en EasyPanel

1. Subir el código a un repositorio Git
2. En EasyPanel crear:
   - Servicio **PostgreSQL** (usar las credenciales del .env)
   - Servicio **App** desde el repositorio (usa docker-compose.yml)
3. Configurar las variables de entorno en EasyPanel
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
