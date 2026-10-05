# Análise Estratégica SmartDocPlan

Data: 14/07/2026  
Responsável pela análise: Codex  
Objetivo: consolidar uma leitura executiva e técnico-funcional do SmartDocPlan para apoiar a validação interna da SmartDocPlan em 15/07/2026 e a reunião conjunta SmartDocPlan + Atenza em 21/07/2026.

---

## 1. Resumo executivo

O SmartDocPlan já possui uma base funcional relevante para operar como plataforma de gestão documental de RH e SST, com segregação por empresa, autenticação local, fluxo de solicitações, matriz legal, requisitos por função, documentos da empresa, dossiê do colaborador, chamados, auditoria e dashboards.

Em termos de produto, a ferramenta já demonstra direção correta e consegue sustentar uma boa narrativa comercial em torno de:

- abertura guiada de solicitações;
- gestão documental por empresa e colaborador;
- apoio à rastreabilidade de exigências legais e operacionais;
- apoio a requisitos por função, inclusive treinamentos, exames e itens psicossociais;
- operação multiempresa com perfis distintos.

Ao mesmo tempo, a análise indica que o sistema ainda está em uma zona intermediária entre **MVP evoluído** e **produto operacional maduro**. A principal diferença está em cinco frentes:

- algumas regras existem no banco e na API, mas ainda não se traduzem totalmente em experiência operacional fechada;
- parte da segurança documental e da governança de sessão ainda está abaixo do nível recomendado para uma plataforma que lida com documentos sensíveis;
- os módulos de BI, auditoria e conformidade ainda estão mais em nível de leitura básica do que em nível de gestão executiva e tomada de decisão;
- a aderência regulatória está melhor posicionada como **apoio estruturado à conformidade** do que como **motor completo de conformidade operacional**;
- a experiência ainda pode ficar mais simples, mais orientada à ação e menos dependente de leitura manual do usuário.

Classificação geral desta rodada:

- **Base funcional**: boa
- **Maturidade operacional**: média
- **Segurança documental**: baixa a média
- **UX de uso diário**: média
- **Prontidão para discurso de produto premium Atenza**: parcial

Posicionamento recomendado para a reunião:

- o SmartDocPlan já pode ser apresentado como plataforma funcional e consistente;
- a Atenza deve conduzir a conversa deixando claro que a próxima evolução é de **maturidade, robustez, governança e inteligência operacional**, e não de “começar do zero”.

---

## 2. Escopo analisado

Foram considerados:

- frontend administrativo e visão empresa;
- fluxo de login;
- layouts e navegação;
- fluxo de nova solicitação;
- checklist documental;
- documentos da empresa;
- dossiê do colaborador;
- matriz legal;
- requisitos por função;
- dashboards e BI;
- auditoria;
- permissões;
- autenticação e sessão;
- modelagem principal do banco;
- pipeline de CI/CD e empacotamento Docker;
- documentação já existente no repositório;
- aderência regulatória pertinente ao posicionamento da ferramenta.

Arquivos e pontos especialmente relevantes nesta leitura:

- `client/src/pages/empresa/EmpresaNovaSolicitacao.tsx`
- `client/src/components/RequestDocumentos.tsx`
- `client/src/components/CompanyDocumentsManager.tsx`
- `client/src/pages/empresa/EmpresaDossie.tsx`
- `client/src/pages/admin/AdminAuditoria.tsx`
- `client/src/pages/admin/AdminDocumentos.tsx`
- `client/src/pages/admin/AdminDashboard.tsx`
- `client/src/pages/admin/AdminBI.tsx`
- `client/src/pages/empresa/EmpresaBI.tsx`
- `client/src/pages/admin/AdminConfiguracoes.tsx`
- `server/routers.ts`
- `server/_core/localAuth.ts`
- `server/_core/cookies.ts`
- `server/db.ts`
- `drizzle/schema.ts`
- `.github/workflows/docker-build.yml`
- `docker-compose.yml`
- `Dockerfile`

Evidência rápida de saúde do repositório em 14/07/2026:

- `pnpm check`: aprovado
- `pnpm test`: aprovado
- `pnpm build`: aprovado

Observação importante:

- o fato de `check`, `test` e `build` estarem passando é positivo, mas hoje a cobertura automatizada ainda é pequena para o porte funcional do sistema.

