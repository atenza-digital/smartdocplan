#!/usr/bin/env bash
set -euo pipefail
# Skip the broad Docker ingress drop only for this published application port.
# RETURN still leaves Docker's own forwarding/publication checks in effect.
interface="$(ip -4 route show default | awk 'NR==1 {print $5}')"
test -n "$interface"
rule=(-i "$interface" -p tcp --dport "${APP_PORT:-5000}" -m conntrack --ctdir ORIGINAL --ctorigdstport "${PUBLIC_PORT:-8080}" -m comment --comment smartdocplan-public-access -j RETURN)
iptables -w -C DOCKER-USER "${rule[@]}" 2>/dev/null || iptables -w -I DOCKER-USER 1 "${rule[@]}"
