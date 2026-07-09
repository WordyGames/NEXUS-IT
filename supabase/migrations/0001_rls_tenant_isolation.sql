-- =====================================================================
-- Migracion: Row Level Security (RLS) por tenant (company)
-- Proyecto: nexus-it
-- Fecha: 2026-07-04
--
-- Objetivo: la proteccion multi-tenant REAL vive aqui, no en el cliente.
-- El filtro por `company` que se agrego en los servicios TS es defensa
-- en profundidad, pero un cliente con la anon key puede saltarselo si no
-- existen estas policies. Estas policies restringen cada fila al `company`
-- del usuario autenticado.
--
-- ASUNCION: el `company` del usuario se guarda en el JWT como un claim
-- (app_metadata.company) o en una tabla `users` enlazada por auth.uid().
-- Ajusta la funcion `current_company()` segun como quede tu auth real.
-- =====================================================================

-- Helper: devuelve el company del usuario autenticado.
create or replace function public.current_company()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'company', ''),
    (select u.company from public.users u where u.id = auth.uid() limit 1)
  );
$$;

-- ---------------------------------------------------------------------
-- Tabla: equipment
-- ---------------------------------------------------------------------
alter table public.equipment enable row level security;

drop policy if exists equipment_tenant_select on public.equipment;
create policy equipment_tenant_select on public.equipment
  for select using (company = public.current_company());

drop policy if exists equipment_tenant_insert on public.equipment;
create policy equipment_tenant_insert on public.equipment
  for insert with check (company = public.current_company());

drop policy if exists equipment_tenant_update on public.equipment;
create policy equipment_tenant_update on public.equipment
  for update using (company = public.current_company())
  with check (company = public.current_company());

drop policy if exists equipment_tenant_delete on public.equipment;
create policy equipment_tenant_delete on public.equipment
  for delete using (company = public.current_company());

-- ---------------------------------------------------------------------
-- Tabla: tickets
-- ---------------------------------------------------------------------
alter table public.tickets enable row level security;

drop policy if exists tickets_tenant_select on public.tickets;
create policy tickets_tenant_select on public.tickets
  for select using (company = public.current_company());

drop policy if exists tickets_tenant_insert on public.tickets;
create policy tickets_tenant_insert on public.tickets
  for insert with check (company = public.current_company());

drop policy if exists tickets_tenant_update on public.tickets;
create policy tickets_tenant_update on public.tickets
  for update using (company = public.current_company())
  with check (company = public.current_company());

drop policy if exists tickets_tenant_delete on public.tickets;
create policy tickets_tenant_delete on public.tickets
  for delete using (company = public.current_company());

-- ---------------------------------------------------------------------
-- Tabla: ticket_comments (hereda tenant del ticket padre)
-- ---------------------------------------------------------------------
alter table public.ticket_comments enable row level security;

drop policy if exists ticket_comments_tenant_all on public.ticket_comments;
create policy ticket_comments_tenant_all on public.ticket_comments
  for all
  using (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_comments.ticket_id
        and t.company = public.current_company()
    )
  )
  with check (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_comments.ticket_id
        and t.company = public.current_company()
    )
  );
