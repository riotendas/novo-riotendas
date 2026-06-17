-- RioTendas - Notas de rota definitivas na nuvem
-- Execute no SQL Editor do Supabase para garantir que endereço, edição e exclusão sincronizem em todos os dispositivos.

create table if not exists public.notas_rota (
  id uuid primary key default gen_random_uuid(),
  data_rota date not null,
  carro text not null default 'Sem carro',
  texto text not null,
  endereco text,
  ordem integer not null default 0,
  criado_por text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.notas_rota add column if not exists endereco text;
alter table public.notas_rota add column if not exists ordem integer not null default 0;
alter table public.notas_rota add column if not exists criado_por text;
alter table public.notas_rota add column if not exists criado_em timestamptz not null default now();
alter table public.notas_rota add column if not exists atualizado_em timestamptz not null default now();

create index if not exists idx_notas_rota_data_carro
on public.notas_rota (data_rota, carro, ordem);

alter table public.notas_rota enable row level security;

drop policy if exists "notas_rota_select" on public.notas_rota;
drop policy if exists "notas_rota_insert" on public.notas_rota;
drop policy if exists "notas_rota_update" on public.notas_rota;
drop policy if exists "notas_rota_delete" on public.notas_rota;

create policy "notas_rota_select"
on public.notas_rota for select
using (true);

create policy "notas_rota_insert"
on public.notas_rota for insert
with check (true);

create policy "notas_rota_update"
on public.notas_rota for update
using (true)
with check (true);

create policy "notas_rota_delete"
on public.notas_rota for delete
using (true);
