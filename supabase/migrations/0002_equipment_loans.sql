-- =====================================================================
-- Migracion: Prestamos temporales de equipo (cartas responsivas "por dias")
-- Proyecto: nexus-it
-- Fecha: 2026-08-17
--
-- Objetivo: permitir prestar un equipo ya asignado a alguien mas por un
-- numero de dias determinado (ej. 30 dias), dejando registro del
-- prestamo (quien lo tenia antes, quien lo recibe, fecha de devolucion)
-- para poder generar la carta responsiva de prestamo y restaurar la
-- asignacion original cuando se devuelva.
-- =====================================================================

create table if not exists public.equipment_loans (
  id uuid primary key default extensions.uuid_generate_v4(),
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  company text not null,
  borrower_id uuid references public.profiles(id),
  borrower_name text not null,
  previous_assigned_to uuid references public.profiles(id),
  previous_assigned_to_name text,
  loan_date date not null default current_date,
  due_date date not null,
  days integer not null check (days > 0),
  returned_at timestamptz,
  status text not null default 'active' check (status = ANY (ARRAY['active','returned','cancelled'])),
  notes text,
  generated_by uuid references public.profiles(id),
  generated_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists equipment_loans_equipment_id_idx on public.equipment_loans(equipment_id);
create index if not exists equipment_loans_status_idx on public.equipment_loans(status);
create index if not exists equipment_loans_due_date_idx on public.equipment_loans(due_date);

alter table public.equipment_loans enable row level security;

drop policy if exists equipment_loans_all on public.equipment_loans;
create policy equipment_loans_all on public.equipment_loans
  for all using (true) with check (true);

-- Campos denormalizados en equipment para mostrar el estado del prestamo sin join
alter table public.equipment add column if not exists on_loan boolean not null default false;
alter table public.equipment add column if not exists loan_due_date date;