---

## 3. Pontos fortes identificados

### 3.1 Estrutura de produto

- Existe separação clara entre visão da plataforma e visão da empresa.
- O modelo de permissões está centralizado em `shared/permissions.ts`, o que facilita governança de acesso.
- A aplicação já trabalha com entidades coerentes para o domínio: empresas, colaboradores, funções, frentes/locais, requisitos legais, requisitos por função, solicitações, chamados e documentos.
- O fluxo de nova solicitação já foi reorganizado em formato wizard, o que é melhor do que um formulário monolítico.

### 3.2 Estrutura de dados

- A modelagem contempla empresa, colaborador, documentos da empresa, documentos do colaborador, matriz legal, requisitos por função, templates de checklist e uploads por solicitação.
- Há separação explícita entre:
  - checklist por tipo de solicitação;
  - matriz legal por empresa;
  - requisitos operacionais por função.
- O banco já prevê campos importantes para validade, observação, obrigatoriedade, categoria e vínculo com requisito legal.

### 3.3 Qualidade de base

- Existem validações compartilhadas de CPF, CNPJ, telefone e idade mínima em `shared/formValidation.ts`.
- A regra de idade mínima de 12 anos já está aplicada em pontos relevantes do sistema.
- A aplicação já usa logos oficiais, fonte Sora e uma linha visual mais coerente do que versões anteriores.
- Há recursos positivos de acessibilidade, como:
  - VLibras;
  - alto contraste;
  - skip link;
  - estrutura visual relativamente compatível com navegação padrão.

### 3.4 Operação documental

- O módulo de documentos da empresa já mostra visão de pendência, vencimento e proximidade de vencimento.
- O fluxo de solicitação já aceita anexos na abertura e também posterior avaliação por operador da plataforma.
- Requisitos por função já contemplam categorias úteis ao domínio:
  - treinamento;
  - exame médico;
  - psicossocial;
  - outros.

### 3.5 Engenharia e entrega

- O projeto já possui CI/CD configurado em `.github/workflows/docker-build.yml`.
- A pipeline já executa:
  - `check`;
  - `test`;
  - `build`;
  - build de imagem Docker;
  - publicação em registry;
  - deploy automatizado para VPS de homologação.

---

## 4. Diagnóstico de UI, UX e fluxos

## 4.1 O que já funciona bem na experiência

- O wizard de solicitação é uma direção correta e mais amigável.
- O resumo lateral da solicitação ajuda a reduzir perda de contexto.
- O uso de cards, badges e agrupamentos por categoria melhora a leitura.
- A navegação lateral retrátil é adequada para um SaaS com múltiplos módulos.
- O uso de checklist, matriz e requisitos no mesmo fluxo melhora percepção de robustez.

## 4.2 Principais oportunidades de melhoria de UX

### A. O sistema ainda depende demais de leitura manual

Em vários pontos, o usuário precisa “interpretar” o que está acontecendo em vez de ser conduzido por sinais claros de prioridade e próxima ação.

Exemplos:

- dashboards mostram números, mas nem sempre mostram o que fazer com eles;
- auditoria registra eventos, mas não ajuda a entender impacto ou criticidade;
- BI apresenta status agregados, mas ainda não entrega leitura executiva de causa, risco e ação;
- pendências e conformidade ainda não estão plenamente conectadas ao que o usuário precisa resolver no dia.

### B. O fluxo de solicitação está bem melhor, mas ainda não está totalmente fechado

O fluxo atual comunica bem a sequência:

- empresa;
- processo;
- pessoa;
- contratação;
- requisitos;
- revisão.

Porém, ainda há lacunas de experiência:

- a Matriz Legal aparece mais como contexto exibido do que como regra aplicada;
- os itens obrigatórios do checklist não estão fechando o fluxo com bloqueio real;
- o usuário ainda não recebe uma noção forte de “o que falta para isso ficar apto”.

### C. A plataforma tem sinais de CRUD avançado, mas ainda pode parecer operacional demais

Para um cliente final, algumas telas ainda passam sensação de gestão interna técnica, e não de produto premium orientado a processo.

Isso aparece principalmente em:

- auditoria;
- BI;
- configurações;
- dossiê do colaborador;
- gestão de documentos com pouca camada de decisão.

