# Smart Doc Plan - TODO

## Sistema de Temas
- [x] Configurar variáveis CSS com paleta de cores da marca (teal/turquesa) no index.css
- [x] Definir tokens de cor para tema claro (.light) e tema escuro (.dark)
- [x] Habilitar ThemeProvider com modo switchable no App.tsx
- [x] Criar componente ThemeToggle com ícones de sol/lua
- [x] Integrar ThemeToggle no AdminLayout e CompanyLayout (header)
- [x] Garantir consistência visual em todos os componentes shadcn/ui

## Banco de Dados (Schema)
- [x] Tabela: companies (empresas multi-tenant)
- [x] Tabela: company_documents (documentos institucionais)
- [x] Tabela: worksites (obras/CNOs)
- [x] Tabela: positions (cargos por empresa)
- [x] Tabela: legal_requirements (matriz de requisitos legais/NRs)
- [x] Tabela: employees (colaboradores)
- [x] Tabela: employee_documents (dossiê digital)
- [x] Tabela: requests (solicitações de RH)
- [x] Tabela: tickets (chamados)
- [x] Tabela: audit_logs (auditoria)
- [x] Atualizar tabela users com role expandido e company_id

## Backend (tRPC Routers)
- [x] Router: companies (CRUD - admin plataforma)
- [x] Router: employees (CRUD - por empresa)
- [x] Router: requests (solicitações de RH + Kanban)
- [x] Router: employeeDocs (upload dossiê)
- [x] Router: tickets (chamados)
- [x] Router: dashboard (BI empresa e global)
- [x] Router: audit (logs de auditoria)
- [x] Router: users (gestão de usuários e papéis)
- [x] Router: legalRequirements (matriz NRs)
- [x] Middleware: isolamento por company_id (multi-tenant)
- [x] Controle de acesso por papel (isPlatformUser, canAccessCompany)

## Layout e Navegação
- [x] AdminLayout: menu retrátil para Administrador da Plataforma
- [x] CompanyLayout: menu retrátil para usuários das empresas
- [x] Roteamento por papel (admin plataforma → /admin, empresa → /empresa)
- [x] Tela de login com redirecionamento por papel

## Telas - Administrador da Plataforma
- [x] AdminDashboard: BI global (empresas, solicitações, chamados)
- [x] AdminEmpresas: listagem, cadastro, edição de empresas
- [x] AdminUsuarios: gestão de usuários e papéis
- [x] AdminSolicitacoes: acompanhamento de todas as solicitações
- [x] AdminChamados: gestão de chamados de suporte
- [x] AdminMatrizLegal: matriz de NRs e requisitos legais
- [x] AdminAuditoria: log de auditoria
- [x] AdminBI: BI global com gráficos
- [x] AdminConfiguracoes: configurações da plataforma

## Telas - Usuários das Empresas
- [x] EmpresaDashboard: indicadores de RH da empresa
- [x] EmpresaSolicitacoes: Kanban de solicitações de RH
- [x] EmpresaColaboradores: listagem e gestão de colaboradores
- [x] EmpresaDossie: dossiê digital do colaborador com documentos
- [x] EmpresaPendencias: conformidade documental com score
- [x] EmpresaChamados: abertura e acompanhamento de chamados
- [x] EmpresaBI: BI com gráficos de colaboradores e solicitações
- [x] EmpresaConfiguracoes: dados da empresa e perfil do usuário

## Testes
- [x] server/auth.logout.test.ts (1 teste)
- [x] server/platform.test.ts (14 testes - auth, roles, requests, tickets, users)
- [x] client/src/contexts/ThemeContext.test.tsx (9 testes)
- [x] Total: 24 testes passando

## Pendências Futuras
- [ ] Exportação de dossiê em PDF/ZIP
- [ ] Alertas automáticos de vencimento (90/30/7 dias)
- [ ] Integração automática de documentos ao dossiê ao concluir solicitação
- [ ] Obras/CNOs: cadastro e gestão
- [ ] Cargos: cadastro por empresa

## Correções e Novas Funcionalidades (Sprint 2)

### Autenticação Própria
- [x] Criar tabela platform_users com email, senha (hash bcrypt), role, company_id
- [x] Criar endpoint POST /api/auth/login (email + senha → JWT)
- [x] Criar endpoint POST /api/auth/logout
- [x] Criar endpoint GET /api/auth/me
- [x] Criar tela de login com formulário email/senha
- [x] Criar seed de usuário admin inicial (admin@smartdocplan.com)
- [x] Autenticação local via e-mail e senha implementada

### Gestão de Usuários das Empresas (painel Admin)
- [x] Criar página AdminUsuariosEmpresa com listagem de usuários por empresa
- [x] Formulário de criação de usuário vinculado à empresa (nome, email, senha, papel)
- [x] Edição e desativação de usuários
- [x] Filtro por empresa no painel de usuários

### Matriz Legal por Empresa
- [x] Corrigir AdminMatrizLegal para filtrar por empresa selecionada
- [x] Criar EmpresaMatrizLegal no painel da empresa (aba Configuracoes)
- [x] Vincular requisitos legais à empresa específica

### Cargos por Empresa
- [x] Criar página EmpresaCargos no painel da empresa (aba Configuracoes)
- [x] Criar página AdminCargos no painel admin (visualização global)
- [x] CRUD de cargos vinculado ao company_id

### Kanban de Solicitações (Admin Interno)
- [x] Criar AdminKanban com colunas: Nova → Em Análise → Aguardando Docs → Aprovado → Concluído
- [ ] Drag-and-drop de cards entre colunas (pendente)
- [x] Card com dados do colaborador, tipo de solicitação e empresa
- [x] Modal de avaliação com parecer técnico e mudança de status
- [ ] Ao concluir: integrar documentos gerados ao dossiê do colaborador (pendente)

### Painel da Empresa - Funcionalidades Completas
- [x] Abertura de solicitações por tipo (Admissão, Demissão, Afastamento, etc.)
- [x] Abertura de chamados de suporte
- [x] Dashboard com indicadores dos colaboradores da empresa
- [x] Acesso ao dossiê dos colaboradores vinculados
- [ ] Download de relatórios em PDF (pendente)
