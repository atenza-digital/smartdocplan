-- Fase 3: campanhas do calendário da saúde (banner + faixa e laço com a cor do mês).
-- Repetem todo ano no mês indicado. Já vêm 12 campanhas como rascunho (inativas) para a SmartDocPlan revisar e ativar.
-- Reversão: DROP TABLE smartdocplan.health_campaigns.
CREATE TABLE IF NOT EXISTS smartdocplan.health_campaigns (
  id serial PRIMARY KEY,
  titulo varchar(120) NOT NULL,
  mensagem text NOT NULL,
  link text,
  "linkTexto" varchar(60),
  cor varchar(7) NOT NULL CHECK (cor ~ '^#[0-9a-fA-F]{6}$'),
  mes integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  publico text NOT NULL DEFAULT 'todos' CHECK (publico IN ('todos', 'empresas', 'plataforma')),
  ativo boolean NOT NULL DEFAULT false,
  "updatedBy" integer REFERENCES smartdocplan.users(id),
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS health_campaigns_mes_idx ON smartdocplan.health_campaigns (mes);

INSERT INTO smartdocplan.health_campaigns (titulo, mensagem, cor, mes)
SELECT * FROM (VALUES
  ('Janeiro Branco', 'Mês de atenção à saúde mental. Cuidar da mente também é cuidar da segurança no trabalho.', '#94a3b8', 1),
  ('Fevereiro Roxo e Laranja', 'Conscientização sobre lúpus, fibromialgia e Alzheimer (roxo) e sobre a leucemia e a doação de medula (laranja).', '#7c3aed', 2),
  ('Março Lilás', 'Prevenção do câncer do colo do útero. Incentive a realização de exames periódicos.', '#a855f7', 3),
  ('Abril Verde', 'Mês da segurança e saúde no trabalho. Revise os EPIs, os treinamentos e os documentos de SST da sua equipe.', '#16a34a', 4),
  ('Maio Amarelo', 'Atenção pela vida no trânsito. Reforce as orientações de direção segura com quem se desloca a trabalho.', '#ca8a04', 5),
  ('Junho Vermelho', 'Incentivo à doação de sangue. Um gesto simples que salva vidas.', '#dc2626', 6),
  ('Julho Amarelo', 'Prevenção e controle das hepatites virais. Vacinação e testagem estão disponíveis no SUS.', '#eab308', 7),
  ('Agosto Lilás', 'Conscientização e enfrentamento da violência contra a mulher.', '#8b5cf6', 8),
  ('Setembro Amarelo', 'Prevenção do suicídio. Falar é a melhor solução: acolha e indique apoio profissional (CVV 188).', '#f59e0b', 9),
  ('Outubro Rosa', 'Prevenção e diagnóstico precoce do câncer de mama. Incentive o autoexame e a mamografia.', '#ec4899', 10),
  ('Novembro Azul', 'Cuidado com a saúde do homem e prevenção do câncer de próstata.', '#2563eb', 11),
  ('Dezembro Vermelho', 'Prevenção ao HIV/aids e outras infecções sexualmente transmissíveis.', '#b91c1c', 12)
) AS seed(titulo, mensagem, cor, mes)
WHERE NOT EXISTS (SELECT 1 FROM smartdocplan.health_campaigns);
