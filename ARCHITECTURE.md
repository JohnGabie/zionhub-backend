# ZionHub — Arquitetura

## Visão Geral

ZionHub é uma plataforma SaaS multi-tenant para gestão de igrejas. O monorepo
contém os apps do produto, o backend e as configurações de infraestrutura.

```
rq-rotinas-inteligente-plataform/
├── apps/
│   ├── marketing/          ← site do ZionHub (zionhub.app)
│   ├── menu/               ← hub central (login + módulos)
│   ├── rotina_inteligente/ ← app de rotinas e agenda
│   └── mix_page/           ← app de mix de áudio
├── backend/                ← API FastAPI (Python)
├── infrastructure/         ← configs de infra fora do Docker
│   ├── nginx-landpages.conf
│   ├── scripts/
│   │   └── add-church-site.sh
│   └── _template-church-site/
│       └── README.md
├── nginx/
│   └── nginx.conf          ← proxy principal (Docker)
├── packages/               ← libs compartilhadas (futuro)
└── docker-compose.yml
```

---

## Apps do Produto

| App | Domínio | Porta dev | Descrição |
|-----|---------|-----------|-----------|
| `apps/marketing` | zionhub.app | 3000 | Site de marketing do produto |
| `apps/menu` | app.zionhub.app/ | 3001 | Hub central, login |
| `apps/rotina_inteligente` | app.zionhub.app/rotina | 8080 | Gestão de rotinas |
| `apps/mix_page` | app.zionhub.app/mix | 8080 | Mix de áudio |

---

## Landpages

### Site do ZionHub (`apps/marketing/`)

Parte do monorepo. Responsabilidade do time ZionHub.

- Serve em: `zionhub.app` e `www.zionhub.app`
- Deploy: serviço `marketing` no docker-compose
- Stack: React 18 + Vite + Tailwind + shadcn/ui
- Fontes: Syne (display), Outfit (body), Space Mono (mono)

```bash
# Desenvolvimento local
npm run dev:marketing

# Build de produção
npm run build:marketing
```

### Sites das Igrejas (fora do monorepo)

Criados por devs/designers sob demanda para cada cliente.
**Arquivos estáticos** servidos pelo nginx da VPS.
**Não têm container próprio** — um nginx compartilhado serve todos.

Config nginx: `infrastructure/nginx-landpages.conf`

#### Para adicionar novo site de igreja

```bash
# 1. Dev/designer cria o site (React, HTML, Astro, etc.)
npm run build   # gera ./dist/

# 2. Copia arquivos para a VPS
rsync -avz ./dist/ usuario@vps:/var/www/landpages/minha-igreja.com.br/

# 3. Registra no nginx
bash infrastructure/scripts/add-church-site.sh minha-igreja.com.br

# 4. Aponta DNS do domínio para o IP da VPS

# 5. Ativa TLS
sudo certbot --nginx -d minha-igreja.com.br -d www.minha-igreja.com.br
```

Ver template completo: `infrastructure/_template-church-site/README.md`

#### Integração opcional com API ZionHub

Os sites de igrejas podem buscar dados dinâmicos da organização:

```
GET https://api.zionhub.app/api/v1/organizations/domain/{hostname}
```

Retorna: `{ name, slug, plan, is_active, custom_domain, ... }`

O site funciona 100% estático sem integração. A integração é opcional para
sites que queiram exibir dados dinâmicos (eventos, escala, etc.).

---

## Docker Compose

Serviços:

| Serviço | Container | Descrição |
|---------|-----------|-----------|
| `postgres` | zionhub_postgres | Banco de dados PostgreSQL 15 |
| `backend` | zionhub_backend | API FastAPI (network_mode: host) |
| `marketing` | zionhub_marketing | Site do ZionHub |
| `menu` | zionhub_menu | Hub central |
| `rotina` | zionhub_rotina | App de rotinas |
| `mix` | zionhub_mix | App de mix de áudio |
| `nginx` | zionhub_nginx | Proxy reverso multi-domínio |

```bash
# Subir tudo
docker compose up -d

# Build e subir
docker compose up -d --build
```

---

## Roteamento Nginx (docker)

```
zionhub.app, www.zionhub.app    → marketing (site do produto)
app.zionhub.app/                → menu
app.zionhub.app/rotina          → rotina
app.zionhub.app/mix             → mix
app.zionhub.app/api/            → backend FastAPI
app.zionhub.app/ws              → backend WebSocket
```

Sites das igrejas **não passam por este nginx** — usam o nginx separado
em `infrastructure/nginx-landpages.conf`.

---

## Multi-tenancy

Cada organização (igreja) tem:
- `organization_id` em todos os registros
- `slug` único para identificação
- `custom_domain` opcional para domínio próprio

O isolamento de dados é garantido pelo `organization_id` em todas as queries.
Row Level Security (RLS) está disponível mas não habilitado por padrão
(ver migrations em `backend/`).
