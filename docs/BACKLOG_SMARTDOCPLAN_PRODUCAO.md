# Backlog de Produção - SmartDocPlan

Data da atualização: 29/06/2026  
Responsável pela análise: Codex  
Status geral: Diagnóstico concluído, backlog inicial estruturado e parcialmente validado pelo produto, aguardando seleção da primeira etapa de implementação

## 1. Objetivo da evolução

Evoluir o SmartDocPlan de um MVP funcional para um produto de produção com foco em:

- segurança e isolamento de dados entre empresas;
- confiabilidade operacional e rastreabilidade;
- redução de retrabalho e de cadastros manuais;
- simplificação dos fluxos de RH, DP e SST;
- experiência mais intuitiva, moderna e acessível;
- maior aderência a obrigações documentais, trabalhistas e de SST;
- governança configurável por empresa, função, frente/local e processo;
- implementação de score de conformidade nesta versão;
- preparação da plataforma para operação sustentada, homologação e venda como produto.

## 2. Estado atual identificado

### 2.1 Situação geral do produto

O sistema já possui base funcional relevante e cobre os principais módulos previstos:

- autenticação local por e-mail e senha;
- visão separada entre plataforma e empresa;
- gestão de empresas;
- gestão de colaboradores;
- nova solicitação de RH em etapas;
- checklist documental por tipo de solicitação;
- requisitos por função;
- matriz legal;
- documentos da empresa;
- dossiê do colaborador;
- chamados;
- auditoria;
- dashboards básicos.

### 2.2 Pontos positivos já identificados

- modelo de permissões já separado por perfis de plataforma e de empresa;
- fluxo de solicitação já reorganizado em wizard por etapas;
- possibilidade de anexar documentos na abertura e na avaliação;
- matriz legal e requisitos por função já modelados no banco;
- estrutura de auditoria existente;
- seed e migrações automáticas já presentes;
- validações compartilhadas para CPF, CNPJ, telefone e idade mínima;
- logos oficiais e padronização visual já em andamento no projeto.

### 2.3 Lacunas técnicas identificadas

- autenticação ainda depende de usuário administrador padrão conhecido;
- não foi identificado fluxo robusto de recuperação/redefinição de senha;
- não foi identificado rate limit para login;
- documentos sensíveis ainda são gravados em pasta pública servida pelo app;
- não foi identificado controle fino de download por URL assinada, token temporário ou streaming autenticado;
- não foi identificado registro específico de acesso e download de documentos;
- não foi identificada política clara de exclusão lógica versus exclusão física de arquivos;
- a máquina de estados das solicitações está mais forte no frontend do que no backend;
- os chamados também dependem de validações operacionais ainda simplificadas;
- há testes automatizados, mas a cobertura ainda é pequena para produção;
- o score de conformidade ainda não está implementado de forma transparente e operacional;
- não foi identificado mecanismo de notificação operacional consistente;
- não foi identificado plano formal de backup, restauração e rollback dentro do repositório;
- persistência principal de anexos ainda é local em disco, o que aumenta risco operacional em ambiente de produção.

### 2.4 Lacunas funcionais identificadas

- o fluxo de solicitação ainda pode ser simplificado mais para usuário final;
- o produto ainda expõe muitos detalhes operacionais para alguns perfis;
- falta camada mais clara de pendências do dia e prioridades acionáveis;
- o autoatendimento externo seguro ainda não existe;
- score de conformidade ainda não orienta a priorização;
- histórico de mudança de status ainda pode evoluir;
- documentação da empresa, do colaborador e da solicitação ainda pode ganhar governança mais forte;
- BI ainda está em nível operacional básico.

### 2.5 Lacunas legais, operacionais e de governança

- o sistema apoia conformidade, mas ainda precisa explicitar melhor origem, peso e rastreabilidade das regras;
- falta registrar melhor decisões ligadas a LGPD, retenção, descarte e acesso a documentos sensíveis;
- falta governança mais explícita para documentos de SST com validade e criticidade distintas;
- falta separar o que é obrigatoriedade legal, obrigatoriedade operacional e recomendação interna;
- falta explicitar melhor, na experiência e na documentação, quais regras e fluxos estão aderentes a referenciais oficiais como NR-7, NR-1, GRO, PGR, riscos psicossociais e LGPD;
- faltam critérios formais de aceite por etapa operacional para homologação.

