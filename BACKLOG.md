# Backlog

Melhorias identificadas fora do escopo da etapa em andamento.

- BI: o tempo médio usa `concluidoAt`/`resolvidoAt`; o script local `scripts/seed-demo.mjs` grava essas datas no horário local, o que distorce a média só na base de demonstração.
- Migrations: hoje há 4 mecanismos paralelos (baseline do drizzle-kit sem journal, runner SQL em `server/_core/postgresMigrations.ts`, runner MySQL antigo em `server/_core/migrations.ts` que ainda é chamado na subida, e `scripts/migrate-v2.mjs` avulso); unificar no runner SQL e remover os demais com autorização.
