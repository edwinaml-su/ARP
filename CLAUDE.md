# CLAUDE.md — Avante Reports Platform (ARP)

> Memoria permanente del proyecto. Actualizar cada vez que se completen cambios significativos.

---

## ¿Qué es esto?

**Avante Reports Platform** es el tablero de control web para los **13 reportes automatizados de Avante**. Reemplaza la administración manual con un panel parametrizable: catálogo de reportes, horarios (cron), destinatarios, parámetros, historial de ejecuciones y auditoría — todo editable sin tocar código, con control de acceso por roles (RBAC).

> Esta app es la **capa de control y configuración**, no ejecuta los scripts Python. El botón "Ejecutar ahora" registra la corrida y dispara un worker externo vía webhook (`WORKER_WEBHOOK_URL`).

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14 (App Router) + React 18 |
| Lenguaje | TypeScript |
| ORM | Prisma 5 (multiSchema: `avante` + `public`) |
| Base de datos | Supabase / PostgreSQL 17 |
| Auth | Supabase Auth (email + contraseña) |
| Estilos | Tailwind CSS 3 |
| Despliegue | Vercel |

---

## Estructura del proyecto

```
src/
  app/
    (app)/              # Rutas protegidas (requieren auth)
      dashboard/        # KPIs + estado de reportes + ejecuciones recientes
      reports/          # Catálogo de los 13 reportes
        [id]/           # Detalle: horarios, destinatarios, parámetros, deps, ejecuciones
      schedules/        # Horarios cron por reporte
      recipients/       # Destinatarios TO/CC/BCC
      parameters/       # Variables editables (fechas, IDs, rutas)
      executions/       # Historial filtrable por estado
      audit/            # Rastro de cambios (quién, qué, cuándo)
      users/            # Gestión de roles (solo Admin)
    api/
      reports/[id]/run/ # POST → registra ejecución + dispara webhook al worker
      reports/          # CRUD reportes
      schedules/        # CRUD horarios
      recipients/       # CRUD destinatarios
      parameters/       # CRUD parámetros
      users/            # POST → crear usuario (Auth + perfil, solo admin)
      users/[id]/       # PATCH → cambiar rol / activo / contraseña (solo admin)
    auth/
      callback/         # Callback OAuth Supabase
      signout/          # Sign out
    login/              # Página pública de login
  components/
    Sidebar.tsx         # Navegación lateral
    Topbar.tsx          # Barra superior con usuario
    KpiCard.tsx         # Tarjeta de métricas
    StatusBadge.tsx     # Badges: estado ejecución, activo/inactivo, tipo destinatario
    RunButton.tsx       # Botón "Ejecutar ahora" (client component)
    actions.tsx         # InlineToggle, DeleteButton, EditableValue
    forms.tsx           # AddSchedule, AddRecipient, AddParameter, RoleSelect, AddUser, SetPassword
  lib/
    auth.ts             # requireUser(), requireRole(), canEdit(), getSessionUser()
    api-auth.ts         # apiGuard() para API routes
    prisma.ts           # Cliente Prisma singleton
    db.ts               # Helpers DB adicionales
    cron.ts             # describeCron() — texto legible de expresiones cron
    format.ts           # formatDateTime, formatDate, formatDuration, formatRelative
    supabase/           # client.ts / server.ts / middleware.ts
  middleware.ts         # Protección de rutas con Supabase SSR
prisma/
  schema.prisma         # Modelos: ReportDefinition, Schedule, Recipient, Parameter,
                        #          Dependency, Execution, AuditLog, Profile
supabase/
  schema.sql            # DDL completo (estructura + RBAC)
  seed.sql              # Datos iniciales
  full_setup.sql        # Setup consolidado (316 líneas, sin commitear aún)
docs/
  01_Especificaciones_Tecnicas.pdf
  02_Repositorio_Base.tar.gz
  03_Database_Schema.sql
  04_DAG_Ejemplo_DRSV.py
```

---

## Modelos de base de datos (schema `avante`)

| Modelo | Tabla | Notas |
|---|---|---|
| `ReportDefinition` | `report_definitions` | Los 13 reportes, con code único |
| `Schedule` | `schedules` | Cron expressions por reporte |
| `Recipient` | `recipients` | TO/CC/BCC, flag `onlyInProd` |
| `Parameter` | `parameters` | Key/value editables, flag `isSecret` |
| `Dependency` | `dependencies` | Librerías/servicios requeridos |
| `Execution` | `executions` | Historial: queued/running/success/failed/timeout |
| `AuditLog` | `audit_log` | Cambios automáticos en dest/param/horarios |
| `Profile` | `profiles` (schema `public`) | Rol RBAC ligado a Supabase Auth |

