-- =====================================================================
-- Migracion: Planes de datos moviles (lineas contratadas)
-- Proyecto: nexus-it
-- Fecha: 2026-09-15
--
-- Registra planes de datos moviles (SIM/hotspot) contratados por la
-- empresa para monitorear el gasto mensual. Solo datos del contrato
-- (proveedor, numero, plan, limite de GB, costo mensual, dia de corte),
-- NO telemetria de uso/consumo real. Vinculable opcionalmente a un
-- equipo existente.
--
-- Nota: esta base usa permisos por usuario (private.has_nexus_permission,
-- ver profiles.permissions) en vez de aislamiento por company via
-- current_company(), a diferencia del esquema original de nexus-it antes
-- de consolidarse. Las politicas de este archivo siguen el mismo patron
-- que equipment/tickets para mantener consistencia con el resto del
-- sistema.
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

drop policy if exists data_plans_select_authorized on public.data_plans;
create policy data_plans_select_authorized on public.data_plans
  for select using (
    private.has_nexus_permission('data_plans.view') or private.has_nexus_permission('data_plans.manage')
  );

drop policy if exists data_plans_insert_managers on public.data_plans;
create policy data_plans_insert_managers on public.data_plans
  for insert with check (private.has_nexus_permission('data_plans.manage'));

drop policy if exists data_plans_update_managers on public.data_plans;
create policy data_plans_update_managers on public.data_plans
  for update using (private.has_nexus_permission('data_plans.manage'))
  with check (private.has_nexus_permission('data_plans.manage'));

drop policy if exists data_plans_delete_managers on public.data_plans;
create policy data_plans_delete_managers on public.data_plans
  for delete using (private.has_nexus_permission('data_plans.manage'));