### D. Há inconsistência entre o que a interface promete e o que o backend realmente sustenta

Esse é um dos pontos mais sensíveis da análise.

Exemplos concretos:

- a tela administrativa de configurações oferece troca de senha via `/api/auth/change-password`, mas essa rota não foi encontrada no backend;
- a tela administrativa informa “Banco de Dados: MySQL 8.0 / conectado”, mas o backend atual usa `drizzle-orm/node-postgres` e `pg`;
- o score de conformidade aparece na interface, mas não há regra implementada de cálculo server-side encontrada nesta leitura;
- o checklist parece orientado a obrigatoriedade, mas o fechamento operacional dessa obrigatoriedade ainda está incompleto.

---

## 5. Achados críticos e relevantes

## 5.1 Críticos

### 5.1.1 Armazenamento documental atual expõe risco operacional alto

Os uploads de documentos de empresa e de solicitação estão sendo gravados em disco local do container, em caminhos públicos derivados de `dist/public/uploads`, por exemplo em `server/routers.ts`.

Isso gera pelo menos quatro riscos objetivos:

- o arquivo fica servível por URL pública simples;
- o deploy de nova imagem pode apagar anexos;
- recriação do container pode causar perda documental;
- não existe separação robusta entre armazenamento seguro e entrega autenticada.

Esse ponto fica ainda mais crítico porque `docker-compose.yml` não define volume persistente para esses anexos.

Conclusão:

- no estado atual, a plataforma **não deveria sustentar discurso forte de guarda segura e durável de documentos sensíveis** sem ressalvas.

### 5.1.2 Usuário administrador padrão ainda é risco real

Em `server/_core/localAuth.ts`, o seed cria automaticamente:

- `admin@smartdocplan.com`
- senha `Admin@2024!`

Além disso, a criação é logada em console.

Mesmo que o ambiente já tenha sido ajustado operacionalmente em alguns cenários, a permanência desse comportamento no código é um risco alto de:

- acesso indevido;
- reuso de credencial conhecida;
- percepção ruim em auditoria técnica;
- desalinhamento com padrão Atenza.

### 5.1.3 Sessão longa demais e sem controle de inatividade

O token local é emitido com horizonte de um ano em `server/_core/localAuth.ts`, e não foi identificado mecanismo de:

- logout por inatividade;
- revogação de sessão;
- refresh controlado;
- lista de sessões ativas;
- rotação explícita.

Para uma plataforma com documentos ocupacionais, dados pessoais e trilhas sensíveis, isso é inadequado como desenho final.

### 5.1.4 Checklist obrigatório ainda não fecha governança real do fluxo

O sistema já possui modelagem de obrigatoriedade, mas a experiência e a lógica ainda não garantem fechamento forte:

- `EmpresaNovaSolicitacao.tsx` valida empresa, CPF, nome, função e idade mínima, mas não bloqueia avanço por ausência de documentos obrigatórios;
- `AdminDocumentos.tsx` não expõe na UI um controle claro para marcar o documento como obrigatório ou opcional;
- no upload inicial da solicitação, os anexos preparados são persistidos com `obrigatorio: false`;
- o campo `requests.checklistCompleto` existe no schema, mas não foi encontrado uso operacional efetivo nesta leitura.

Conclusão:

- o sistema já tem a base para exigência documental, mas **ainda não entrega um motor completo de fechamento por obrigatoriedade**.

## 5.2 Altos

### 5.2.1 Matriz Legal está mais contextual do que operacional

A Matriz Legal está modelada, cadastrável e visível, o que é positivo.

Mas, no fluxo de solicitação:

- ela aparece como referência contextual;
- os requisitos realmente acionáveis vêm, na prática, do cadastro de requisitos por função;
- a Matriz Legal não está sendo usada como motor explícito de bloqueio, pendência, vencimento, score ou aceite.

Posicionamento correto para o cliente:

- hoje a Matriz Legal **apoia o processo e dá rastreabilidade**, mas **ainda não age como engine regulatória plena**.

### 5.2.2 Auditoria existe, mas ainda é básica

Há router de auditoria e gravação de eventos.

Porém, a tela `AdminAuditoria.tsx` ainda entrega pouca profundidade:

