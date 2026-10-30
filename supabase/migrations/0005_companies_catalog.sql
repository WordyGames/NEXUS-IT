-- Catálogo dinámico de empresas (antes era un enum fijo en el código).
create table if not exists public.companies (
  name text primary key check (name = upper(btrim(name)) and char_length(name) between 2 and 80),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);

alter table public.companies enable row level security;

drop policy if exists companies_select on public.companies;
create policy companies_select on public.companies
  for select to authenticated using (true);

drop policy if exists companies_insert on public.companies;
create policy companies_insert on public.companies
  for insert to authenticated
  with check (private.has_nexus_permission('companies.manage'));

insert into public.companies (name) values
  ('EQUIPOS OSENAL'),
  ('ESPECIAS NATURALES DEL NORTE'),
  ('GRUPO AMEX'),
  ('THE SMASHED GRAIL')
on conflict (name) do nothing;
