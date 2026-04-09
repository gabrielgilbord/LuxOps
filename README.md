# LuxOps CRM Solar (MVP v1)

MVP SaaS para empresas instaladoras solares:

- Dashboard visual de obras por estado.
- Vista mobile-first de operario con checklist y subida de fotos.
- Generador de informe PDF (mockup funcional de interfaz).
- Base de datos modelada con Prisma para PostgreSQL/Supabase.

## Stack

- Next.js (App Router)
- Tailwind CSS + Shadcn UI
- Prisma ORM + PostgreSQL
- Lucide React

## Arranque local

1) Instala dependencias:

```bash
npm install
```

2) Configura `.env` con tu cadena de Supabase:

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?schema=public"
```

3) Genera cliente Prisma:

```bash
npx prisma generate
```

4) Crea migracion y aplica esquema:

```bash
npx prisma migrate dev --name init
```

5) Ejecuta la app:

```bash
npm run dev
```

Abre `http://localhost:3000`.

## Rutas principales

- `/` Dashboard de proyectos en tarjetas.
- `/projects/[id]` Vista de operario (checklist + fotos).
- `/projects/[id]/informe` Mockup de generacion de informe PDF.

## Nota de MVP

Si no hay conexion activa a base de datos, la app muestra datos demo para facilitar pruebas de UI.
