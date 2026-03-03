#!/usr/bin/env bash
# =============================================================================
# add-church-site.sh
# Adiciona um novo site estático de igreja ao nginx compartilhado.
#
# Uso:
#   bash infrastructure/scripts/add-church-site.sh <dominio>
#
# Exemplo:
#   bash infrastructure/scripts/add-church-site.sh minha-igreja.com.br
# =============================================================================

set -euo pipefail

DOMAIN="${1:-}"
NGINX_CONF="$(cd "$(dirname "$0")/.." && pwd)/nginx-landpages.conf"
WEBROOT="/var/www/landpages"

# ---------- Validação ----------
if [[ -z "$DOMAIN" ]]; then
  echo "Erro: informe o domínio como argumento."
  echo "Uso: bash $0 <dominio>"
  exit 1
fi

# Remove protocolo se o usuário incluiu
DOMAIN="${DOMAIN#https://}"
DOMAIN="${DOMAIN#http://}"
DOMAIN="${DOMAIN%/}"

echo ""
echo "=========================================="
echo " ZionHub — Adicionando site de igreja"
echo " Domínio: $DOMAIN"
echo "=========================================="
echo ""

# ---------- 1. Criar diretório web ----------
SITE_DIR="$WEBROOT/$DOMAIN"

if [[ ! -d "$SITE_DIR" ]]; then
  echo "[1/4] Criando diretório: $SITE_DIR"
  sudo mkdir -p "$SITE_DIR"
  sudo chown -R www-data:www-data "$SITE_DIR" 2>/dev/null || true
else
  echo "[1/4] Diretório já existe: $SITE_DIR"
fi

# ---------- 2. Instruções para o dev ----------
echo ""
echo "[2/4] Próximo passo — copie o build para a VPS:"
echo ""
echo "  # Na sua máquina local (depois de npm run build):"
echo "  rsync -avz ./dist/ usuario@vps:$SITE_DIR/"
echo ""
echo "  # Ou via scp:"
echo "  scp -r ./dist/* usuario@vps:$SITE_DIR/"
echo ""

# ---------- 3. Adicionar bloco nginx ----------
echo "[3/4] Adicionando bloco server ao nginx-landpages.conf..."

# Verifica se o domínio já está configurado
if grep -q "server_name ${DOMAIN}" "$NGINX_CONF" 2>/dev/null; then
  echo "       Bloco para $DOMAIN já existe no nginx.conf — pulando."
else
  cat >> "$NGINX_CONF" << EOF

# -------------------------------------------------------------------------
# $DOMAIN (adicionado em $(date '+%Y-%m-%d %H:%M'))
# -------------------------------------------------------------------------
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    root ${WEBROOT}/${DOMAIN};
    index index.html;

    server_tokens off;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp|avif)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
  echo "       Bloco adicionado com sucesso."
fi

# ---------- 4. Testar e recarregar nginx ----------
echo "[4/4] Testando configuração do nginx..."

if command -v nginx &>/dev/null; then
  sudo nginx -t
  echo "       Recarregando nginx..."
  sudo nginx -s reload
  echo "       Nginx recarregado."
else
  echo "       nginx não encontrado neste ambiente."
  echo "       Quando na VPS, rode: sudo nginx -t && sudo nginx -s reload"
fi

echo ""
echo "=========================================="
echo " Concluído!"
echo ""
echo " Próximos passos:"
echo " 1. Copie os arquivos build para: $SITE_DIR"
echo " 2. Aponte o DNS do domínio para o IP desta VPS"
echo " 3. Ative TLS: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo "=========================================="
echo ""
