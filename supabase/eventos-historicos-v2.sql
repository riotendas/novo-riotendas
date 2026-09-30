-- RioTendas - Base antiga V2
-- Execute este SQL no Supabase SQL Editor.
-- Não precisa reimportar o CSV. Ele apenas acrescenta a busca por campo e faixa de datas.

create extension if not exists unaccent;

drop function if exists public.buscar_eventos_historicos_v2(text,text,date,date,integer,integer);

create or replace function public.buscar_eventos_historicos_v2(
  p_busca text default '',
  p_campo text default 'todos',
  p_data_inicial date default null,
  p_data_final date default null,
  p_limite integer default 50,
  p_offset integer default 0
)
returns table (
  id bigint,
  data_evento date,
  horario text,
  montagem text,
  desmontagem text,
  colaborador text,
  cliente text,
  contatos text,
  endereco text,
  descricao_servico text,
  valor_total text,
  sinal text,
  restante text,
  forma_pagamento text,
  cpf_cnpj text,
  total_encontrado bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with parametros as (
    select lower(unaccent(trim(coalesce(p_busca,'')))) as q,
           lower(trim(coalesce(p_campo,'todos'))) as campo
  ),
  filtrados as (
    select h.*
    from public.eventos_historicos h, parametros p
    where
      (p_data_inicial is null or h.data_evento >= p_data_inicial)
      and (p_data_final is null or h.data_evento <= p_data_final)
      and (
        p.q = ''
        or (p.campo = 'todos' and lower(unaccent(coalesce(h.busca_normalizada,''))) like '%' || p.q || '%')
        or (p.campo = 'cliente' and lower(unaccent(coalesce(h.cliente,''))) like '%' || p.q || '%')
        or (p.campo = 'contatos' and lower(unaccent(coalesce(h.contatos,''))) like '%' || p.q || '%')
        or (p.campo = 'endereco' and lower(unaccent(coalesce(h.endereco,''))) like '%' || p.q || '%')
        or (p.campo = 'descricao_servico' and lower(unaccent(coalesce(h.descricao_servico,''))) like '%' || p.q || '%')
        or (p.campo = 'cpf_cnpj' and lower(unaccent(coalesce(h.cpf_cnpj,''))) like '%' || p.q || '%')
        or (p.campo = 'colaborador' and lower(unaccent(coalesce(h.colaborador,''))) like '%' || p.q || '%')
      )
  )
  select
    f.id, f.data_evento, f.horario, f.montagem, f.desmontagem, f.colaborador,
    f.cliente, f.contatos, f.endereco, f.descricao_servico,
    f.valor_total, f.sinal, f.restante, f.forma_pagamento, f.cpf_cnpj,
    count(*) over() as total_encontrado
  from filtrados f
  order by f.data_evento desc nulls last, f.id desc
  limit greatest(1, least(coalesce(p_limite,50),100))
  offset greatest(coalesce(p_offset,0),0);
$$;

grant execute on function public.buscar_eventos_historicos_v2(text,text,date,date,integer,integer)
to anon, authenticated;
