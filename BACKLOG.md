# Backlog

Melhorias identificadas fora do escopo da etapa em andamento.

- Sessão: o logout só apaga o cookie; o token JWT continua válido até expirar. Avaliar lista de revogação ou versão de sessão por usuário.
- Nomenclatura: "Obras" e "Locais de trabalho" aparecem com nomes diferentes para o mesmo cadastro; padronizar.
- Documentos recorrentes: em `employeeGrid`, período que não se aplica ao colaborador pode aparecer como "atrasado"; ajustar para "não se aplica".
- `todo.md` está desatualizado em relação ao que já foi entregue; revisar ou substituir pelo CHANGELOG.
- BI: o tempo médio usa `concluidoAt`/`resolvidoAt`; o script local `scripts/seed-demo.mjs` grava essas datas no horário local, o que distorce a média só na base de demonstração.
