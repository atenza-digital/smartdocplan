#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

DEPLOY_PATH="${DEPLOY_PATH:-/docker/smartdocplan}"
cd "$DEPLOY_PATH"
exec 9>.deploy.lock
flock -w 600 9
backup="$DEPLOY_PATH/backups/$(date -u +%Y%m%dT%H%M%SZ)-${APP_IMAGE##*:}"
mkdir -p "$backup" "$DEPLOY_PATH/uploads"
old_image="$(docker inspect --format='{{.Config.Image}}' smartdocplan-app)"
cp .env "$backup/app.env"
cp docker-compose.yml "$backup/compose.yml"
printf '%s\n' "$old_image" > "$backup/image.txt"
docker exec smartdocplan-app node -e 'process.stdout.write("DATABASE_URL="+process.env.DATABASE_URL+"\n")' > "$backup/database.env"
docker pull postgres:17-alpine >/dev/null
printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
docker pull "$APP_IMAGE"
changed=0
stopped=0
rollback() {
  result=$?
  trap - ERR
  echo "Deployment failed; restoring the previous application image. Database backup retained."
  if [ "$changed" = 1 ]; then
    cp "$backup/app.env" .env
    cp "$backup/compose.yml" docker-compose.yml
    printf 'services:\n  app:\n    volumes:\n      - ./uploads:/app/dist/public/uploads\n      - ./uploads:/app/var/uploads\n' > "$backup/rollback.yml"
    APP_IMAGE="$old_image" docker compose --project-directory "$DEPLOY_PATH" -f docker-compose.yml -f "$backup/rollback.yml" up -d --no-deps app || true
  elif [ "$stopped" = 1 ]; then
    docker start smartdocplan-app >/dev/null || true
  fi
  exit "$result"
}
trap rollback ERR

# Pause only this application while taking a consistent database/files snapshot.
docker stop -t 30 smartdocplan-app >/dev/null
stopped=1
docker run --rm --network "${DB_DOCKER_NETWORK:-postgresql-evkn_default}" --env-file "$backup/database.env" postgres:17-alpine sh -c 'pg_dump --dbname="$DATABASE_URL" --format=custom --no-owner' > "$backup/database.dump"
test -s "$backup/database.dump"
docker run --rm -v "$backup:/backup:ro" postgres:17-alpine pg_restore --list /backup/database.dump >/dev/null
# Paths existed in different releases; copy only when present, fail on copy errors.
for item in legacy:/app/dist/public/uploads private:/app/var/uploads; do
  name="${item%%:*}"; source="${item#*:}"
  if docker cp "smartdocplan-app:$source/." "$backup/$name" 2>"$backup/$name-copy.log"; then
    cp -a "$backup/$name/." "$DEPLOY_PATH/uploads/"
  elif ! grep -qiE 'could not find|no such file' "$backup/$name-copy.log"; then
    echo "Unable to preserve $name uploads"; false
  fi
done
tar -czf "$backup/uploads.tar.gz" -C "$DEPLOY_PATH/uploads" .
printf '%s' "$VPS_APP_ENV_B64" | base64 -d | tr -d '\r' > .env.next
printf '%s\n' \
  "APP_IMAGE=$APP_IMAGE" \
  "APP_HOST=${APP_HOST:-srv1450720.hstgr.cloud}" \
  "APP_PORT=${APP_PORT:-5000}" \
  "APP_HOST_PORT=${APP_HOST_PORT:-8080}" \
  "APP_BIND_IP=${APP_BIND_IP:-0.0.0.0}" \
  "DB_DOCKER_NETWORK=${DB_DOCKER_NETWORK:-postgresql-evkn_default}" \
  "TRAEFIK_ENABLE=${TRAEFIK_ENABLE:-false}" \
  "TRAEFIK_ENTRYPOINTS=${TRAEFIK_ENTRYPOINTS:-websecure}" \
  "TRAEFIK_CERTRESOLVER=${TRAEFIK_CERTRESOLVER:-letsencrypt}" \
  "TRAEFIK_DOCKER_NETWORK=${TRAEFIK_DOCKER_NETWORK:-smartdocplan_net}" >> .env.next
changed=1
mv .env.next .env
cp incoming/docker-compose.yml docker-compose.yml
docker compose config --quiet
docker compose up -d --no-deps app
healthy=0
for attempt in $(seq 1 40); do
  status="$(docker inspect --format='{{.State.Health.Status}}' smartdocplan-app)"
  if [ "$status" = healthy ]; then healthy=1; break; fi
  sleep 5
done
test "$healthy" = 1
docker exec -e EXPECTED_SHA="${APP_IMAGE##*:}" smartdocplan-app node --input-type=module -e '
const input=encodeURIComponent(JSON.stringify({json:{timestamp:0}}));
const r=await fetch("http://127.0.0.1:"+process.env.PORT+"/api/trpc/system.health?input="+input);
const body=await r.json();
if (!r.ok || body.result?.data?.json?.version!==process.env.EXPECTED_SHA) process.exit(1);
console.log("Verified deployed version:",body.result.data.json.version);
'
trap - ERR
echo "Deployment verified. Database and documents backed up in: $backup"
