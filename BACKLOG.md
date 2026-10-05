# Backlog

Melhorias identificadas fora do escopo da etapa em andamento.

- Auditoria: gravar IP e user-agent em `audit_logs` (exige migration e avaliação de LGPD).
- Troca de senha: limitar tentativas por usuário/IP em `/api/auth/change-password` e `/api/auth/login`.
- Dossiê do colaborador: rota própria para a equipe da plataforma (hoje acessa pela visão da empresa); entra na Fase 2 junto da gestão de documentos dos colaboradores.
- BI: o tempo médio usa `concluidoAt`/`resolvidoAt`; o script local `scripts/seed-demo.mjs` grava essas datas no horário local, o que distorce a média só na base de demonstração.
- Bundle principal acima de 2 MB: avaliar divisão por rota (`import()` nas páginas).
- `AdminConfiguracoes`: cartão "Sobre a Plataforma" mostra "MySQL 8.0", mas o banco é PostgreSQL.