- não enriquece nome do usuário;
- não mostra diff claro do antes/depois;
- não mostra criticidade;
- não tem filtros relevantes por entidade, usuário, período, ação;
- não registra de forma explícita acesso/visualização/download de documentos;
- o IP está retornando como `NULL` no router.

### 5.2.3 BI e dashboard ainda são mais demonstrativos do que executivos

O BI já usa dados reais em boa parte, mas ainda com limitações importantes:

- `AdminDashboard.tsx` trata “Solicitações Abertas” como `reqStats.novas`, o que pode distorcer leitura;
- `AdminDashboard.tsx` mostra “Rejeitadas” como zero fixo;
- `AdminBI.tsx` simplifica o mundo em “novas”, “concluídas” e “pendentes”;
- `EmpresaBI.tsx` não contempla toda a riqueza do fluxo documental e regulatório;
- não há drill-down de indicadores para listas filtradas;
- os gráficos ainda estão em estágio operacional inicial.

### 5.2.4 Dossiê do colaborador ainda não sustenta a mesma maturidade do restante

Em `EmpresaDossie.tsx`, o “upload” ainda está mais próximo de cadastro manual de metadado com `fileUrl` opcional do que de uma gestão completa de arquivos.

Na prática:

- a empresa pode cadastrar o documento;
- mas o fluxo não oferece a mesma robustez de upload binário e controle que existe em outros módulos;
- isso quebra consistência de experiência e reduz confiança no conceito de dossiê digital.

## 5.3 Médios

### 5.3.1 Score de conformidade aparece sem motor claro

`scoreConformidade` está no schema e na UI, inclusive em pendências e dossiê.

Mas não foi encontrada regra operacional robusta de:

- cálculo;
- atualização;
- pesos;
- criticidade;
- explicabilidade ao usuário.

Isso hoje gera risco de percepção de “métrica decorativa”.

### 5.3.2 Configurações administrativas misturam informação real com informação estática

Exemplo claro:

- a tela informa “MySQL 8.0 / conectado”, embora o backend atual esteja em Postgres.

Esse tipo de inconsistência reduz credibilidade em demonstração.

### 5.3.3 Há indícios de backlog já antecipado, mas não totalmente concluído

Já existem:

- categorias psicossociais;
- requisitos por função;
- documentos de empresa;
- filtros por status;
- idade mínima;
- logos oficiais;
- fonte Sora;
- CI/CD.

Porém, vários desses itens ainda não fecharam o ciclo completo de regra, UX, evidência e governança.

---

## 6. Aderência regulatória e posicionamento seguro

## 6.1 Leitura correta da proposta do sistema

O SmartDocPlan deve ser posicionado como:

- plataforma de gestão documental, solicitação, rastreabilidade e apoio operacional em RH/SST;
- camada de evidência, organização, priorização e governança;
- ferramenta configurável para refletir exigências legais, operacionais e contratuais.

O SmartDocPlan **não deve ser posicionado** como:

- certificador automático de conformidade;
- substituto de PCMSO, PGR, AEP, laudos ou responsabilidade técnica;
- mecanismo que “garante” conformidade legal por si só.

## 6.2 Aderência atual aos referenciais aplicáveis

### NR-7 / PCMSO

A NR-7 trata do PCMSO com foco na promoção e preservação da saúde dos trabalhadores, e consolidou a lógica de programa planejado e integrado, não apenas exames isolados. Fonte oficial: [NR-7 – MTE](https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/norma-regulamentadora-no-7-nr-7).

Aderência observada no SmartDocPlan:

- positiva:
  - existência de categoria de exame médico;
  - possibilidade de validade, número e data de emissão;
  - documentos da empresa contemplando PCMSO;
  - requisitos por função podendo exigir exames;
- parcial:
  - ainda não há jornada completa de exames ocupacionais com tipologia explícita, calendário e alerta orientado à ação;
  - não há fechamento robusto de pendências médicas por processo.

### NR-1 / GRO / PGR

O MTE informa que o GRO deve constituir um PGR, materializado inclusive por sistema eletrônico, com inventário de riscos e plano de ação. Fonte oficial: [PGR – MTE](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/pgr).

