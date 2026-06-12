-- Migração: status de assinatura do contrato nos eventos
ALTER TABLE eventos
ADD COLUMN IF NOT EXISTS assinatura_status text DEFAULT 'nao_enviado',
ADD COLUMN IF NOT EXISTS assinatura_link text,
ADD COLUMN IF NOT EXISTS assinatura_enviada_em timestamptz,
ADD COLUMN IF NOT EXISTS assinatura_realizada_em timestamptz;

-- Valores esperados para assinatura_status:
-- nao_enviado | enviado | assinado | recusado
