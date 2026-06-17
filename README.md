# Avante Reports Platform

Panel de control central (web) para los **13 reportes automatizados de Avante**. Reemplaza la administración manual por un tablero parametrizable: catálogo de reportes, horarios (cron), destinatarios, parámetros, historial de ejecuciones y auditoría — todo editable sin tocar código y con control de acceso por roles.

Construido con **Next.js + TypeScript + Prisma + Supabase (PostgreSQL) + Tailwind CSS**.

> Nota de alcance: esta app es el **tablero de control y configuración** (la capa de presentación de la spec original). No corre los scripts Python de los reportes (eso requiere Odoo, SMTP y Playwright en un worker). El botón **Ejecutar ahora** registra la corrida y, si configuras `WORKER_WEBHOOK_URL`, dispara un worker externo vía webhook.

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14 (App Router) + React 18 |
| Lenguaje | TypeScript |
| ORM | Prisma 5 (multiSchema: `avante` + `public`) |
| Base de datos | Supabase / PostgreSQL 17 |
| Autenticación | Supabase Auth (email + contraseña) |
| Estilos | Tailwind CSS 3 |
| Despliegue | Vercel |

## Funcionalidad

- **Panel**: KPIs (reportes activos, ejecuciones 24h, éxitos/fallos), estado por reporte y ejecuciones recientes.
- **Reportes**: catálogo de los 13 reportes con detalle y edición de cada sección.
- **Horarios**: expresiones cron por reporte, con descripción legible de la frecuencia.
- **Destinatarios**: TO/CC/BCC por reporte, flag `solo prod`, y matriz de quién recibe qué.
- **Parámetros**: variables editables (fechas, IDs, rutas) con edición inline.
- **Ejecuciones**: historial filtrable por estado.
- **Auditoría**: rastro automático de cambios (quién, qué, cuándo) en destinatarios, parámetros y horarios.
- **Usuarios**: gestión de roles (solo Admin).

### Roles (RBAC)

| Rol | Puede |
|---|---|
| **Administrador** | Todo, incluido gestionar usuarios y reportes |
| **Editor** | Editar horarios, destinatarios y parámetros; ejecutar reportes |
| **Lector** | Solo lectura |

El **primer usuario que se registre** se vuelve Administrador automáticamente. Además, `eaguirre@complejoavante.com` y `emartinez@complejoavante.com` siempre se crean como Admin. El resto entra como Lector y un Admin puede promoverlos desde **Usuarios**.

---

## Configuración local

```bash
# 1. Instalar dependencias (genera el cliente Prisma automáticamente)
npm install

# 2. Variables de entorno
cp .env.example .env.local
#    Edita .env.local y completa DATABASE_URL / DIRECT_URL con tu contraseña de BD.

# 3. Correr en desarrollo
npm run dev
#    -> http://localhost:3000
```

### Variables de entorno

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase (ya rellenada con ARP). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Llave publishable de Supabase (ya rellenada). |
| `DATABASE_URL` | Conexión Prisma (pooler 6543). Copia de Supabase → Settings → Database. |
| `DIRECT_URL` | Conexión directa (5432), usada por migraciones. |
| `WORKER_WEBHOOK_URL` | *(opcional)* Endpoint del worker que ejecuta los scripts reales. |
| `WORKER_WEBHOOK_TOKEN` | *(opcional)* Bearer token para el webhook. |

**Obtener `DATABASE_URL` / `DIRECT_URL`:** en el [dashboard de Supabase](https://supabase.com/dashboard/project/dmacokzcfpjpoqxksoyw) → *Project Settings → Database → Connection string*. Si no recuerdas la contraseña, usa *Reset database password*. Pega la cadena del **Transaction pooler** en `DATABASE_URL` y la **Direct connection** en `DIRECT_URL`.

> El proyecto Supabase **ARP** (`dmacokzcfpjpoqxksoyw`) ya está creado y con el esquema `avante` + los 13 reportes cargados. No necesitas correr migraciones para empezar.

---

## Base de datos

El esquema completo está en [`supabase/schema.sql`](./supabase/schema.sql) (estructura + RBAC) y los datos en [`supabase/seed.sql`](./supabase/seed.sql) / [`docs/03_Database_Schema.sql`](./docs/03_Database_Schema.sql) (set completo original).

El modelo de Prisma (`prisma/schema.prisma`) es un espejo del esquema `avante` más la tabla `public.profiles` para roles. Para regenerar el cliente tras un cambio: `npm run db:generate`.

### Confirmación de email (importante para el primer login)

Por defecto Supabase pide confirmar el correo. Para uso interno rápido, en el dashboard ve a **Authentication → Sign In / Providers → Email** y desactiva *Confirm email*. Así el registro entra directo. Si lo dejas activo, confirma el correo desde el enlace que llega a la bandeja (la ruta `/auth/callback` ya está implementada).

---

## Despliegue: GitHub + Vercel

### 1. Subir al repositorio `edwinaml-su/ARP`

Desde esta carpeta (`avante_platform`):

```bash
git init
git add .
git commit -m "Avante Reports Platform - panel Next.js + Supabase"
git branch -M main
git remote add origin https://github.com/edwinaml-su/ARP.git
git push -u origin main
```

> Si el repo ya tiene contenido, usa `git pull origin main --allow-unrelated-histories` antes del push, o haz force-push si quieres reemplazarlo.

### 2. Desplegar en Vercel

1. Entra a [vercel.com](https://vercel.com) → **Add New → Project** → importa `edwinaml-su/ARP`.
2. Framework: **Next.js** (autodetectado). Build command ya viene en `vercel.json`.
3. En **Environment Variables**, agrega las mismas de `.env.local`:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`, `DIRECT_URL` (y opcionalmente las del worker).
4. **Deploy**. Al terminar tendrás la URL pública.
5. En Supabase → **Authentication → URL Configuration**, agrega la URL de Vercel a *Site URL* y *Redirect URLs* (para que funcionen los enlaces de confirmación).

---

## Estructura

```
avante_platform/
├── prisma/schema.prisma        # Modelo (espejo de 'avante' + profiles)
├── src/
│   ├── middleware.ts           # Refresco de sesión y guardas de ruta
│   ├── lib/                    # prisma, supabase, auth/RBAC, formato, cron
│   ├── components/             # Sidebar, Topbar, tablas, acciones, formularios
│   └── app/
│       ├── login/              # Inicio de sesión / registro
│       ├── (app)/              # Área autenticada: dashboard, reports, schedules,
│       │                       #   recipients, parameters, executions, audit, users
│       └── api/                # Route handlers CRUD + ejecutar (con RBAC)
├── supabase/                   # schema.sql + seed.sql reproducibles
├── docs/                       # Especificación técnica original (PDF, SQL, DAG)
├── vercel.json
└── .env.example
```

## Conectar un worker real (opcional)

Para que **Ejecutar ahora** dispare la ejecución real de un reporte, expón un endpoint en tu worker (Airflow, Cloud Function, etc.) y ponlo en `WORKER_WEBHOOK_URL`. La app hará `POST` con:

```json
{ "reportCode": "DRSV_DIARIO", "executionId": 123, "triggeredBy": "usuario@complejoavante.com" }
```

El worker corre el script y luego puede actualizar la fila en `avante.executions` (status, duration_sec, emails_sent, output_files). Sin webhook, el botón solo registra la corrida.

---

*AVANTE · Confidencial · Solo uso interno*
