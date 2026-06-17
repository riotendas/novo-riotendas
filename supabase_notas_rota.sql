-- RioTendas - Notas de rota sincronizadas entre desktops e celulares
-- Execute no SQL Editor do Supabase se a tabela notas_rota ainda não existir
-- ou se as notas não estiverem aparecendo para todos os usuários.

create table if not exists public.notas_rota (
  id text primary key,
  data_rota date not null,
  carro text not null default 'Sem carro',
  texto text not null,
  endereco text,
  ordem integer not null default 0,
  criado_por text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

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
