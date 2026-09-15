-- =====================================================================
-- Migracion: Planes de datos moviles (lineas contratadas)
-- Proyecto: nexus-it
-- Fecha: 2026-09-15
--
-- Objetivo: registrar las lineas/planes de datos moviles contratados
-- (SIM, MiFi/hotspot, modem con SIM, etc.) para poder monitorear el
-- gasto mensual total y el limite de datos contratado por linea.
--
-- Alcance de esta version: solo datos del CONTRATO (proveedor, numero,
-- plan, limite de GB, costo mensual, dia de corte). No incluye consumo
-- real de datos (requeriria integrarse con la API de cada proveedor,
-- que normalmente no es publica) — se puede agregar despues como una
-- tabla de lecturas periodicas si se consigue acceso a esa API.
-- =====================================================================

create table if not exists public.data_plans (
  id uuid primary key default extensions.uuid_generate_v4(),
  company text not null,
  provider text not null check (provider = ANY (ARRAY['telcel','att','movistar','unefon','otro'])),
  provider_other text,
  phone_number text not null,
  plan_name text not null,
  data_limit_gb numeric,
  monthly_cost numeric not null default 0,
  billing_day integer not null check (billing_day between 1 and 31),
  equipment_id uuid references public.equipment(id) on delete set null,
  status text not null default 'active' check (status = ANY (ARRAY['active','suspended','cancelled'])),
  contract_start_date date,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists data_plans_company_idx on public.data_plans(company);
create index if not exists data_plans_equipment_id_idx on public.data_plans(equipment_id);
create index if not exists data_plans_status_idx on public.data_plans(status);

alter table public.data_plans enable row level security;

-- Mismo esquema de aislamiento por tenant que equipment/tickets (migracion 0001).
drop policy if exists data_plans_tenant_select on public.data_plans;
create policy data_plans_tenant_select on public.data_plans
  for select using (company = public.current_company());

drop policy if exists data_plans_tenant_insert on public.data_plans;
create policy data_plans_tenant_insert on public.data_plans
  for insert with check (company = public.current_company());

drop policy if exists data_plans_tenant_update on public.data_plans;
create policy data_plans_tenant_update on public.data_plans
  for update using (company = public.current_company())
  with check (company = public.current_company());

drop policy if exists data_plans_tenant_delete on public.data_plans;
create policy data_plans_tenant_delete on public.data_plans
  for delete using (company = public.current_company());