A Portaria MTE nº 1.419/2024 reforça que o gerenciamento de riscos deve abranger fatores ergonômicos, incluindo fatores de risco psicossociais relacionados ao trabalho. Fonte oficial: [Portaria MTE nº 1.419/2024](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/sst-portarias/2024/portaria-mte-no-1-419-nr-01-gro-nova-redacao.pdf).

No material orientativo de 2026 do MTE, a própria administração reforça que a gestão não se resume a documentação, mas a processo contínuo de identificar perigos, avaliar riscos, adotar medidas e acompanhar evidências. Fonte oficial: [Perguntas e respostas GRO/PGR – MTE](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/canpat-2/canpat-2025/perguntas-e-respostas-gro-pgr-1a-rodada.pdf).

Aderência observada no SmartDocPlan:

- positiva:
  - matriz legal por empresa;
  - requisitos por função;
  - suporte a documentação de empresa como PGR;
  - base para vincular exigência a função e processo;
- parcial:
  - ainda não há inventário de riscos, plano de ação, classificação de risco, responsável técnico e acompanhamento estruturado no sentido completo do GRO/PGR;
  - a Matriz Legal ainda está mais como apoio de referência do que como motor contínuo de gestão de riscos.

### Psicossociais

O material oficial do MTE de 2026 reforça que todas as empresas devem realizar ações de prevenção, incluindo fatores de risco psicossociais relacionados ao trabalho, no contexto do GRO da NR-1. Fontes oficiais:

- [Manual GRO/PGR da NR-1 – MTE](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/manuais-e-publicacoes/2026/manual_gro_pgr_da_nr_1.pdf)
- [Perguntas e respostas GRO/PGR – MTE](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/canpat-2/canpat-2025/perguntas-e-respostas-gro-pgr-1a-rodada.pdf)

Aderência observada no SmartDocPlan:

- positiva:
  - categoria psicossocial já existe no schema, nas telas e nos requisitos por função;
  - o tema já está semanticamente incorporado ao produto;
- parcial:
  - ainda não há fluxo psicossocial claramente diferenciado com critérios, pendências, aceite e acompanhamento próprio;
  - ainda não há card ou leitura gerencial específica para esse tema.

### LGPD

A LGPD estabelece princípios como finalidade, adequação e necessidade para tratamento de dados pessoais. Fonte oficial: [Lei nº 13.709/2018 – Planalto](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm).

Aderência observada no SmartDocPlan:

- positiva:
  - há separação de acesso por perfil e por empresa;
  - existe aviso de cookies;
  - existe trilha base de auditoria;
- insuficiente para maturidade elevada:
  - documentos sensíveis ainda ficam em URL pública;
  - não há política explícita de retenção e descarte implementada nesta leitura;
  - não há trilha forte de download/visualização documental;
  - não há política de sessão e credenciais no nível recomendado.

Conclusão regulatória:

- o SmartDocPlan já pode ser descrito como **alinhado à operação documental de RH/SST e aderente à construção de evidências e rastreabilidade**;
- ainda não deve ser apresentado como **motor completo de conformidade legal automatizada**.

---

## 7. Aderência ao padrão de qualidade Atenza

Classificação atual: **aderência parcial**.

### Já aderente ou bem encaminhado

- separação razoável de domínio e papéis;
- fluxo principal em wizard;
- identidade visual já mais consistente;
- centralização de validações comuns;
- CI/CD configurado;
- documentação técnica já existente no repositório;
- backlog anterior já estruturado.

### Ainda abaixo do padrão Atenza desejado

- robustez de segurança documental;
- coerência entre promessa visual e implementação real;
- fechamento de fluxos críticos por regra de negócio;
- profundidade de auditoria e observabilidade;
- explicabilidade de indicadores;
- maturidade de BI;
- governança de dados sensíveis;
- redução de pontos estáticos, hardcoded ou sem lastro server-side;
- documentação funcional mais orientada a operação e aceite.

Leitura Atenza recomendada:

- a plataforma já tem base boa para ser evoluída com método;
- o principal valor da Atenza aqui é transformar o produto em **plataforma confiável, governável e demonstrável com segurança**.

---

## 8. Recomendações priorizadas

## 8.1 Prioridade imediata