### 2.6 Lacunas de UX e acessibilidade

- dashboards ainda podem ficar mais orientados à ação;
- faltam empty states mais educativos em alguns fluxos;
- ainda há oportunidades de reduzir termos técnicos para usuários comuns;
- ainda há oportunidades para microinterações, feedback de upload, timelines e estados de carregamento mais claros;
- a arquitetura visual precisa consolidar consistência entre módulos;
- a responsividade precisa continuar sendo revisada em uso real, especialmente em telas densas.

### 2.7 Aderência atual ao padrão de qualidade Atenza

Aderência atual classificada como parcial.

Itens já aderentes ou parcialmente aderentes:

- trabalho por backlog e etapas já estruturado;
- documentação técnica e de negócio do sistema já iniciada;
- projeto já possui autenticação, segregação por empresa e auditoria base;
- há validações compartilhadas para CPF, CNPJ, telefone e idade mínima;
- existe fluxo de solicitação em etapas;
- já existem mensagens e feedbacks em partes importantes da interface;
- o produto já começou a evoluir de CRUD simples para experiência mais orientada.

Principais gaps em relação ao padrão Atenza de qualidade:

- ausência de quality gates mais formais para produção;
- cobertura de testes ainda pequena para o porte do sistema;
- ausência de design system mínimo formalizado como ativo do projeto;
- estados obrigatórios de interface ainda não estão completos em todos os fluxos;
- listas ainda podem evoluir mais em busca, filtros, paginação, ordenação e ações rápidas;
- segurança avançada ainda não está endurecida no nível recomendado para produto multiempresa;
- observabilidade, métricas operacionais, incidentes e rollback ainda precisam amadurecer;
- estrutura documental do projeto ainda pode ser organizada de forma mais aderente ao padrão Atenza de cliente, evidências, versões e validados;
- ainda existem telas e módulos que precisam reforçar aparência de produto SaaS premium, evitando percepção de CRUD tradicional.

## 3. Premissas adotadas

- O fluxo principal de autenticação ativo é login local por e-mail e senha.
- O SmartDocPlan não deve prometer conformidade legal automática; ele deve apoiar gestão, evidência, rastreabilidade e priorização.
- O módulo de requisitos por função é o principal motor de exigências dinâmicas por processo.
- A matriz legal representa contexto regulatório da empresa e pode ser referenciada por requisitos operacionais.
- O checklist documental por tipo de solicitação continua sendo uma camada separada e complementar.
- O score de conformidade deve ser explicável para o usuário e não deve ser uma “caixa-preta”.
- Nesta versão, integrações externas avançadas permanecem fora do escopo, salvo preparação arquitetural segura.
- O produto deve continuar multilocatário com isolamento por empresa como requisito crítico de produção.
- O backlog deve priorizar primeiro segurança, rastreabilidade e regras de processo antes de grandes evoluções visuais.
- A aderência a normas e leis deve ser tratada como apoio operacional, parametrização, evidência e rastreabilidade, e não como promessa de conformidade legal automática.

### 3.1 Decisões já validadas pelo produto em 29/06/2026

- Implementar recuperação/redefinição de senha nesta versão.
- Implementar política de armazenamento e acesso controlado a documentos nesta versão.
- Implementar política de retenção e descarte documental nesta versão.
- Implementar fluxo público seguro nesta versão.
- Implementar score de conformidade nesta versão.
- Implementar pesos diferenciados para documentos críticos de SST nesta versão.

### 3.2 Diretrizes iniciais aprovadas para execução futura

- Recuperação de senha deve entrar no backlog como item aprovado, preferencialmente com fluxo seguro por token temporário, sem alterar código nesta fase de planejamento.
- Documentos sensíveis devem migrar para modelo de acesso controlado, com armazenamento privado ou camada autenticada de entrega, evitando URL pública direta.
- Deve existir política de retenção por tipo documental, base legal, prazo operacional, descarte lógico e descarte físico rastreável.
- O fluxo público seguro deve permitir envio externo com token, expiração, auditoria e escopo mínimo de dados expostos.
- O score de conformidade deve ser transparente, explicável e configurável, sem caráter de garantia legal automática.
- Sempre que fizer sentido, o sistema deve explicitar a origem regulatória ou recomendatória da regra, usando linguagem como “aderente a”, “alinhado a”, “baseado em” ou “configurado conforme referência”, evitando frases que sugiram certificação automática.

