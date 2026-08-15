-- Novo RioTendas - Modelos de Documentos centralizados
-- Execute uma única vez no SQL Editor do Supabase.

-- 1) Bucket privado para os modelos HTML
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'modelos-documentos',
  'modelos-documentos',
  false,
  5242880,
  array['text/html', 'application/xhtml+xml']
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2) Políticas. O RioTendas usa a chave pública do projeto no navegador,
-- portanto os acessos do sistema chegam como role anon.
drop policy if exists "RioTendas modelos ler" on storage.objects;
drop policy if exists "RioTendas modelos enviar" on storage.objects;
drop policy if exists "RioTendas modelos atualizar" on storage.objects;
drop policy if exists "RioTendas modelos remover" on storage.objects;

create policy "RioTendas modelos ler"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'modelos-documentos');

create policy "RioTendas modelos enviar"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'modelos-documentos');

create policy "RioTendas modelos atualizar"
on storage.objects for update
to anon, authenticated
using (bucket_id = 'modelos-documentos')
with check (bucket_id = 'modelos-documentos');

create policy "RioTendas modelos remover"
on storage.objects for delete
to anon, authenticated
using (bucket_id = 'modelos-documentos');