1. Endurecer autenticação e sessão.
2. Eliminar definitivamente a dependência do seed com credencial padrão.
3. Migrar armazenamento documental para modelo privado com entrega autenticada.
4. Definir persistência real de anexos fora do filesystem efêmero do container.
5. Fechar regra de obrigatoriedade documental no fluxo de solicitação.
6. Implementar trilha mais forte para análise, aprovação, reprovação e acesso a documentos.
7. Corrigir inconsistências visuais e informacionais que afetam confiança.

## 8.2 Prioridade de curto prazo

1. Transformar a Matriz Legal em referência mais operacional.
2. Estruturar score de conformidade explicável e recalculável.
3. Evoluir BI com drill-down e indicadores úteis à decisão.
4. Evoluir auditoria com filtros, detalhamento e criticidade.
5. Uniformizar dossiê do colaborador com upload real e governança equivalente à de outros módulos.
6. Revisar todos os pontos em que a UI promete recurso sem backend correspondente.

## 8.3 Prioridade de valor percebido

1. Criar painéis orientados à ação:
   - pendências críticas;
   - documentos vencidos;
   - solicitações travadas;
   - riscos psicossociais configurados;
   - empresas com documentação institucional incompleta.
2. Melhorar experiência de preenchimento com menos leitura e mais decisão guiada.
3. Dar clareza visual para:
   - obrigatório;
   - opcional;
   - vencido;
   - a vencer;
   - aguardando análise;
   - reprovado com motivo;
   - aderente a referência legal.

---

## 9. Sugestões concretas para a conversa com a SmartDocPlan

## 9.1 O que vale mostrar como avanço real

- o fluxo de solicitação por etapas;
- a integração conceitual entre checklist, função, documentos e matriz;
- a gestão documental da empresa com vencimentos;
- o suporte a requisitos psicossociais, exames e treinamentos;
- a estrutura multiempresa e perfis;
- a existência de pipeline de entrega automatizada.

## 9.2 O que vale enquadrar como próxima evolução

- segurança documental e durabilidade dos anexos;
- fechamento de obrigatoriedade documental;
- score de conformidade confiável;
- auditoria mais gerencial;
- BI mais executivo;
- aderência operacional mais forte a SST e LGPD;
- menos cadastro manual e mais automação de decisão.

## 9.3 Mensagem recomendada de posicionamento

Mensagem sugerida:

> O SmartDocPlan já tem base sólida e funcional para operar os principais fluxos previstos, mas a próxima etapa de evolução é elevar a maturidade do produto em segurança, governança documental, inteligência operacional e experiência orientada à decisão. A Atenza já identificou esse caminho e está propondo uma evolução estruturada, sem retrabalho e sem prometer conformidade automática onde o correto é oferecer apoio, evidência e rastreabilidade.

---

## 10. Conclusão

O SmartDocPlan está em um ponto bom para validação com cliente porque já possui substância funcional. Não é uma ferramenta vazia, nem um protótipo superficial. A base existe, o domínio está relativamente bem modelado e a proposta é coerente com necessidades reais de RH e SST.

O que falta agora não é “inventar o produto”, mas sim:

- endurecer segurança;
- transformar contexto em regra operacional;
- consolidar indicadores e auditoria;
- elevar consistência de experiência;
- sustentar melhor a narrativa de confiança e qualidade.

Se a Atenza conduzir bem a reunião, o melhor enquadramento é:

- **produto funcional com boa base**;
- **necessidade clara de maturação para padrão premium**;
- **evolução organizada, com ganhos concretos para confiabilidade, usabilidade e aderência operacional**.

---

## 11. Referências oficiais consideradas

- [NR-7 – Ministério do Trabalho e Emprego](https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/norma-regulamentadora-no-7-nr-7)
- [PGR – Ministério do Trabalho e Emprego](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/pgr)
- [Portaria MTE nº 1.419/2024 – NR-1 / GRO](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/sst-portarias/2024/portaria-mte-no-1-419-nr-01-gro-nova-redacao.pdf)
- [Manual GRO/PGR da NR-1 – MTE (2026)](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/manuais-e-publicacoes/2026/manual_gro_pgr_da_nr_1.pdf)
- [Perguntas e respostas GRO/PGR – MTE](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/canpat-2/canpat-2025/perguntas-e-respostas-gro-pgr-1a-rodada.pdf)
- [Lei nº 13.709/2018 – LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)