## 4. Dúvidas para validação antes de implementar

1. O cliente deseja auditoria de download e visualização de documentos ou apenas de upload, edição, aprovação, reprovação e exclusão?
2. Haverá necessidade formal de consentimento, aceite de termo ou ciência eletrônica no fluxo público seguro?
3. O fluxo público seguro permitirá somente anexos ou também preenchimento e correção de dados cadastrais da pessoa?
4. As notificações por e-mail serão disparadas por infraestrutura já existente ou será necessário definir provedor na etapa de notificações?
5. Existe alguma exigência formal de LGPD, jurídico ou SST que imponha restrição específica de armazenamento fora do Brasil?
6. O histórico de status deve virar trilha detalhada com autor, data, justificativa e comentários por transição?
7. O usuário `platform_auditor` deve permanecer estritamente em leitura ou poderá avaliar evidências sem alterar status?

## 5. Riscos identificados

### 5.1 Riscos críticos

- exposição indevida de documentos por estarem em pasta pública;
- reutilização de credenciais padrão em ambiente produtivo;
- ausência de proteção contra brute force ou repetição de tentativas de login;
- transições inválidas de status serem aceitas no backend;
- falhas de segregação de dados entre empresas em fluxos futuros ou uploads públicos;
- ausência de trilha detalhada de decisões críticas de análise;
- dependência de armazenamento local sem estratégia clara de resiliência.

### 5.2 Riscos altos

- score de conformidade ser entendido como garantia legal, gerando risco comercial e jurídico;
- uso de selos, textos ou cards de aderência com linguagem excessiva ou imprecisa gerar interpretação de certificação legal indevida;
- excesso de complexidade visual prejudicar adesão de usuários de RH e DP;
- aumento do backlog sem priorização gerar retrabalho;
- ausência de testes mais amplos elevar risco de regressão;
- falta de padronização de mensagens dificultar suporte e treinamento.

### 5.3 Riscos médios

- BI crescer sem definição clara de métrica e origem de dados;
- notificação mal configurada gerar ruído ou perda de confiança;
- parametrizações excessivas sem governança dificultarem suporte.

## 6. Itens críticos para produção

- endurecer autenticação, sessão e gestão de credenciais;
- remover risco do administrador padrão;
- proteger armazenamento e acesso a documentos;
- implementar máquina de estados no backend para solicitações;
- reforçar isolamento por empresa em dados e anexos;
- formalizar score de conformidade e regra de cálculo;
- registrar histórico de análise e mudança de status;
- estruturar alertas, pendências e notificações essenciais;
- ampliar documentação técnica, operacional e de produção;
- ampliar testes mínimos de segurança e regressão.

## 7. Etapas de implementação

### Etapa 0 - Diagnóstico, backlog e plano

- Objetivo
  - consolidar visão do estado atual;
  - estruturar backlog;
  - registrar dúvidas, premissas, riscos e ordem recomendada;
  - não implementar nada.
- Itens
  - revisar código, rotas, permissões e banco;
  - revisar documentação existente;
  - mapear gaps técnicos, funcionais, legais, operacionais e de UX;
  - criar backlog de produção;
  - propor critérios de aceite por etapa.
- Critérios de aceite
  - backlog criado em Markdown;
  - prioridades registradas;
  - riscos classificados;
  - dúvidas registradas;
  - nenhuma implementação iniciada.
- Status
  - Concluída tecnicamente nesta execução, aguardando validação do backlog.

### Etapa 1 - Estabilização do núcleo

- Objetivo
  - reduzir riscos críticos de produção antes de qualquer expansão grande.
- Itens
  - revisar autenticação e sessão;
  - remover ou neutralizar risco do usuário administrador padrão;
  - avaliar troca obrigatória de senha inicial;
  - implementar recuperação/redefinição de senha;
  - implementar proteção contra repetição de tentativas de login;
  - revisar cookies, HTTPS e comportamento de sessão;
  - revisar CORS, CSRF, expiração de sessão e política de senha;
  - revisar permissões por perfil;
  - executar testes de isolamento entre empresas;
  - revisar armazenamento de arquivos;
  - migrar anexos sensíveis para acesso protegido;
  - definir política de retenção, exclusão lógica e exclusão física;
  - registrar auditoria de acesso a documento;
  - endurecer validação de upload;
  - validar prevenção de acesso cruzado entre empresas por recurso;
  - avaliar scan de dependências e scan de secrets como parte dos quality gates mínimos;
  - padronizar tratamento de erro crítico.
