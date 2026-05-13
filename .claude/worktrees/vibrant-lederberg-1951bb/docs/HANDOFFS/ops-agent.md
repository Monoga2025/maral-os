# HANDOFF — Ops Agent

> Última actualización: 2026-03-31
> Para el agente que trabaje en infraestructura, deploy, Docker, variables de entorno y operaciones

---

## Estado actual de la infraestructura

### Deploy
- **Plataforma:** EasyPanel (Docker)
- **Base:** docker-compose.yml en la raíz del repo
- **Servicios:** PostgreSQL + Backend (Node.js) + Frontend (nginx/estático)

### Variables de entorno

**Backend (`backend/.env.example`):**
```
DATABASE_URL=postgresql://user:password@db:5432/maral
JWT_SECRET=<cambiar en producción>
NODE_ENV=production
PORT=3001
UPLOAD_DIR=./uploads
CORS_ORIGIN=https://yourdomain.com
```

**Frontend:** Sin variables de entorno propias. La URL de la API está hardcodeada a `/api` (resuelve por proxy nginx).

---

## Problemas críticos

### P0: JWT Secret sin validación de entorno
**Archivo:** `backend/src/lib/jwt.ts`

El fallback `'fallback-secret-change-in-production'` silencia un error de configuración peligroso.

**Acción:** Verificar que en EasyPanel el `JWT_SECRET` esté configurado correctamente en las variables de entorno del servicio backend.

**Verificación:**
```bash
docker exec maral-os-backend printenv JWT_SECRET
# Si no devuelve nada → el sistema usa el fallback inseguro
```

### Sin backup automático de PostgreSQL
Actualmente no hay ningún job de backup configurado.

**Riesgo:** Pérdida total de datos ante fallo del volumen Docker.

**Acción recomendada:** Configurar un cron job en EasyPanel o en el host que ejecute `pg_dump` diariamente y lo guarde en un bucket externo (o al menos en el host).

```bash
# Ejemplo de comando de backup:
docker exec maral-os-postgres pg_dump -U postgres maral > /backups/maral_$(date +%Y%m%d).sql
```

---

## Problemas P1

### Almacenamiento de archivos local
Las fotos de pedidos (`OrderPhoto`) se almacenan en `./uploads` dentro del contenedor backend.

**Riesgo:** Si el contenedor se reinicia sin volumen persistente, se pierden los archivos.

**Verificar:** ¿El directorio `./uploads` está montado como volumen en docker-compose.yml?

Si no está montado:
```yaml
# Agregar en docker-compose.yml bajo el servicio backend:
volumes:
  - ./uploads:/app/uploads
```

### CORS en producción
El backend debe tener `CORS_ORIGIN` configurado con el dominio real, no `'*'`.

**Verificar en EasyPanel** que `CORS_ORIGIN` esté configurado con la URL del frontend.

### Sin rate limiting
La API no tiene protección contra fuerza bruta ni spam de requests.

**Acción:** Configurar rate limiting en nginx (si EasyPanel lo permite) o agregar `express-rate-limit` al backend.

---

## Checklist de deploy en EasyPanel

### Primera vez:
- [ ] Crear servicio PostgreSQL con las credenciales del .env
- [ ] Crear servicio App desde el repositorio Git
- [ ] Configurar variables de entorno en el servicio backend:
  - `DATABASE_URL`
  - `JWT_SECRET` (generar con `openssl rand -base64 32`)
  - `NODE_ENV=production`
  - `CORS_ORIGIN=https://tu-dominio.com`
- [ ] Correr migraciones:
  ```bash
  docker exec maral-os-backend npx prisma migrate deploy
  ```
- [ ] Correr seed (solo primera vez):
  ```bash
  docker exec maral-os-backend npm run db:seed
  ```

### En cada deploy:
- [ ] EasyPanel construye automáticamente desde el repo
- [ ] Verificar que las migraciones se ejecutaron
- [ ] Verificar que el servicio arrancó correctamente (logs del contenedor)

---

## Comandos útiles

```bash
# Ver logs del backend
docker logs maral-os-backend -f

# Ver logs de la DB
docker logs maral-os-postgres -f

# Conectarse a la DB
docker exec -it maral-os-postgres psql -U postgres -d maral

# Reiniciar backend
docker restart maral-os-backend

# Backup manual de la DB
docker exec maral-os-postgres pg_dump -U postgres maral > backup.sql

# Restaurar backup
docker exec -i maral-os-postgres psql -U postgres maral < backup.sql
```

---

## Estructura de Docker Compose actual

Revisar `docker-compose.yml` en la raíz para:
1. Confirmar que `./uploads` está montado como volumen
2. Confirmar que las variables de entorno se leen desde `.env`
3. Confirmar que el backend depende del servicio postgres con `depends_on`

---

## Tareas pendientes de ops

- [ ] Configurar backup automático de PostgreSQL
- [ ] Verificar montaje del volumen de uploads
- [ ] Configurar CORS_ORIGIN con dominio real
- [ ] Generar JWT_SECRET fuerte en producción
- [ ] Considerar health check endpoints para monitoreo

### Siguiente paso recomendado
1. Revisar `docker-compose.yml` para confirmar configuración de volúmenes
2. Verificar variables de entorno en EasyPanel
3. Configurar job de backup de PostgreSQL
4. Actualizar `docs/AGENT_LOG.md`
