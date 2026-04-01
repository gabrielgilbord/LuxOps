# Supabase Storage Setup (LuxOps)

## Buckets a crear

1. `luxops-assets` (privado)
   - Uso:
     - logos de empresa
     - fotos de obra
     - firmas del cliente
   - Esta app usa `SUPABASE_SERVICE_ROLE_KEY` en backend para subir/leer.
   - Recomendado: **Private bucket** (no público).

## Estructura de paths sugerida

- `organizations/<orgId>/logo-<timestamp>.<ext>`
- `organizations/<orgId>/projects/<projectId>/photos/<operationId>.<ext>`
- `organizations/<orgId>/projects/<projectId>/signatures/<operationId>.<ext>`

## Variables necesarias

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Política recomendada

- Mantener bucket privado.
- No exponer subida directa desde cliente con anon key.
- Todas las subidas/descargas pasan por backend seguro.

## Cron para reintentos de notificaciones

Endpoint:

- `POST /api/jobs/notifications`

Header:

- `Authorization: Bearer <CRON_SECRET>`

Variable:

```env
CRON_SECRET=un-secreto-largo
```