- Diretriz aprovada para política documental
  - armazenamento privado por padrão ou entrega autenticada por camada controlada;
  - documentos sensíveis não devem permanecer acessíveis por URL pública simples;
  - download e visualização devem respeitar RBAC por empresa e perfil;
  - ações documentais críticas devem gerar trilha de auditoria;
  - descarte deve separar exclusão lógica imediata de descarte físico rastreável conforme matriz de retenção;
  - a matriz de retenção deve considerar categoria documental, finalidade, obrigação legal, prazo operacional e status do vínculo.
- Critérios de aceite
  - usuários não acessam dados ou documentos de outras empresas;
  - credencial padrão não representa mais risco de produção;
  - login e sessão têm comportamento seguro e previsível;
  - documentos sensíveis não ficam expostos por URL pública simples;
  - ações críticas e acesso documental ficam auditáveis;
  - testes mínimos de segurança e permissão passam.
- Status
  - Pendente.

### Etapa 2 - Máquina de estados e regras de processo

- Objetivo
  - garantir consistência de processo no backend.
- Itens
  - implementar máquina de estados de solicitações no backend;
  - revisar necessidade de máquina de estados para chamados;
  - impedir transições inválidas;
  - permitir rascunho ou abertura incompleta quando fizer sentido;
  - impedir aprovação/conclusão com pendência crítica;
  - diferenciar status interno e status amigável;
  - melhorar mensagens de erro;
  - exigir justificativa para reprovação, rejeição e cancelamento;
  - registrar histórico completo de mudanças de status.
- Critérios de aceite
  - backend barra transições inválidas;
  - aprovação e conclusão respeitam regra mínima documental;
  - histórico de status é legível e rastreável;
  - UX mostra status amigável sem perder precisão interna.
- Status
  - Pendente.

### Etapa 3 - UX/UI, desburocratização e microinterações

- Objetivo
  - tornar a plataforma mais simples, guiada e agradável para usuários reais.
- Itens
  - revisar navegação principal;
  - simplificar linguagem e reduzir termos técnicos;
  - reorganizar dashboards para foco em ação;
  - criar painel “Pendências de hoje”;
  - evoluir tela de nova solicitação;
  - evoluir telas de documentos, colaboradores, dossiê e chamados;
  - melhorar estados vazios;
  - padronizar componentes visuais;
  - formalizar design system mínimo do projeto;
  - consolidar responsividade;
  - melhorar acessibilidade;
  - adicionar microinterações leves e úteis;
  - incluir feedbacks visuais de salvamento, upload, validação e sucesso;
  - garantir estados obrigatórios: inicial, carregando, skeleton, vazio, com dados, erro, sucesso, sem permissão, sem conexão e API indisponível quando aplicável;
  - reforçar formulários com organização por seção, ajuda contextual, validação próxima ao campo e preservação de dados em erro recuperável;
  - reforçar listas, tabelas, cards, kanban e históricos com busca, filtros, badges, contadores, ações rápidas e responsividade mobile.
- Critérios de aceite
  - usuários entendem o próximo passo ao entrar;
  - a solicitação fica mais simples de abrir e acompanhar;
  - pendências ficam evidentes;
  - o layout fica mais consistente;
  - microinterações ajudam sem atrapalhar.
- Status
  - Pendente.

### Etapa 4 - Autoatendimento e fluxo público seguro

- Objetivo
  - reduzir esforço manual do RH com envio externo seguro de documentos.
- Itens
  - criar link público seguro por solicitação;
  - usar token imprevisível com expiração;
  - permitir envio responsivo pelo celular;
  - permitir completar dados faltantes quando aplicável;
  - permitir reenvio de documento reprovado;
  - mostrar pendências de forma clara;
  - registrar auditoria do envio público;
  - permitir revogação do link;
  - proteger acesso para não expor dados além do necessário.
- Diretriz aprovada para o escopo inicial
  - o fluxo público seguro está aprovado para implementação nesta versão;
  - a primeira versão deve priorizar envio documental simples, responsivo e auditável;
  - dados expostos ao usuário externo devem ser mínimos;
  - reenvio de documentos reprovados deve ser contemplado;
  - eventual edição cadastral externa permanece dependente de validação final do produto.
