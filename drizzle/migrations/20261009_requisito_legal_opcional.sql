-- Matriz legal: o campo "requisito" deixa de ser obrigatório (norma e documento exigido bastam).
-- Só afrouxa a regra; os registros existentes não mudam.
-- Reversão: preencher os nulos (UPDATE ... SET requisito = documentoExigido) e ALTER COLUMN requisito SET NOT NULL.
ALTER TABLE smartdocplan.legal_requirements ALTER COLUMN requisito DROP NOT NULL;
