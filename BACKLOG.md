# Backlog

Melhorias identificadas fora do escopo da etapa em andamento.

- A troca da senha provisória é exigida só na tela: o servidor ainda aceita as demais chamadas até a pessoa trocar. Avaliar bloquear no servidor.
- Redefinir senha pelo admin (`users.resetPassword`) não encerra as sessões já abertas do usuário; usar `revokeUserSessionsBefore`.
- Nomenclatura: "Obras" e "Locais de trabalho" aparecem com nomes diferentes para o mesmo cadastro; padronizar.
- BI: o tempo médio usa `concluidoAt`/`resolvidoAt`; o script local `scripts/seed-demo.mjs` grava essas datas no horário local, o que distorce a média só na base de demonstração.