- Critérios de aceite
  - RH gera link seguro;
  - colaborador envia documentos sem login;
  - vínculo com a solicitação é correto;
  - analista consegue revisar o que chegou;
  - tudo fica auditável.
- Status
  - Pendente.

### Etapa 5 - Conformidade MTE/NRs e score de conformidade

- Objetivo
  - fortalecer aderência operacional e criar score de conformidade transparente.
- Itens
  - revisar estrutura da matriz legal;
  - revisar requisitos por função;
  - revisar checklist documental;
  - permitir parametrização por empresa, função, frente/local e processo;
  - tornar explícita a aderência operacional a referenciais oficiais aplicáveis;
  - mapear documentos de SST com validade e criticidade;
  - tratar vencimento, a vencer, pendência e reprovação;
  - registrar origem da regra;
  - manter histórico de alteração das regras;
  - criar score de conformidade por colaborador;
  - criar score de conformidade por empresa;
  - criar score de conformidade por solicitação;
  - exibir faixas visuais como Crítico, Atenção, Regular e Conforme;
  - dar peso maior a documentos críticos de SST.
- Referenciais oficiais a contemplar no backlog de aderência
  - NR-7 / PCMSO;
  - texto oficial da NR-7;
  - NR-1 / GRO;
  - Programa de Gerenciamento de Riscos (PGR);
  - orientações recentes do MTE sobre GRO e riscos psicossociais;
  - diretrizes da LGPD para tratamento, acesso, retenção e descarte de dados pessoais e documentos.
- Interpretação segura de aderência a registrar no produto
  - o SmartDocPlan deve ser aderente como plataforma de apoio operacional, rastreabilidade, evidência e parametrização;
  - a plataforma pode informar que determinados fluxos, checklists, requisitos e scores estão alinhados ou aderentes às referências oficiais configuradas;
  - a plataforma não deve afirmar que substitui validação humana, laudo técnico, médico do trabalho, jurídico, DP, RH, SST ou obrigação legal da empresa;
  - a plataforma não deve afirmar que “garante conformidade legal” sozinha.
- Pontos de aderência que fazem sentido no produto
  - NR-7 e PCMSO: controle de ASO aplicável ao processo, exames ocupacionais, validade, status e rastreabilidade;
  - NR-1, GRO e PGR: vínculo entre função, frente/local, riscos, treinamentos, exames e exigências documentais;
  - riscos psicossociais: previsão de requisitos psicossociais por função, processo, frente/local ou política interna;
  - LGPD: controle de acesso, minimização de exposição, retenção, descarte e trilha de auditoria documental.
- Formas recomendadas de exibir isso na experiência
  - card ou bloco “Base regulatória / aderência do processo” na solicitação;
  - chips ou badges como “Aderente à NR-7”, “Aderente ao GRO/PGR”, “Contém requisito psicossocial”, “Tratamento alinhado à LGPD”, quando a configuração realmente sustentar isso;
  - campo “origem da regra” em requisitos legais, requisitos por função e score;
  - resumo no painel da empresa mostrando quantos requisitos/documentos estão vinculados a referências oficiais;
  - textos de apoio discretos, especialmente em áreas administrativas e de conformidade;
  - evitar excesso visual e evitar exibição de selos quando a regra ainda não estiver configurada ou validada.
- Modelo inicial recomendado para o score de conformidade
  - apenas itens ativos e obrigatórios entram no denominador do score por padrão;
  - itens opcionais devem aparecer como informativos, sem reduzir score na configuração padrão;
  - cada item deve possuir criticidade configurável: baixa, média, alta ou crítica;
  - pesos base recomendados: baixa = 1, média = 2, alta = 3, crítica = 5;
  - fator de impacto por status recomendado: válido = 0, a vencer = 0.25, pendente = 0.70, reprovado = 0.85, vencido = 1.00, ausente = 1.00;
  - fórmula inicial recomendada: `score = 100 - ((soma dos pesos x fator de impacto) / soma total dos pesos) x 100`;
  - o score deve ser arredondado para inteiro e limitado entre 0 e 100;
  - faixas visuais recomendadas: 0 a 49 = Crítico, 50 a 69 = Atenção, 70 a 89 = Regular, 90 a 100 = Conforme;
  - o sistema deve exibir claramente quais documentos e regras derrubaram o score;
  - o score deve existir por solicitação, colaborador e empresa.