---

## RBAC (Roles)

| Rol | Permisos |
|---|---|
| **admin** | Todo: gestionar usuarios, reportes, configuración |
| **editor** | Editar horarios, destinatarios, parámetros; ejecutar reportes |
| **viewer** | Solo lectura |

- El **primer usuario registrado** se vuelve Admin automáticamente.
- `eaguirre@complejoavante.com` y `emartinez@complejoavante.com` siempre son Admin.
- El resto entra como Viewer; un Admin puede promoverlos desde /users.

---

## Variables de entorno

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://dmacokzcfpjpoqxksoyw.supabase.co` (ya configurada) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Llave publishable Supabase (ya configurada) |
| `SUPABASE_SERVICE_ROLE_KEY` | Llave **service_role** (SECRETA, solo servidor) — requerida por `/users` para crear usuarios y cambiar contraseñas |
| `DATABASE_URL` | Conexión Prisma pooler (puerto 6543) — **requiere contraseña real** |
| `DIRECT_URL` | Conexión directa (puerto 5432) — **requiere contraseña real** |
| `WORKER_WEBHOOK_URL` | *(opcional)* Endpoint del worker externo |
| `WORKER_WEBHOOK_TOKEN` | *(opcional)* Bearer token para el webhook |

> **Supabase project**: `dmacokzcfpjpoqxksoyw`  
> Para obtener las URLs de BD: Supabase Dashboard → Project Settings → Database → Connection string.

---

## Comandos

```bash
# Instalar dependencias
npm install

# Dev server
npm run dev   # → http://localhost:3000

# Build producción
npm run build

# Regenerar cliente Prisma (si se cambia schema.prisma)
npx prisma generate

# Aplicar migraciones (requiere DIRECT_URL real)
npx prisma db push
```

---

## Estado actual del proyecto (2026-06-22)

### ✅ Completado (un solo commit inicial)
- Plataforma completa funcional con todas las páginas del spec
- Dashboard con KPIs, estado por reporte, ejecuciones recientes
- CRUD completo: horarios, destinatarios, parámetros
- Detalle de reporte con todas las secciones (deps, historial)
- Historial de ejecuciones con filtro por estado
- Auditoría automática de cambios
- Gestión de usuarios y roles
- Auth Supabase con middleware de protección de rutas
- Botón "Ejecutar ahora" con webhook al worker externo
- RBAC completo (admin/editor/viewer)
- `supabase/full_setup.sql` — SQL consolidado (DDL + RBAC + seed), **sin commitear**

### ⚠️ Pendiente / Por resolver
1. **`.env.local` tiene DATABASE_URL placeholder** — necesita la contraseña real de Supabase para conectarse a la BD. Sin esto la app no funciona localmente.
2. **`supabase/full_setup.sql` sin commitear** — decidir si se agrega al repo (es el setup completo de BD).
3. **Worker externo no implementado** — el webhook está preparado pero el worker Python que ejecuta los scripts reales (Odoo, SMTP, Playwright) es un proyecto separado.
4. **Vercel deployment** — `vercel.json` presente, pendiente configurar variables de entorno en Vercel para producción.

---

## Flujo de ejecución de un reporte

1. Usuario hace clic en "Ejecutar ahora" → `RunButton.tsx`
2. `POST /api/reports/[id]/run` → crea `Execution` con status `queued`
3. Si `WORKER_WEBHOOK_URL` está configurado → hace `POST` al worker con `{ reportCode, executionId, triggeredBy }`
4. El worker externo (Python) ejecuta el script, luego actualiza el `Execution` vía API (pendiente implementar ese endpoint de callback)

---

## Notas de arquitectura

- **No usar `localStorage`** — el middleware de Supabase usa cookies SSR.
- **`export const dynamic = "force-dynamic"`** en todas las páginas app — datos siempre frescos.
- **Prisma multiSchema** — modelos en schema `avante` (`@@schema("avante")`) y `Profile` en schema `public` (`@@schema("public")`).
- Tailwind usa clase custom `avante-navy` (definida en `tailwind.config.ts`) y clases utilitarias `.card`, `.th`, `.td` en `globals.css`.
- API routes usan `apiGuard(rol)` de `lib/api-auth.ts` para autenticación y autorización.
