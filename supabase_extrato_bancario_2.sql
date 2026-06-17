-- RioTendas - Conferência Bancária 2.0
-- Execute no Supabase SQL Editor antes de usar a versão com salvamento do extrato.

create table if not exists public.extrato_bancario_linhas (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  data_lancamento date,
  descricao text,
  linha_original text,
  valor numeric(12,2) default 0,
  valor_assinado numeric(12,2) default 0,
  tipo text default 'outro', -- entrada, saida, rendimento, saldo, outro
  status text default 'pendente', -- pendente, associado, rendimento, ignorado
  cliente_nome text,
  evento_id text,
  evento_data date,
  tipo_pagamento text, -- Sinal, Restante, Pg Total
  valor_associado numeric(12,2),
  sugestao_json text,
  observacao text,
  origem text default 'cola_itau',
  colaborador text,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

create index if not exists idx_extrato_bancario_linhas_data on public.extrato_bancario_linhas(data_lancamento desc);
create index if not exists idx_extrato_bancario_linhas_status on public.extrato_bancario_linhas(status);
create index if not exists idx_extrato_bancario_linhas_tipo on public.extrato_bancario_linhas(tipo);
create index if not exists idx_extrato_bancario_linhas_evento on public.extrato_bancario_linhas(evento_id);

-- Tabela preparada para a próxima fase: uma linha do extrato poder pagar mais de um evento.
create table if not exists public.extrato_bancario_vinculos (
  id uuid primary key default gen_random_uuid(),
  extrato_linha_id uuid references public.extrato_bancario_linhas(id) on delete cascade,
  evento_id text,
  cliente_nome text,
  tipo_pagamento text,
  valor_vinculado numeric(12,2) default 0,
  observacao text,
  criado_em timestamptz default now()
);

create index if not exists idx_extrato_bancario_vinculos_linha on public.extrato_bancario_vinculos(extrato_linha_id);
create index if not exists idx_extrato_bancario_vinculos_evento on public.extrato_bancario_vinculos(evento_id);