- Pesos iniciais recomendados para documentos críticos de SST
  - ASO aplicável ao evento do processo, como admissional, periódico, retorno, mudança de função ou demissional: criticidade crítica, peso 5;
  - exame ocupacional complementar impeditivo para a atividade, quando exigido pela regra da função ou risco: criticidade crítica, peso 5;
  - treinamento obrigatório de NR diretamente ligado a atividade de alto risco da função, como NR-10, NR-33 e NR-35 quando aplicável: criticidade crítica, peso 5;
  - capacitação obrigatória recorrente vinculada à função, mas sem classificar risco crítico imediato: criticidade alta, peso 3 ou 4 conforme configuração final;
  - requisito psicossocial exigido pela empresa, função, frente/local ou processo: criticidade alta, peso 4, podendo subir para crítica se a regra for impeditiva;
  - PGR vigente da empresa: criticidade crítica, peso 5 no score da empresa;
  - PCMSO vigente da empresa: criticidade crítica, peso 5 no score da empresa;
  - LTCAT vigente da empresa: criticidade alta, peso 4 no score da empresa;
  - documentos pessoais e cadastrais de base, quando obrigatórios para o processo mas sem risco ocupacional direto: criticidade média, peso 2;
  - documentos corporativos não ligados diretamente a SST, como contrato social e cartão CNPJ, devem impactar o score da empresa com peso menor do que itens de SST.
- Fundamentação de boas práticas adotada
  - inferência baseada em fontes oficiais sobre obrigatoriedade e centralidade do PCMSO e ASO na NR-7;
  - inferência baseada na obrigatoriedade do PGR e do GRO na NR-1;
  - consideração do tratamento de riscos psicossociais nas orientações recentes do MTE e da Fundacentro;
  - consideração de treinamentos periódicos de alto risco previstos em normas como NR-10, NR-33 e NR-35;
  - o modelo continua configurável, porque a criticidade operacional varia por empresa, segmento e risco da atividade.
- Critérios de aceite
  - score é transparente e explicável;
  - documentos vencidos, pendentes e reprovados afetam o score;
  - requisitos por função impactam o cálculo;
  - regras continuam configuráveis;
  - quando houver indicação visual de aderência, ela estará vinculada a regra realmente configurada e rastreável;
  - a plataforma comunica aderência e alinhamento, sem prometer garantia legal automática;
  - o sistema não promete conformidade automática sem análise humana.
- Status
  - Pendente.

### Etapa 6 - Notificações

- Objetivo
  - transformar pendências importantes em comunicação ativa.
- Itens
  - notificação por e-mail para nova pendência;
  - notificação por e-mail para documento reprovado;
  - notificação por e-mail para solicitação concluída;
  - alerta de documento a vencer e vencido;
  - resumo periódico para RH;
  - painel interno de notificações;
  - preferências por empresa;
  - templates de mensagem;
  - registro de envio e falha.
- Critérios de aceite
  - usuários recebem alertas importantes;
  - mensagens são claras;
  - permissões são respeitadas;
  - falhas de envio ficam registradas.
- Status
  - Pendente.

### Etapa 7 - BI operacional

- Objetivo
  - sair de indicadores básicos para indicadores úteis de gestão.
- Itens
  - pendências por empresa;
  - pendências por colaborador;
  - documentos vencidos e a vencer;
  - tempo médio de análise;
  - tempo médio de conclusão;
  - gargalos por status;
  - solicitações por tipo e prioridade;
  - chamados por tipo;
  - score médio de conformidade;
  - ranking de empresas;
  - evolução mensal;
  - filtros por empresa, período, status, função e frente/local;
  - indicadores internos de qualidade como falhas após deploy, módulos com mais erro, pendências críticas e regressões recorrentes.
- Critérios de aceite
  - dashboards ajudam na priorização;
  - métricas são consistentes;
  - filtros funcionam;
  - performance continua aceitável.
- Status
  - Pendente.

### Etapa 8 - Documentação, testes e prontidão de produção

- Objetivo
  - fechar o ciclo de sustentação, homologação e venda do produto.
