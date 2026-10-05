# Backlog

Melhorias identificadas fora do escopo da etapa em andamento.

- Auditoria: gravar IP e user-agent em `audit_logs` (exige migration e avaliação de LGPD).
- Troca de senha: limitar tentativas por usuário/IP em `/api/auth/change-password` e `/api/auth/login`.
- Chamados: kanban com arrastar, no mesmo padrão de Solicitações.
- Responsividade: confirmar com o cliente a tela e o aparelho do problema relatado na página inicial; em 360, 768, 1024 e 1280 px não houve rolagem horizontal após os ajustes.
- Banner de cookies: reaparece após recarregar a página mesmo depois de "Rejeitar opcionais" (verificar persistência da escolha).
- `AdminConfiguracoes`: cartão "Sobre a Plataforma" mostra "MySQL 8.0", mas o banco é PostgreSQL.
