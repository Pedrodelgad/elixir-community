# Deploy — Elixir na Hostinger (VPS)

> ⚠️ **Precisa de VPS** (Hostinger KVM, Ubuntu 22.04/24.04). O hosting **compartilhado/web** (PHP) da Hostinger **não roda** o backend Node persistente (Express + SQLite + WebSocket do Discord + cron). Pegue um plano **VPS**.

A arquitetura: 1 VPS rodando **Nginx** (serve o build do React + faz proxy do `/api` e `/uploads` pro Node) + **PM2** (mantém o backend Node na porta 3001) + **SQLite** (arquivo no disco) + **Let's Encrypt** (HTTPS).

---

## 0) Domínio
No hPanel da Hostinger → **DNS**: aponte um registro **A** do seu domínio (e `www`) pro **IP do VPS**.

## 1) Preparar o VPS (SSH como root)
```bash
apt update && apt upgrade -y
# Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git nginx
npm install -g pm2
```

## 2) Subir o código
```bash
mkdir -p /var/www && cd /var/www
git clone <URL-DO-SEU-REPO> elixir   # ou envie via scp/rsync
cd elixir
```

## 3) Frontend (build estático)
```bash
cd /var/www/elixir
npm install
npm run build          # gera /var/www/elixir/dist  (o Nginx serve isso)
```

## 4) Backend (.env + dependências + banco)
```bash
cd /var/www/elixir/server
npm install
cp .env.example .env
nano .env              # PREENCHER (ver checklist abaixo)
npx prisma migrate deploy   # cria o banco e aplica as migrations
npm run db:seed             # planos + admin (admin@elixir.com / admin123 — TROQUE a senha depois)
```

### Checklist do `.env` de produção (o servidor NÃO sobe sem o JWT_SECRET forte)
- `NODE_ENV=production`
- `JWT_SECRET=` → 48 bytes aleatórios: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
- `CORS_ORIGIN=https://seudominio.com`
- `DISCORD_REDIRECT_URI=https://seudominio.com/api/auth/discord/callback` (e cadastre essa URL em **Redirects** no Discord Dev Portal)
- Discord (CLIENT_ID/SECRET/BOT_TOKEN/GUILD_ID/ALPHA_ROLE_ID), Gmail, Rewardful, Solana — como já estão no dev.
- Stripe: ver passo 7.

## 5) Subir o backend com PM2
```bash
cd /var/www/elixir/server
npm run api:start      # pm2 start ecosystem.config.cjs  (1 processo, fork)
pm2 save
pm2 startup            # cole o comando que ele imprimir (sobe o PM2 no boot do VPS)
npm run api:logs       # conferir que subiu sem erro
```

## 6) Nginx + HTTPS
```bash
sudo cp /var/www/elixir/deploy/nginx-elixir.conf /etc/nginx/sites-available/elixir
# edite o arquivo: troque seudominio.com e confirme o root = /var/www/elixir/dist
sudo ln -s /etc/nginx/sites-available/elixir /etc/nginx/sites-enabled/elixir
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
# HTTPS grátis (Let's Encrypt):
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d seudominio.com -d www.seudominio.com
```

## 7) Stripe em produção
1. Dashboard Stripe → **Developers → Webhooks → Add endpoint**: `https://seudominio.com/api/webhooks/stripe`
2. Eventos: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `invoice.paid`, `customer.subscription.deleted`
3. Copie o **Signing secret** (`whsec_...`) → `.env` `STRIPE_WEBHOOK_SECRET`
4. Quando for cobrar de verdade: troque `STRIPE_SECRET_KEY` pelas chaves **live** (`sk_live_...`). Em produção **não** se usa `stripe listen`.
5. `npm run api:restart` após mudar o `.env`.

## 8) Verificar
- `https://seudominio.com` abre (cadeado HTTPS ok).
- Login funciona; login via Discord redireciona certo.
- Pagamento de teste → webhook chega (`npm run api:logs`) → Alpha libera.

---

## Operação / manutenção
- **Atualizar o site:** `git pull` → `npm install && npm run build` (raiz) + `cd server && npm install && npx prisma migrate deploy` → `npm run api:restart`.
- **Mudou o `.env`:** `npm run api:restart`.
- **Backup (importante!):** o banco é o arquivo `server/prisma/dev.db` e os arquivos em `server/uploads/`. Faça backup periódico dos dois (ex.: cron + scp pra outro lugar). SQLite é ok pra 1 VPS; se crescer muito, migrar pra Postgres depois.
- **Logs:** `npm run api:logs` (PM2) e `/var/log/nginx/`.

## Pendências conhecidas (do código)
- **CSP do Helmet está off** (`contentSecurityPolicy:false`) — configurar um CSP sob medida depois (fontes, Stripe, Rewardful, YouTube, 3D).
- **Solana em mainnet** (SOL real). A **fee wallet** (`F3ymfo…`) está vazia — fundar 1x com ~0.001 SOL pra pagamentos pequenos não falharem por rent-exempt (em preços normais 0.5+ SOL não é problema).
- **PIX** desabilitado na UI (não ativado no Stripe) — reabilitar quando ativar PIX no painel.