- Itens
  - atualizar README;
  - organizar melhor a estrutura documental do projeto em cliente, evidências, versões, backlog, releases e validados quando fizer sentido;
  - documentar ambiente, deploy e variáveis;
  - documentar backup e restauração;
  - documentar permissões e operação;
  - produzir guia rápido para usuário empresa;
  - produzir guia rápido para usuário plataforma;
  - criar checklist de homologação;
  - criar checklist de produção;
  - ampliar testes automatizados mínimos;
  - registrar testes manuais essenciais;
  - documentar rollback;
  - organizar versionamento;
  - manter changelog;
  - definir quality gates mínimos para homologação e produção;
  - registrar orientação de observabilidade, logs, incidentes e manutenção;
  - padronizar mensagens e erros;
  - fazer revisão final de segurança e UX.
- Critérios de aceite
  - projeto tem documentação suficiente para manutenção;
  - existe checklist claro antes de produção;
  - versão do sistema é identificável;
  - backlog final reflete o que foi feito e o que ficou pendente.
- Status
  - Pendente.

## 8. Fora do escopo desta versão

- OCR ou IA para leitura automática de documentos;
- assinatura eletrônica;
- integração real com eSocial;
- integração real com folha de pagamento;
- integração real com WhatsApp;
- aplicativo nativo Android/iOS;
- PWA avançado com offline;
- gamificação;
- marketplace;
- multi-idioma;
- billing e assinatura SaaS.

Permitido nesta versão:

- registrar esses itens no backlog futuro;
- preparar arquitetura quando isso não introduzir complexidade indevida;
- implementar score de conformidade.

## 9. Backlog futuro

- OCR para extração automática de dados documentais;
- leitura inteligente de vencimento e campos críticos;
- assinatura eletrônica de termos;
- integração com eSocial;
- integração com folha e DP;
- integração com mensageria externa;
- automações mais profundas de compliance;
- PWA com recursos offline;
- aplicação mobile dedicada;
- camada comercial SaaS e faturamento;
- versionamento avançado de regras com aprovação formal.

## 10. Ordem recomendada de execução

1. Etapa 1 - Estabilização do núcleo
2. Etapa 2 - Máquina de estados e regras de processo
3. Etapa 5 - Conformidade MTE/NRs e score de conformidade
4. Etapa 3 - UX/UI, desburocratização e microinterações
5. Etapa 4 - Autoatendimento e fluxo público seguro
6. Etapa 6 - Notificações
7. Etapa 7 - BI operacional
8. Etapa 8 - Documentação, testes e prontidão de produção

Justificativa da ordem:

- primeiro é preciso reduzir risco técnico e jurídico;
- depois é preciso fechar regras críticas no backend;
- em seguida, consolidar conformidade e score;
- só então vale expandir UX, autoatendimento e comunicação com menor risco de retrabalho.

## 11. Critérios gerais de aceite para produção

- autenticação e autorização revisadas;
- isolamento entre empresas validado;
- documentos sensíveis protegidos;
- regras críticas não dependem apenas do frontend;
- score de conformidade explicável e auditável;
- logs e auditoria adequados para ações críticas;
- mensagens compreensíveis para usuário comum;
- UX consistente em desktop e mobile;
- testes mínimos automatizados e manuais executados;
- documentação operacional disponível;
- processo de deploy, backup e rollback documentado.

## 12. Histórico de atualizações

### 29/06/2026

- backlog atualizado com decisões aprovadas pelo produto;
- recuperação de senha marcada como aprovada para implementação futura;
- política de armazenamento e acesso a documentos marcada como aprovada para implementação futura;
- política de retenção e descarte documental marcada como aprovada para implementação futura;
- fluxo público seguro marcado como aprovado para implementação futura;
- score de conformidade detalhado com modelo inicial recomendado;
- pesos iniciais para documentos críticos de SST registrados no backlog;
- aderência a NR-7, PCMSO, NR-1, GRO, PGR, riscos psicossociais e LGPD registrada como diretriz formal de produto, com linguagem segura de apoio, alinhamento e rastreabilidade;
- formas recomendadas de exibição dessa aderência no produto registradas no backlog;
- nenhuma implementação funcional foi iniciada.

### 28/06/2026

- criado backlog inicial de produção;
- consolidada análise do código atual, documentação existente e entregas anteriores;
- registradas lacunas técnicas, funcionais, legais, operacionais e de UX;
- definida ordem recomendada de execução;
- nenhuma implementação funcional foi iniciada.
