# SECURITY_FIXES — nexus-it

Fecha: 2026-07-04. Correcciones aplicadas tras auditoría de seguridad.

## 1. Credenciales hardcodeadas en scripts de admin

**Archivos:** `setup-admin.js`, `test-auth.js`

- Se eliminaron el usuario `lsolis` y la contraseña `Ares1209` hardcodeados.
- Se eliminó el "hash" Base64 (`QXJlczEyMDk=`), que es **reversible** y no es un hash.
- `setup-admin.js` ahora lee `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_NAME` /
  `ADMIN_COMPANY` desde variables de entorno o argumentos CLI (`--username`, etc.),
  y hashea la contraseña con **bcrypt** (`bcryptjs`, 12 rounds) antes de guardarla
  en Firestore. Ya no se imprime la contraseña ni el hash en consola.
- `test-auth.js` ahora compara una contraseña candidata contra un hash bcrypt
  provisto por env/CLI (`TEST_PASSWORD` / `TEST_HASH`), sin datos embebidos.
- Se agregó `bcryptjs` a `dependencies` en `package.json` (JS puro, sin compilación
  nativa — más portable que `bcrypt` en Windows).

### ⚠️ ACCIÓN MANUAL URGENTE DEL USUARIO

- La contraseña **`Ares1209` YA quedó expuesta en el historial de git** (commits
  previos con `setup-admin.js`/`test-auth.js`). Quitarla del código NO la borra del
  historial. **Cambia YA la contraseña real del usuario `lsolis` en el sistema en
  producción**, no solo en el código.
- Considera reescribir el historial (`git filter-repo`) o rotar el repo si es
  sensible, pero eso NO se hizo aquí (regla: no tocar git de este repo).
- Vuelve a hashear/regrabar el usuario admin con el nuevo `setup-admin.js`.

## 2. Claves Firebase / Supabase hardcodeadas → variables de entorno

**Archivos:** `packages/shared/src/config/firebase.ts`, `.../supabase.ts`
**Nuevo helper:** `packages/shared/src/config/env.ts` (accesor cross-runtime que lee
`import.meta.env` en Vite y `process.env` en Expo/Node).

- **Supabase:** URL y anon key ahora se leen de `VITE_SUPABASE_URL` /
  `VITE_SUPABASE_ANON_KEY` (desktop) o `EXPO_PUBLIC_SUPABASE_*` (mobile).
  Si faltan, lanza error explícito (`requireEnv`).
- **Firebase:** toda la config (`apiKey`, `authDomain`, etc.) se lee de
  `VITE_FIREBASE_*` / `EXPO_PUBLIC_FIREBASE_*`. (Firebase es código legacy: ver §5.)
- Se actualizaron `apps/desktop/.env.example` y `apps/mobile/.env.example` con los
  placeholders. El `apps/desktop/.env` real ya tenía `VITE_SUPABASE_*`.

### ⚠️ ACCIÓN MANUAL DEL USUARIO (rotación de claves)

Estas claves quedaron expuestas en el código/historial. **Rótalas:**

- **Supabase anon key + URL** del proyecto `iwnbscekenptumanpjcs`:
  Dashboard Supabase → Project Settings → API → *Rotate anon/public key*.
  (Nota: la anon key es "pública" por diseño, pero la protección depende de RLS —
  ver §3. Rotarla es buena higiene tras exposición.)
- **Firebase apiKey** `AIzaSyBWOjYAajcHeWZ44fkNNngLoRP-Up8EhJg` (proyecto
  `nexus-it-e8568`): Google Cloud Console → APIs & Services → Credentials →
  restringir/regenerar la API key. Aplicar restricciones por dominio/app.
- Tras rotar, coloca los nuevos valores en los `.env` reales (nunca commitear).

## 3. Aislamiento multi-tenant (company) en equipment y tickets

**Archivos:** `packages/shared/src/services/equipment.ts`, `tickets.ts`

- Se agregó un parámetro opcional `company` a `getById`, `update` y `delete`
  (equipos y tickets). Cuando se provee, añade `.eq('company', company)` a la
  operación, extendiendo el filtro de tenant más allá del listado.
- **La protección REAL debe venir de RLS en Supabase.** El filtro en cliente es
  defensa en profundidad; un actor con la anon key podría saltárselo sin RLS.
- Se creó la migración versionada `supabase/migrations/0001_rls_tenant_isolation.sql`
  con `ENABLE ROW LEVEL SECURITY` y policies por `company` para `equipment`,
  `tickets` y `ticket_comments`, más el helper `current_company()`.

### ⚠️ ACCIÓN MANUAL DEL USUARIO

- **Aplicar la migración RLS** en Supabase (`supabase db push` o el SQL editor).
- Ajustar `current_company()` según cómo se propague `company` en el JWT del usuario
  (claim `app_metadata.company`) o la tabla `users`. Verificar que el login setea ese claim.
- Actualizar los llamadores (UI) para pasar el `company` del usuario a
  `getById/update/delete` cuando aplique.

## 4. Duplicidad de despliegues Vercel

Documentado en `NOTES.md`. Hay dos proyectos Vercel (`nexus-it` y `desktop`) con el
mismo código. Decisión operativa del usuario cuál conservar; no se tocó.

## 5. Limpieza de Firebase (legacy)

- `firebase.ts` **NO está exportado** desde `packages/shared/src/index.ts` y **ningún
  servicio lo importa** (el data layer activo es Supabase). Es código muerto.
- No se eliminó para no arriesgar el build (la config de `vite.config.ts` referencia
  el chunk `firebase` y `firebase` está en `dependencies`). Se dejó sin secretos
  (ahora lee de env). **Recomendación:** eliminar `firebase.ts`, la dependencia
  `firebase` de `package.json` y las reglas de chunk en `vite.config.ts` en una
  limpieza dedicada con build verificado.

## Verificación

- `tsc --noEmit` de `packages/shared`: **OK (exit 0)**.
- `tsc --noEmit` de `apps/desktop`: solo 2 errores **preexistentes** en
  `cartaResponsivaPDF.ts` (`setGlobalAlpha` de jsPDF), no relacionados con estos cambios.
- `npm install bcryptjs`: **OK**.
- `vite build` (desktop): **NO se pudo verificar en el sandbox** — falla con
  `Cannot find package 'esbuild'` (binario nativo de esbuild ausente en este entorno
  Linux/Windows sandbox), no por los cambios de código. Verificar el build en el
  entorno real del usuario.

## Pendiente

- Aplicar migración RLS y ajustar `current_company()` (§3).
- Rotar claves Supabase y Firebase (§2) y contraseña de `lsolis` (§1).
- Decidir proyecto Vercel a conservar (§4).
- Limpieza definitiva de Firebase legacy (§5).
- Añadir `.env` de mobile con las `EXPO_PUBLIC_SUPABASE_*` reales.
