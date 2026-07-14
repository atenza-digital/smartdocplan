# CI/CD do SmartDocPlan

## O que foi configurado

O projeto passa a ter uma pipeline completa em [`.github/workflows/docker-build.yml`](/C:/Projetos/Atenza/smartdocplan/.github/workflows/docker-build.yml) com:

- `pnpm check`
- `pnpm test`
- `pnpm build`
- build e push da imagem Docker para o GitHub Container Registry
- deploy automatizado para a VPS de homologação via SSH
- validação de healthcheck após o deploy

## Fluxo da pipeline

### Pull request para `main`

Executa:

- instalação das dependências;
- checagem de tipos;
- testes;
- build da aplicação.

Não publica imagem nem faz deploy.

### Push em `main`

Executa:

- `check`;
- `test`;
- `build`;
- build/push da imagem no `ghcr.io`;
- deploy automático na VPS;
- espera o container ficar `healthy`.

## Secrets necessários no GitHub

Configurar em `Settings > Secrets and variables > Actions`:

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_PRIVATE_KEY`
- `GHCR_USERNAME`
- `GHCR_TOKEN`
- `VPS_APP_ENV_B64`

### Formato de `VPS_APP_ENV_B64`

Esse secret deve conter o conteúdo do `.env` de produção/homologação em base64.

Exemplo do arquivo original:

```env
DATABASE_URL=postgresql://usuario:senha@host:5432/smartdocplan
JWT_SECRET=troque-por-um-segredo-forte
```

Exemplo para gerar o base64 no Linux/macOS:

```bash
base64 -w 0 .env
```

Exemplo no PowerShell:

```powershell
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes((Get-Content .env -Raw)))
```

O workflow complementa esse arquivo com:

- `APP_IMAGE`
- `APP_HOST`
- `APP_PORT`
- `APP_HOST_PORT`
- `APP_BIND_IP`
- `DB_DOCKER_NETWORK`
- `TRAEFIK_ENABLE`
- `TRAEFIK_ENTRYPOINTS`
- `TRAEFIK_CERTRESOLVER`
- `TRAEFIK_DOCKER_NETWORK`

## Variables opcionais no GitHub

Também em `Settings > Secrets and variables > Actions`, podem ser definidas as variables:

- `DEPLOY_PATH`
- `APP_HOST`
- `APP_PORT`
- `APP_HOST_PORT`
- `APP_BIND_IP`
- `DB_DOCKER_NETWORK`
- `TRAEFIK_ENABLE`
- `TRAEFIK_ENTRYPOINTS`
- `TRAEFIK_CERTRESOLVER`
- `TRAEFIK_DOCKER_NETWORK`

Se não forem definidas, a pipeline usa os defaults do `docker-compose.yml`.

## Compose de deploy

O deploy usa o [docker-compose.yml](/C:/Projetos/Atenza/smartdocplan/docker-compose.yml) parametrizado por ambiente.

Ele agora suporta:

- imagem via `APP_IMAGE`;
- diretório de deploy via `DEPLOY_PATH`;
- domínio via `APP_HOST`;
- bind local via `APP_BIND_IP` e `APP_HOST_PORT`;
- rede externa do Traefik via `TRAEFIK_DOCKER_NETWORK`;
- rede externa do banco via `DB_DOCKER_NETWORK`.

## Healthcheck

Após subir o container, o workflow aguarda o healthcheck do serviço:

`/api/trpc/system.health?input=%7B%22timestamp%22%3A0%7D`

Se o container não ficar saudável, a pipeline falha e imprime os logs do `docker compose`.
