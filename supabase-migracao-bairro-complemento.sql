-- RioTendas v19-dev - Bairro e complemento separados
-- Execute no Supabase > SQL Editor antes de usar a versão.

ALTER TABLE clientes_cadastro
ADD COLUMN IF NOT EXISTS bairro text,
ADD COLUMN IF NOT EXISTS cidade text DEFAULT 'Rio de Janeiro',
ADD COLUMN IF NOT EXISTS complemento text;

ALTER TABLE eventos
ADD COLUMN IF NOT EXISTS bairro text,
ADD COLUMN IF NOT EXISTS cidade text DEFAULT 'Rio de Janeiro',
ADD COLUMN IF NOT EXISTS complemento text;

-- Preparação para orçamentos/frete futuro, caso a tabela já esteja em uso.
ALTER TABLE orcamentos
ADD COLUMN IF NOT EXISTS bairro text,
ADD COLUMN IF NOT EXISTS cidade text DEFAULT 'Rio de Janeiro',
ADD COLUMN IF NOT EXISTS complemento text;

-- v19-dev: cancelamento lógico de eventos
ALTER TABLE eventos
ADD COLUMN IF NOT EXISTS status_evento text DEFAULT 'ativo';

UPDATE eventos
SET status_evento = 'ativo'
WHERE status_evento IS NULL OR status_evento = '';
