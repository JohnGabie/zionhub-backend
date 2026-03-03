# Template — Site Estático de Igreja

Guia para desenvolvedores e designers que vão criar o site (landpage) de uma
igreja cliente do ZionHub.

---

## Conceito

Sites de igrejas são **arquivos estáticos** (HTML, CSS, JS) servidos diretamente
pelo nginx da VPS. Eles **não têm container próprio** e **não fazem parte do
monorepo** do ZionHub.

Você pode usar qualquer tecnologia: React, Vue, Astro, Next.js (export estático),
HTML puro — desde que o resultado final seja uma pasta com `index.html`.

---

## Estrutura esperada após o build

```
dist/
├── index.html
├── assets/
│   ├── index-Abc123.js
│   └── index-Xyz789.css
└── (outros arquivos)
```

---

## Opção A — Site 100% estático (sem integração com ZionHub)

Crie qualquer site estático com o visual e conteúdo da igreja.
Não há dependência da API do ZionHub. Ideal para sites simples de apresentação.

```bash
npm create vite@latest minha-igreja -- --template react-ts
cd minha-igreja
# ... desenvolva ...
npm run build   # gera ./dist/
```

---

## Opção B — Site com integração dinâmica à API ZionHub

O site pode buscar dados da organização (nome, logo, cor primária, etc.)
chamando a API pública do ZionHub.

### Endpoint

```
GET https://api.zionhub.app/api/v1/organizations/domain/{hostname}
```

### Exemplo de uso (JavaScript)

```javascript
const hostname = window.location.hostname; // ex: "quinquas.com.br"

const res = await fetch(
  `https://api.zionhub.app/api/v1/organizations/domain/${hostname}`
);

if (!res.ok) {
  // Org não encontrada — mostre mensagem de erro ou redirecione
  console.error('Organização não encontrada para este domínio');
  return;
}

const org = await res.json();
// org.name     → "Primeira Igreja Batista Quinquás"
// org.slug     → "quinquas"
// org.plan     → "pro"
// org.is_active → true
```

### Casos de uso possíveis

- Exibir nome e logo da igreja dinamicamente
- Mostrar próximos eventos (endpoint de eventos: a documentar)
- Exibir escala de ministério da semana
- Botão "Entrar" que redireciona para `https://app.zionhub.app/login?tenant={slug}`

---

## Deploy na VPS

### 1. Faça o build

```bash
npm run build
# Resultado em ./dist/
```

### 2. Copie os arquivos para a VPS

```bash
# Via rsync (recomendado — sincroniza apenas os arquivos modificados)
rsync -avz ./dist/ usuario@vps-ip:/var/www/landpages/quinquas.com.br/

# Via scp
scp -r ./dist/* usuario@vps-ip:/var/www/landpages/quinquas.com.br/
```

### 3. Adicione o domínio ao nginx

Execute na VPS:

```bash
bash /caminho/para/infrastructure/scripts/add-church-site.sh quinquas.com.br
```

O script irá:
- Criar `/var/www/landpages/quinquas.com.br/` se não existir
- Adicionar o bloco `server {}` ao `infrastructure/nginx-landpages.conf`
- Rodar `nginx -t` e `nginx -s reload`

### 4. Aponte o DNS

No painel do provedor de domínio da igreja, crie registros:

| Tipo | Nome | Valor            |
|------|------|------------------|
| A    | @    | IP da VPS        |
| A    | www  | IP da VPS        |

### 5. Ative TLS (HTTPS)

```bash
sudo certbot --nginx -d quinquas.com.br -d www.quinquas.com.br
```

---

## Atualizar o site (re-deploy)

Basta re-fazer o build e copiar os novos arquivos:

```bash
npm run build
rsync -avz ./dist/ usuario@vps-ip:/var/www/landpages/quinquas.com.br/
```

Não é necessário recarregar o nginx se apenas os arquivos mudaram (o nginx já
serve os arquivos diretamente do disco).

---

## Perguntas frequentes

**O site da igreja depende do monorepo do ZionHub?**
Não. É completamente independente. O monorepo não conhece esses sites.

**Posso usar qualquer framework?**
Sim, desde que o build gere arquivos estáticos.

**O site funciona sem integração com a API?**
Sim. A integração é opcional para sites que queiram exibir dados dinâmicos.

**E se a API ficar fora do ar?**
O site continua funcionando normalmente. Só os dados dinâmicos não serão
carregados. Implemente fallbacks na sua aplicação.
