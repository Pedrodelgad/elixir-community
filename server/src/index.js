// API do Elixir — Express + Prisma + SQLite
// Rodar com: npm run dev (porta 3001)
import express from 'express'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { authenticator } from 'otplib'
import QRCode from 'qrcode'
import { PrismaClient } from '@prisma/client'
import { sendPasswordCode, sendTwoFactorCode, mailConfigured } from './mail.js'
import { getOAuthUrl, exchangeCode, getDiscordUser, addToGuild, addAlphaRole, removeAlphaRole, sendDM } from './discord.js'
import { startGateway } from './gateway.js'
import { stripe, stripeWebhookSecret, RECURRING_INTERVAL } from './stripe.js'
import { rewardfulConfigured, getDefaultCampaignId, createAffiliate, getAffiliate, getCommissions } from './rewardful.js'
import { solanaConfigured, buildPaymentTx, verifyPayment } from './solana.js'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import multer from 'multer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.resolve(__dirname, '../../dist')
const UPLOADS = path.resolve(__dirname, '../uploads')
fs.mkdirSync(UPLOADS, { recursive: true })

// Upload de arquivos das "ferramentas" (só admin). Nome no disco é aleatório (anti-colisão/anti-adivinhação);
// o nome original fica no banco (Content.fileName) para exibir e baixar com o nome certo.
const uploadTool = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).slice(0, 12).replace(/[^.a-zA-Z0-9]/g, '')
      cb(null, crypto.randomBytes(16).toString('hex') + ext)
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 }, // 50 MB
}).single('file')

const prisma = new PrismaClient()

// WAL mode: evita travamentos quando múltiplas requisições chegam ao mesmo tempo
prisma.$executeRawUnsafe('PRAGMA journal_mode=WAL;').catch(() => {})
prisma.$executeRawUnsafe('PRAGMA synchronous=NORMAL;').catch(() => {})
prisma.$executeRawUnsafe('PRAGMA busy_timeout=5000;').catch(() => {})

const app = express()

const PORT = process.env.PORT || 3001
const JWT_SECRET = process.env.JWT_SECRET || 'troque-isto-em-producao'
const COOKIE = 'elixir_token'
const IS_PROD = process.env.NODE_ENV === 'production'

// Segurança: em produção o JWT_SECRET TEM que ser forte (senão dá pra forjar sessão de qualquer usuário)
if (IS_PROD && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'troque-isto-em-producao' || process.env.JWT_SECRET.length < 32)) {
  console.error('FATAL: defina um JWT_SECRET forte (≥32 caracteres aleatórios) no .env antes de subir em produção.')
  process.exit(1)
}

// Atrás do Nginx em produção: confia no X-Forwarded-* (necessário p/ rate-limit por IP e cookie secure)
app.set('trust proxy', 1)

// Headers de segurança (anti-clickjacking, noSniff, HSTS…). CSP fica desativado por ora
// para não quebrar o front (fontes, Rewardful, Stripe, 3D) — configurar um CSP sob medida depois.
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }))

// Webhook da Stripe precisa do corpo RAW (a assinatura é verificada sobre os bytes originais).
// Por isso é registrado ANTES do express.json(). stripeWebhook é hoisted (function declaration).
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhook)

app.use(express.json({ limit: '100kb' })) // limita o tamanho do body (anti-DoS)
app.use(cookieParser())

// Arquivos das ferramentas. Conteúdo EXCLUSIVO: exige login + Alpha (mesma regra do /api/student/tree).
// Sem isso, qualquer pessoa com a URL baixaria o arquivo. Servidos SEMPRE como anexo (download) + nosniff:
// um .html/.svg enviado nunca é renderizado na origem do site (evita XSS armazenado).
app.use('/uploads', auth, alphaOnly, express.static(UPLOADS, {
  index: false,
  setHeaders: (res) => {
    res.setHeader('Content-Disposition', 'attachment')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Cache-Control', 'private, no-store')
  },
}))

// Rate limit nas rotas sensíveis de autenticação (anti força-bruta / enumeração)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' },
})

// Rate limit em pagamentos/afiliado (protege as APIs externas Stripe/Solana/Rewardful de abuso)
const payLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Aguarde um pouco.' },
})

// Hash "fantasma" para comparar quando o usuário não existe — login leva o mesmo tempo
// independente do email existir ou não (evita enumeração de contas por timing).
const DUMMY_HASH = bcrypt.hashSync('elixir-timing-guard', 10)

// 2FA: aceita o código da janela atual ±1 (~90s) para tolerar desvio de relógio do celular
authenticator.options = { window: 1 }

// Em produção, frontend e API ficam na mesma origem — CORS não é necessário.
// Em dev, o Vite proxy resolve, mas deixamos o CORS para facilitar testes diretos.
if (!IS_PROD) {
  app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }))
}

/* ─── Helpers ─── */

// Formato do usuário enviado ao front (nunca inclui a senha).
// plan é calculado: 'alpha' se a assinatura existe E não expirou.
function toClient(user) {
  const sub = user.subscription
  const active = sub && new Date(sub.expiresAt) > new Date()
  return {
    id: user.id,
    name: user.name,
    handle: user.handle,
    email: user.email,
    role: user.role,
    plan: active || user.role === 'admin' ? 'alpha' : 'normal',
    planId: active ? sub.planId : null,
    expiresAt: active ? sub.expiresAt : null,
    discordLinked: !!user.discordId,
    twoFactorEnabled: !!user.twoFactorEnabled,
    isAffiliate: !!user.affiliateId,
    affiliateLink: user.affiliateLink || null,
    affiliateToken: user.affiliateToken || null,
  }
}

function setToken(res, userId) {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
  res.cookie(COOKIE, token, {
    httpOnly: true,        // JS do navegador não acessa (anti-XSS roubando token)
    sameSite: 'lax',       // não vai em requisições cross-site (anti-CSRF)
    secure: IS_PROD,       // só trafega em HTTPS em produção
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
}

// Middleware: exige login
async function auth(req, res, next) {
  try {
    const token = req.cookies[COOKIE]
    if (!token) {
      console.log(`[Auth] 401 sem cookie → ${req.method} ${req.path}`)
      return res.status(401).json({ error: 'Não autenticado' })
    }
    const decoded = jwt.verify(token, JWT_SECRET)
    if (decoded.twoFactorPending) {
      return res.status(401).json({ error: 'Conclua a verificação em duas etapas' })
    }
    const user = await prisma.user.findUnique({ where: { id: decoded.userId }, include: { subscription: true } })
    if (!user) {
      console.log(`[Auth] 401 usuário não encontrado id=${decoded.userId} → ${req.method} ${req.path}`)
      return res.status(401).json({ error: 'Conta não existe mais' })
    }
    req.user = user
    next()
  } catch (e) {
    console.log(`[Auth] 401 token inválido → ${req.method} ${req.path}:`, e.message)
    return res.status(401).json({ error: 'Sessão inválida ou expirada' })
  }
}

// Middleware: exige admin
function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Apenas administradores' })
  next()
}

/* ─── Auth ─── */

// Criar conta
app.post('/api/auth/register', authLimiter, async (req, res) => {
  const { name, handle, email, password } = req.body
  if (!name?.trim() || !handle?.trim() || !email?.trim() || !password || password.length < 6) {
    return res.status(400).json({ error: 'Preencha todos os campos (senha mínima de 6 caracteres)' })
  }
  // Limites de tamanho + formato de email (evita lixo/abuso e dados malformados)
  if (name.length > 40 || handle.length > 30 || email.length > 120 || password.length > 200) {
    return res.status(400).json({ error: 'Algum campo está longo demais' })
  }
  const cleanEmail = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Email inválido' })
  }
  const cleanHandle = handle.trim().toLowerCase().replace(/\s/g, '')

  const emailTaken = await prisma.user.findUnique({ where: { email: cleanEmail } })
  if (emailTaken) return res.status(409).json({ error: 'Este email já tem conta' })
  const handleTaken = await prisma.user.findUnique({ where: { handle: cleanHandle } })
  if (handleTaken) return res.status(409).json({ error: 'Este usuário já está em uso' })

  const hash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { name: name.trim(), handle: cleanHandle, email: cleanEmail, password: hash },
    include: { subscription: true },
  })
  setToken(res, user.id)
  res.json({ user: toClient(user) })
})

// Entrar
app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { email, password } = req.body
  if (!email?.trim() || !password) return res.status(400).json({ error: 'Informe email e senha' })

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: { subscription: true },
  })

  // Sempre compara (com hash fantasma se não houver usuário/senha) — tempo constante,
  // não revela quais emails existem nem distingue conta Discord-only.
  const ok = await bcrypt.compare(password, user?.password || DUMMY_HASH)
  if (!user || !user.password || !ok) {
    return res.status(401).json({ error: 'Email ou senha incorretos' })
  }

  // 2FA ativo: não loga ainda — pede o código com um token temporário (5 min)
  if (user.twoFactorEnabled) {
    const pendingToken = jwt.sign({ userId: user.id, twoFactorPending: true }, JWT_SECRET, { expiresIn: '5m' })
    return res.json({ twoFactorRequired: true, pendingToken })
  }

  setToken(res, user.id)
  res.json({ user: toClient(user) })
})

// Segundo passo do login quando a conta tem 2FA: valida o token temporário + o código TOTP
app.post('/api/auth/login/2fa', authLimiter, async (req, res) => {
  const { pendingToken, code } = req.body
  let payload
  try {
    payload = jwt.verify(pendingToken || '', JWT_SECRET)
  } catch {
    return res.status(401).json({ error: 'Sessão de verificação expirada — faça login de novo' })
  }
  if (!payload.twoFactorPending) return res.status(400).json({ error: 'Token inválido' })

  const user = await prisma.user.findUnique({ where: { id: payload.userId }, include: { subscription: true } })
  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    return res.status(400).json({ error: 'Verificação não disponível' })
  }
  // Aceita o código do app autenticador OU o código de recuperação enviado por email.
  const codeStr = String(code || '').trim()
  const valid = authenticator.verify({ token: codeStr, secret: user.twoFactorSecret })
    || consumeEmailCode(twoFactorEmailCodes, user.id, codeStr).ok
  if (!valid) return res.status(401).json({ error: 'Código de verificação incorreto' })

  setToken(res, user.id)
  res.json({ user: toClient(user) })
})

// Recuperação: envia um código por email para concluir o login quando se perde o app autenticador.
app.post('/api/auth/login/2fa/email', authLimiter, async (req, res) => {
  let payload
  try {
    payload = jwt.verify(req.body.pendingToken || '', JWT_SECRET)
  } catch {
    return res.status(401).json({ error: 'Sessão de verificação expirada — faça login de novo' })
  }
  if (!payload.twoFactorPending) return res.status(400).json({ error: 'Token inválido' })

  const user = await prisma.user.findUnique({ where: { id: payload.userId } })
  if (!user || !user.twoFactorEnabled) return res.status(400).json({ error: 'Verificação não disponível' })

  const code = gen6()
  twoFactorEmailCodes.set(user.id, { code, expires: Date.now() + CODE_TTL, attempts: 0 })
  try {
    await sendTwoFactorCode(user.email, code)
  } catch (err) {
    console.error('Erro ao enviar email 2FA:', err.message)
    return res.status(502).json({ error: 'Não foi possível enviar o email — tente de novo' })
  }
  // devCode SÓ em dev sem email configurado — nunca vaza o código em produção
  res.json({ ok: true, sentTo: maskEmail(user.email), ...(!IS_PROD && !mailConfigured ? { devCode: code } : {}) })
})

// Sair
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(COOKIE)
  res.json({ ok: true })
})

// Quem sou eu (restaura sessão ao recarregar a página)
app.get('/api/auth/me', auth, (req, res) => {
  res.json({ user: toClient(req.user) })
})

/* ─── Session redemption codes (para OAuth cross-port em dev) ─── */
// Após o callback do Discord (porta 3001), geramos um código de curta duração.
// O frontend (porta 5173) troca esse código por um cookie via proxy Vite,
// garantindo que o cookie seja definido na origem correta.
const authCodes = new Map() // code → { userId, expires }

/* ─── Discord OAuth ─── */

// Gera um handle único a partir do username do Discord
async function uniqueHandle(base) {
  const clean = base.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'user'
  let handle = clean
  let n = 1
  while (await prisma.user.findUnique({ where: { handle } })) {
    handle = `${clean}${n++}`
  }
  return handle
}

// Redireciona para o Discord para o usuário autorizar
// ?redirect=/planos para voltar para uma página específica após o OAuth
app.get('/api/auth/discord', (req, res) => {
  const redirect = typeof req.query.redirect === 'string' ? req.query.redirect : '/'
  // Captura o usuário logado AQUI (requisição same-origin, cookie presente) e o carrega ASSINADO no state.
  // Assim o callback vincula o Discord na conta certa mesmo que o cookie Lax não sobreviva ao redirect do
  // Discord — que é o que criava conta duplicada quando o e-mail do Discord ≠ e-mail do cadastro.
  let linkUserId = null
  try {
    const tok = req.cookies[COOKIE]
    if (tok) { const dec = jwt.verify(tok, JWT_SECRET); if (!dec.twoFactorPending) linkUserId = dec.userId }
  } catch { /* sem sessão válida — segue como login/cadastro via Discord */ }
  const state = jwt.sign({ r: redirect, link: linkUserId }, JWT_SECRET, { expiresIn: '10m' })
  res.redirect(getOAuthUrl(state))
})

// Callback após autorização no Discord
app.get('/api/auth/discord/callback', async (req, res) => {
  const { code } = req.query
  if (!code) return res.redirect('/?discord_error=1')

  try {
    const tokens = await exchangeCode(code)
    const dUser  = await getDiscordUser(tokens.access_token)

    // Decodifica o state ASSINADO: redirect interno + (se logado no início) o userId a vincular.
    let redirect = '/', linkUserId = null
    try {
      const st = jwt.verify(req.query.state, JWT_SECRET)
      if (typeof st.r === 'string' && /^\/[^/\\]/.test(st.r)) redirect = st.r  // anti open-redirect
      if (st.link) linkUserId = st.link
    } catch { /* state ausente/antigo → login/cadastro normal */ }
    // Fallback: se o state não trouxe o vínculo, tenta o cookie da sessão (same-origin)
    if (!linkUserId) {
      try {
        const tok = req.cookies[COOKIE]
        if (tok) { const dec = jwt.verify(tok, JWT_SECRET); if (!dec.twoFactorPending) linkUserId = dec.userId }
      } catch { /* sem sessão */ }
    }

    let user
    if (linkUserId) {
      // "Conectar Discord" logado → vincula NESTA conta, ignorando o e-mail do Discord (que costuma diferir).
      // Se este Discord já estiver em OUTRA conta (duplicata antiga), migra o vínculo pra cá (campo é @unique).
      const existing = await prisma.user.findUnique({ where: { discordId: dUser.id } })
      if (existing && existing.id !== linkUserId) {
        await prisma.user.update({ where: { id: existing.id }, data: { discordId: null, discordToken: null } })
      }
      user = await prisma.user.update({ where: { id: linkUserId }, data: { discordId: dUser.id, discordToken: tokens.access_token }, include: { subscription: true } })
    } else {
      // Login/cadastro via Discord (deslogado): 1) conta com esse Discord  2) mesmo e-mail  3) cria nova
      user = await prisma.user.findUnique({ where: { discordId: dUser.id }, include: { subscription: true } })
      if (user) {
        user = await prisma.user.update({ where: { id: user.id }, data: { discordToken: tokens.access_token }, include: { subscription: true } })
      } else if (dUser.email && (await prisma.user.findUnique({ where: { email: dUser.email } }))) {
        const byEmail = await prisma.user.findUnique({ where: { email: dUser.email }, include: { subscription: true } })
        user = await prisma.user.update({ where: { id: byEmail.id }, data: { discordId: dUser.id, discordToken: tokens.access_token }, include: { subscription: true } })
      } else {
        const handle = await uniqueHandle(dUser.username || dUser.global_name || 'user')
        user = await prisma.user.create({
          data: {
            name: dUser.global_name || dUser.username,
            handle,
            email: dUser.email || `discord_${dUser.id}@elixir.local`,
            password: null,
            discordId: dUser.id,
            discordToken: tokens.access_token,
          },
          include: { subscription: true },
        })
      }
    }

    // Vinculação pós-pagamento: se já tem assinatura Alpha ativa, entra no servidor + aplica o cargo + DM.
    const sub = user.subscription
    if (sub && new Date(sub.expiresAt) > new Date()) {
      // Primeiro garante que está NO servidor (usa o guilds.join), senão o cargo não tem em quem ser aplicado
      await addToGuild(user.discordId, tokens.access_token)
        .then(() => console.log(`[Discord] ✓ Adicionado ao servidor: ${user.discordId}`))
        .catch(e => console.error(`[Discord] ✗ addToGuild erro: ${e.message}`))
      await addAlphaRole(user.discordId)
        .then(() => console.log(`[Discord] ✓ Cargo aplicado pós-vínculo a ${user.discordId}`))
        .catch(e => console.error(`[Discord] ✗ Cargo erro: ${e.message}`))
      const INVITE = process.env.DISCORD_INVITE_URL
      await sendDM(user.discordId,
        `⚡ **Plano Alpha liberado!**\n\nSeu cargo **Alpha** foi aplicado.` +
        (INVITE ? `\nEntre no servidor: ${INVITE}` : '') +
        `\n\nBoas trades! 🚀`
      ).catch(() => {})
    }

    if (IS_PROD) {
      // Em prod: mesma origem, cookie direto
      setToken(res, user.id)
      res.redirect(redirect)
    } else {
      // Em dev: porta 3001 ≠ porta 5173 → cookie pode não cruzar portas em alguns browsers.
      // Geramos um código de 30s e mandamos o frontend resgatar via proxy Vite.
      // crypto.randomBytes (não Math.random) — código imprevisível, senão dá pra sequestrar sessão.
      const code = crypto.randomBytes(24).toString('hex')
      authCodes.set(code, { userId: user.id, expires: Date.now() + 30_000 })
      const base = process.env.CORS_ORIGIN || 'http://localhost:5173'
      const dest = new URL(base + redirect)
      dest.searchParams.set('_auth', code)
      res.redirect(dest.toString())
    }
  } catch (err) {
    console.error('Discord OAuth erro:', err.message)
    res.redirect('/?discord_error=1')
  }
})

// Troca o código de sessão por um cookie (chamado pelo frontend via proxy Vite)
app.post('/api/auth/redeem', async (req, res) => {
  const { code } = req.body
  const entry = code && authCodes.get(code)
  if (!entry || entry.expires < Date.now()) {
    authCodes.delete(code)
    return res.status(400).json({ error: 'Código inválido ou expirado' })
  }
  authCodes.delete(code)
  const user = await prisma.user.findUnique({ where: { id: entry.userId }, include: { subscription: true } })
  if (!user) return res.status(400).json({ error: 'Usuário não encontrado' })
  setToken(res, user.id)
  res.json({ user: toClient(user) })
})

/* ─── Conta ─── */

// Atualizar nome
app.patch('/api/account', auth, async (req, res) => {
  const name = (req.body.name || '').trim()
  if (!name) return res.status(400).json({ error: 'O nome não pode ficar vazio' })
  if (name.length > 40) return res.status(400).json({ error: 'Nome muito longo' })
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { name },
    include: { subscription: true },
  })
  res.json({ user: toClient(user) })
})

// Troca de senha em 2 passos: pede um código "por email", depois confirma.
// Em desenvolvimento o código sai no terminal do servidor (sem SMTP ainda).
const resetCodes = new Map() // userId -> { code, expires, attempts }
// Recuperação do 2FA por email (fallback de quem perdeu o app autenticador).
const twoFactorEmailCodes = new Map() // userId -> { code, expires, attempts }
const CODE_TTL = 15 * 60 * 1000 // 15 min

// Código de 6 dígitos criptograficamente seguro (não Math.random, que é previsível)
const gen6 = () => String(crypto.randomInt(100000, 1000000))

// Mascara o email ao exibir num passo só parcialmente autenticado: "pe***@gmail.com"
function maskEmail(email) {
  const [local, domain] = String(email || '').split('@')
  if (!domain) return '***'
  const head = local.slice(0, 2)
  return `${head}${'*'.repeat(Math.max(1, local.length - head.length))}@${domain}`
}

// Valida um código de 6 dígitos guardado em `map` (reaproveitado por reset de senha e 2FA por email),
// com limite de 5 tentativas erradas → invalida (anti força-bruta do código).
function consumeEmailCode(map, key, code) {
  const entry = map.get(key)
  if (!entry || entry.expires < Date.now()) {
    map.delete(key)
    return { ok: false, error: 'Código expirado — peça um novo' }
  }
  if (entry.code !== String(code || '').trim()) {
    entry.attempts = (entry.attempts || 0) + 1
    if (entry.attempts >= 5) {
      map.delete(key)
      return { ok: false, error: 'Muitas tentativas erradas — peça um novo código' }
    }
    return { ok: false, error: 'Código incorreto' }
  }
  map.delete(key) // consumido
  return { ok: true }
}
const checkResetCode = (userId, code) => consumeEmailCode(resetCodes, userId, code)

// Esqueceu a senha — não exige login, só o email cadastrado
app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase()
  if (!email) return res.status(400).json({ error: 'Informe o email' })
  const user = await prisma.user.findUnique({ where: { email } })
  // Responde ok mesmo se o email não existir (não revela se a conta existe)
  if (!user) return res.json({ ok: true, sentTo: email })
  const code = gen6()
  resetCodes.set(user.id, { code, expires: Date.now() + 15 * 60 * 1000, attempts: 0 })
  try {
    await sendPasswordCode(email, code)
  } catch (err) {
    console.error('Erro ao enviar email:', err.message)
    return res.status(502).json({ error: 'Não foi possível enviar o email — tente de novo' })
  }
  // devCode SÓ em desenvolvimento — nunca vaza o código na resposta em produção
  res.json({ ok: true, sentTo: email, ...(!IS_PROD && !mailConfigured ? { devCode: code } : {}) })
})

app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase()
  const { code, newPassword } = req.body
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return res.status(400).json({ error: 'Código inválido ou expirado' })
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'A nova senha precisa de pelo menos 6 caracteres' })
  const check = checkResetCode(user.id, code)
  if (!check.ok) return res.status(400).json({ error: check.error })
  const hash = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id: user.id }, data: { password: hash } })
  res.json({ ok: true })
})

app.post('/api/account/password/request', auth, authLimiter, async (req, res) => {
  const code = gen6()
  resetCodes.set(req.user.id, { code, expires: Date.now() + 15 * 60 * 1000, attempts: 0 })
  try {
    await sendPasswordCode(req.user.email, code)
  } catch (err) {
    console.error('Erro ao enviar email:', err.message)
    return res.status(502).json({ error: 'Não foi possível enviar o email — tente de novo' })
  }
  // devCode SÓ em desenvolvimento — nunca vaza o código na resposta em produção
  res.json({ ok: true, sentTo: req.user.email, ...(!IS_PROD && !mailConfigured ? { devCode: code } : {}) })
})

app.post('/api/account/password/confirm', auth, async (req, res) => {
  const { code, newPassword } = req.body
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'A nova senha precisa de pelo menos 6 caracteres' })
  }
  const check = checkResetCode(req.user.id, code)
  if (!check.ok) return res.status(400).json({ error: check.error })
  const hash = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id: req.user.id }, data: { password: hash } })
  res.json({ ok: true })
})

/* ─── 2FA (TOTP — app autenticador) ─── */
const APP_NAME = 'Elixir'

// Inicia a configuração: gera o segredo e o QR para escanear (ainda NÃO ativa)
app.post('/api/account/2fa/setup', auth, async (req, res) => {
  if (req.user.twoFactorEnabled) return res.status(400).json({ error: '2FA já está ativo' })
  const secret = authenticator.generateSecret()
  await prisma.user.update({ where: { id: req.user.id }, data: { twoFactorSecret: secret } })
  const otpauth = authenticator.keyuri(req.user.email, APP_NAME, secret)
  const qr = await QRCode.toDataURL(otpauth)
  res.json({ qr, secret }) // secret p/ digitar manualmente se não der pra escanear
})

// Confirma e ativa: valida um código gerado pelo app autenticador
app.post('/api/account/2fa/enable', auth, async (req, res) => {
  if (req.user.twoFactorEnabled) return res.status(400).json({ error: '2FA já está ativo' })
  if (!req.user.twoFactorSecret) return res.status(400).json({ error: 'Comece a configuração primeiro' })
  const valid = authenticator.verify({ token: String(req.body.code || '').trim(), secret: req.user.twoFactorSecret })
  if (!valid) return res.status(400).json({ error: 'Código incorreto — confira o app autenticador' })
  const user = await prisma.user.update({ where: { id: req.user.id }, data: { twoFactorEnabled: true }, include: { subscription: true } })
  res.json({ user: toClient(user) })
})

// Desativa: exige um código válido — do app OU o de recuperação por email
// (p/ quem perdeu o app mas continua logado não ficar preso com o 2FA ligado).
app.post('/api/account/2fa/disable', auth, async (req, res) => {
  if (!req.user.twoFactorEnabled) return res.status(400).json({ error: '2FA não está ativo' })
  const codeStr = String(req.body.code || '').trim()
  const valid = authenticator.verify({ token: codeStr, secret: req.user.twoFactorSecret })
    || consumeEmailCode(twoFactorEmailCodes, req.user.id, codeStr).ok
  if (!valid) return res.status(401).json({ error: 'Código incorreto' })
  const user = await prisma.user.update({ where: { id: req.user.id }, data: { twoFactorEnabled: false, twoFactorSecret: null }, include: { subscription: true } })
  res.json({ user: toClient(user) })
})

// Envia o código de recuperação por email para desativar o 2FA estando logado
app.post('/api/account/2fa/email', auth, authLimiter, async (req, res) => {
  if (!req.user.twoFactorEnabled) return res.status(400).json({ error: '2FA não está ativo' })
  const code = gen6()
  twoFactorEmailCodes.set(req.user.id, { code, expires: Date.now() + CODE_TTL, attempts: 0 })
  try {
    await sendTwoFactorCode(req.user.email, code)
  } catch (err) {
    console.error('Erro ao enviar email 2FA:', err.message)
    return res.status(502).json({ error: 'Não foi possível enviar o email — tente de novo' })
  }
  res.json({ ok: true, sentTo: maskEmail(req.user.email), ...(!IS_PROD && !mailConfigured ? { devCode: code } : {}) })
})

/* ─── Planos & Assinaturas ─── */

// Catálogo de planos (lido do banco)
app.get('/api/plans', async (req, res) => {
  const plans = await prisma.plan.findMany()
  res.json({ plans })
})

// Ativa/renova o Alpha de um usuário: grava a assinatura, aplica o cargo e manda DM.
// Reutilizada pelo webhook da Stripe (cartão e PIX) e pelo comp manual do admin.
async function activateAlpha({ userId, planId, expiresAt, priceSol = 0, priceBrl = 0, recurring = false,
                               stripeCustomerId = null, stripeSubscriptionId = null, isRenewal = false }) {
  await prisma.subscription.upsert({
    where: { userId },
    create: { userId, planId, priceSol, priceBrl, expiresAt, status: 'active', stripeCustomerId, stripeSubscriptionId },
    update: { planId, priceSol, priceBrl, expiresAt, status: 'active', stripeCustomerId, stripeSubscriptionId, ...(isRenewal ? {} : { startsAt: new Date() }) },
  })
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return
  console.log(`[Alpha] ${isRenewal ? 'renovado' : 'ativado'} user=${user.name} plan=${planId} discordId=${user.discordId ?? 'null'}`)

  if (!user.discordId) {
    console.log('[Alpha] ⚠ Sem discordId — cargo e DM pulados')
    return
  }
  await addAlphaRole(user.discordId)
    .then(() => console.log(`[Alpha] ✓ Cargo dado a ${user.discordId}`))
    .catch(e => console.error(`[Alpha] ✗ Cargo erro: ${e.message}`))

  if (isRenewal) return // renovação automática não precisa de DM toda vez

  const expDate = new Date(expiresAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const msg = recurring
    ? `⚡ **Plano Alpha ativado!**\n\nSeu cargo **Alpha** foi aplicado no servidor.\n` +
      `🔄 Assinatura recorrente — renova automaticamente.\n📅 Próxima renovação: **${expDate}**\n\n` +
      `Acesse os canais exclusivos e boas trades! 🚀`
    : `⚡ **Plano Alpha ativado!**\n\nSeu cargo **Alpha** foi aplicado no servidor.\n` +
      `📅 Válido até: **${expDate}**\n\nAcesse os canais exclusivos e boas trades! 🚀`
  await sendDM(user.discordId, msg)
    .then(() => console.log(`[Alpha] ✓ DM enviada a ${user.discordId}`))
    .catch(e => console.error(`[Alpha] ✗ DM erro: ${e.message}`))
}

// Comp manual de Alpha (somente admin) — libera sem pagamento, por prazo do plano.
app.post('/api/subscriptions', auth, adminOnly, async (req, res) => {
  const userId = Number(req.body.userId) || req.user.id
  const plan = await prisma.plan.findUnique({ where: { id: req.body.plan || '' } })
  if (!plan || !plan.durationDays) return res.status(400).json({ error: 'Plano inválido' })
  const expiresAt = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000)
  await activateAlpha({ userId, planId: plan.id, expiresAt, priceSol: plan.priceSol || 0 })
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { subscription: true } })
  res.json({ user: toClient(user) })
})

// Remove o Alpha de um usuário (somente admin) — apaga a assinatura e tira o cargo no Discord.
app.delete('/api/subscriptions/:userId', auth, adminOnly, async (req, res) => {
  const userId = Number(req.params.userId)
  if (!userId) return res.status(400).json({ error: 'userId inválido' })
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
  if (user.discordId) {
    await removeAlphaRole(user.discordId).catch(e => console.error(`[Alpha] remover cargo (admin): ${e.message}`))
  }
  await prisma.subscription.deleteMany({ where: { userId } })
  console.log(`[Alpha] removido (admin) user=${user.name}`)
  const updated = await prisma.user.findUnique({ where: { id: userId }, include: { subscription: true } })
  res.json({ user: toClient(updated) })
})

// Cria a sessão de checkout na Stripe.
// method 'card' → assinatura recorrente; method 'pix' → pagamento único (avulso).
// referral (Rewardful) é repassado como client_reference_id quando presente.
app.post('/api/checkout', auth, payLimiter, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Pagamento ainda não configurado' })

  const { plan: planId, method, referral } = req.body
  const plan = await prisma.plan.findUnique({ where: { id: planId || '' } })
  if (!plan || !plan.durationDays || !plan.priceBrl) return res.status(400).json({ error: 'Plano inválido' })
  // Discord NÃO é exigido aqui — vinculação acontece depois do pagamento confirmado.

  const unitAmount = plan.priceBrl // centavos de R$ (valor fixo)
  const isPix = method === 'pix'
  const base = process.env.CORS_ORIGIN || 'http://localhost:5173'
  const productName = `Elixir ${plan.name} — ${plan.badge}`

  const params = {
    success_url: `${base}/planos?checkout=success`,
    cancel_url: `${base}/planos?checkout=cancel`,
    customer_email: req.user.email,
    metadata: { userId: String(req.user.id), planId: plan.id },
  }
  // Stripe rejeita client_reference_id vazio — só envia quando o afiliado existe
  if (referral) params.client_reference_id = referral

  try {
    let session
    if (isPix) {
      session = await stripe.checkout.sessions.create({
        ...params,
        mode: 'payment',
        payment_method_types: ['pix'],
        customer_creation: 'always', // necessário p/ Rewardful associar a venda no modo payment
        line_items: [{
          quantity: 1,
          price_data: { currency: 'brl', product_data: { name: productName }, unit_amount: unitAmount },
        }],
      })
    } else {
      session = await stripe.checkout.sessions.create({
        ...params,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{
          quantity: 1,
          price_data: {
            currency: 'brl',
            product_data: { name: productName },
            unit_amount: unitAmount,
            recurring: RECURRING_INTERVAL[plan.id],
          },
        }],
        subscription_data: { metadata: { userId: String(req.user.id), planId: plan.id } },
      })
    }
    res.json({ url: session.url })
  } catch (err) {
    console.error('[Checkout] erro:', err.message)
    res.status(502).json({ error: 'Não foi possível iniciar o pagamento' })
  }
})

/* ─── Webhook da Stripe ─── */

// Calcula a validade e ativa o Alpha a partir de uma sessão paga (cartão ou PIX)
async function handleSessionPaid(session) {
  const userId = Number(session.metadata?.userId)
  const planId = session.metadata?.planId
  if (!userId || !planId) return console.warn('[Stripe] sessão sem metadata userId/planId')

  const plan = await prisma.plan.findUnique({ where: { id: planId } })
  if (!plan) return

  let expiresAt, stripeSubscriptionId = null, recurring = false
  if (session.mode === 'subscription' && session.subscription) {
    recurring = true
    const sub = await stripe.subscriptions.retrieve(session.subscription)
    stripeSubscriptionId = sub.id
    const periodEnd = sub.current_period_end || sub.items?.data?.[0]?.current_period_end
    expiresAt = periodEnd ? new Date(periodEnd * 1000) : new Date(Date.now() + plan.durationDays * 86400000)
  } else {
    // PIX / pagamento único — validade pelo prazo do plano
    expiresAt = new Date(Date.now() + plan.durationDays * 86400000)
  }

  await activateAlpha({
    userId, planId, expiresAt, recurring,
    priceSol: plan.priceSol || 0,
    priceBrl: session.amount_total || 0, // R$ realmente cobrado (centavos)
    stripeCustomerId: session.customer || null,
    stripeSubscriptionId,
  })
}

// Renovação automática do cartão (fatura de ciclo paga) → estende a validade
async function handleRenewal(invoice) {
  const sub = await stripe.subscriptions.retrieve(invoice.subscription)
  const userId = Number(sub.metadata?.userId)
  const planId = sub.metadata?.planId
  if (!userId || !planId) return
  const plan = await prisma.plan.findUnique({ where: { id: planId } })
  const periodEnd = sub.current_period_end || sub.items?.data?.[0]?.current_period_end
  const expiresAt = periodEnd ? new Date(periodEnd * 1000) : new Date(Date.now() + (plan?.durationDays || 30) * 86400000)
  await activateAlpha({
    userId, planId, expiresAt, recurring: true, isRenewal: true,
    priceSol: plan?.priceSol || 0,
    priceBrl: invoice.amount_paid || 0,
    stripeCustomerId: sub.customer, stripeSubscriptionId: sub.id,
  })
}

// Assinatura de cartão cancelada/encerrada → remove cargo e apaga a assinatura local
async function handleSubscriptionDeleted(sub) {
  const userId = Number(sub.metadata?.userId)
  if (!userId) return
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (user?.discordId) {
    await removeAlphaRole(user.discordId).catch(e => console.error(`[Stripe] remover cargo: ${e.message}`))
  }
  await prisma.subscription.deleteMany({ where: { userId } })
  console.log(`[Stripe] assinatura cancelada — Alpha removido de user=${userId}`)
}

// Handler do webhook (corpo RAW; assinatura verificada com o secret)
async function stripeWebhook(req, res) {
  if (!stripe) return res.status(503).end()
  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], stripeWebhookSecret)
  } catch (err) {
    console.error('[Stripe] webhook inválido:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object
        if (s.payment_status === 'paid') await handleSessionPaid(s) // cartão = pago na hora
        break
      }
      case 'checkout.session.async_payment_succeeded':
        await handleSessionPaid(event.data.object) // PIX confirmado (assíncrono)
        break
      case 'invoice.paid': {
        const inv = event.data.object
        if (inv.billing_reason === 'subscription_cycle' && inv.subscription) await handleRenewal(inv)
        break
      }
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break
    }
  } catch (e) {
    console.error(`[Stripe] erro ao processar ${event.type}:`, e.message)
  }
  res.json({ received: true })
}

/* ─── Programa de afiliados (Rewardful) ─── */

// Cache dos stats por afiliado (rate limit ~45 req/30s na API) — TTL 60s
const affiliateStatsCache = new Map() // affiliateId -> { data, expires }

const affiliateTokenFrom = (handle) =>
  (handle || 'user').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30) || 'user'

// Vira afiliado: cria no Rewardful e salva o UUID + token + link no usuário
app.post('/api/affiliate/join', auth, payLimiter, async (req, res) => {
  if (!rewardfulConfigured) return res.status(503).json({ error: 'Programa de afiliados não configurado' })
  if (req.user.affiliateId) {
    return res.json({ affiliate: { id: req.user.affiliateId, token: req.user.affiliateToken, url: req.user.affiliateLink } })
  }
  try {
    const campaignId = await getDefaultCampaignId()
    const [firstName, ...rest] = (req.user.name || req.user.handle).trim().split(/\s+/)
    const lastName = rest.join(' ') || firstName

    // Token a partir do handle; em conflito, tenta com sufixo aleatório
    let token = affiliateTokenFrom(req.user.handle)
    let affiliate
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        affiliate = await createAffiliate({ firstName, lastName, email: req.user.email, token, campaignId })
        break
      } catch (e) {
        if (/token/i.test(e.message) && attempt < 2) {
          token = `${affiliateTokenFrom(req.user.handle)}${Math.floor(Math.random() * 9000 + 1000)}`
          continue
        }
        throw e
      }
    }

    const link = affiliate.links?.[0]?.url || affiliate.url || null
    const realToken = affiliate.links?.[0]?.token || affiliate.token || token

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { affiliateId: affiliate.id, affiliateToken: realToken, affiliateLink: link },
      include: { subscription: true },
    })
    console.log(`[Affiliate] criado user=${updated.name} token=${realToken}`)
    res.json({ user: toClient(updated), affiliate: { id: affiliate.id, token: realToken, url: link } })
  } catch (err) {
    console.error('[Affiliate] erro ao criar:', err.message)
    const friendly = /email/i.test(err.message)
      ? 'Este e-mail já está cadastrado como afiliado no Rewardful.'
      : 'Não foi possível criar o afiliado: ' + err.message
    res.status(502).json({ error: friendly })
  }
})

// Stats + comissões do afiliado (proxy com cache). Valores em centavos.
app.get('/api/affiliate/stats', auth, async (req, res) => {
  if (!rewardfulConfigured) return res.status(503).json({ error: 'Programa de afiliados não configurado' })
  const id = req.user.affiliateId
  if (!id) return res.status(400).json({ error: 'Você ainda não é afiliado' })

  const cached = affiliateStatsCache.get(id)
  if (cached && cached.expires > Date.now()) return res.json(cached.data)

  try {
    const [affiliate, commissions] = await Promise.all([getAffiliate(id), getCommissions(id)])

    // Totais por estado (centavos)
    const totals = { due: 0, pending: 0, paid: 0, voided: 0 }
    for (const c of commissions) {
      if (totals[c.state] !== undefined) totals[c.state] += (c.amount || 0)
    }

    // Ganhos ao longo do tempo (por dia de created_at), ignorando voided
    const byDay = {}
    for (const c of commissions) {
      if (c.state === 'voided') continue
      const day = (c.created_at || '').slice(0, 10)
      if (day) byDay[day] = (byDay[day] || 0) + (c.amount || 0)
    }
    const timeline = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, amount]) => ({ date, amount }))

    const link = affiliate.links?.[0] || {}
    const visitors = affiliate.visitors ?? link.visitors ?? 0
    const leads = affiliate.leads ?? link.leads ?? 0
    const conversions = affiliate.conversions ?? link.conversions ?? 0

    const data = {
      currency: commissions[0]?.currency || 'BRL',
      totals,
      totalCommissions: commissions.length,
      timeline,
      visitors, leads, conversions,
      conversionRate: visitors > 0 ? conversions / visitors : 0,
      link: req.user.affiliateLink,
      token: req.user.affiliateToken,
    }
    affiliateStatsCache.set(id, { data, expires: Date.now() + 60_000 })
    res.json(data)
  } catch (err) {
    console.error('[Affiliate] erro nos stats:', err.message)
    res.status(502).json({ error: 'Não foi possível carregar os dados de afiliado' })
  }
})

/* ─── Pagamento em SOL (Solana) ─── */

const cryptoIntents = new Map()   // reference -> { userId, planId, main, fee, expires }
const usedSignatures = new Set()  // anti-replay

// 1) Monta a transação (split 90/10) para a Phantom assinar
app.post('/api/crypto/intent', auth, payLimiter, async (req, res) => {
  if (!solanaConfigured) return res.status(503).json({ error: 'Pagamento em SOL não configurado' })
  const { plan: planId, payer } = req.body
  if (!payer) return res.status(400).json({ error: 'Carteira não informada' })
  const plan = await prisma.plan.findUnique({ where: { id: planId || '' } })
  if (!plan || !plan.durationDays || !plan.priceSol) return res.status(400).json({ error: 'Plano inválido' })

  const reference = 'elx_' + crypto.randomBytes(8).toString('hex')
  try {
    const { transaction, main, fee } = await buildPaymentTx(payer, plan.priceSol, reference)
    cryptoIntents.set(reference, { userId: req.user.id, planId: plan.id, main, fee, expires: Date.now() + 10 * 60 * 1000 })
    res.json({ transaction, reference, amountSol: plan.priceSol })
  } catch (err) {
    console.error('[Crypto] erro ao montar tx:', err.message)
    res.status(502).json({ error: 'Não foi possível montar o pagamento' })
  }
})

// 2) Confirma o pagamento assinado: verifica on-chain e libera o Alpha
app.post('/api/crypto/confirm', auth, async (req, res) => {
  if (!solanaConfigured) return res.status(503).json({ error: 'Pagamento em SOL não configurado' })
  const { signature, reference } = req.body
  const intent = reference && cryptoIntents.get(reference)
  if (!intent || intent.expires < Date.now()) return res.status(400).json({ error: 'Pagamento expirado — recomece' })
  if (intent.userId !== req.user.id) return res.status(403).json({ error: 'Pagamento de outro usuário' })
  if (!signature) return res.status(400).json({ error: 'Assinatura não informada' })
  if (usedSignatures.has(signature)) return res.status(400).json({ error: 'Esta transação já foi usada' })

  const result = await verifyPayment(signature, { main: intent.main, fee: intent.fee, reference })
  if (!result.ok) return res.status(400).json({ error: result.reason })

  usedSignatures.add(signature)
  cryptoIntents.delete(reference)

  const plan = await prisma.plan.findUnique({ where: { id: intent.planId } })
  const expiresAt = new Date(Date.now() + plan.durationDays * 86400000)
  await activateAlpha({ userId: req.user.id, planId: intent.planId, expiresAt, priceSol: plan.priceSol })
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, include: { subscription: true } })
  console.log(`[Crypto] ✓ pagamento confirmado user=${user.name} sig=${signature.slice(0, 12)}…`)
  res.json({ user: toClient(user) })
})

/* ─── Área do Aluno (conteúdo) ─── */

// Só membros Alpha (assinatura ativa) ou admin
function alphaOnly(req, res, next) {
  const sub = req.user.subscription
  const active = sub && new Date(sub.expiresAt) > new Date()
  if (!active && req.user.role !== 'admin') return res.status(403).json({ error: 'Conteúdo exclusivo para membros Alpha' })
  next()
}

// Extrai o ID de um link do YouTube (watch?v=, youtu.be/, embed/, shorts/)
function youtubeId(url) {
  const m = String(url || '').match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  return m ? m[1] : null
}

// Monta a árvore de categorias com seus conteúdos aninhados.
// includeVideoUrl=false (aluno): NÃO expõe o link/ID do vídeo na árvore — ele só é
// buscado quando o aluno clica em play (rota /api/student/video/:id). Assim o ID não
// fica no código da página nem na API. Admin (true) recebe o url para poder editar.
async function buildTree(includeVideoUrl = false) {
  const [cats, contents] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ position: 'asc' }, { id: 'asc' }] }),
    prisma.content.findMany({ orderBy: [{ position: 'asc' }, { id: 'asc' }] }),
  ])
  const byId = new Map(cats.map(c => [c.id, { id: c.id, name: c.name, parentId: c.parentId, position: c.position, children: [], contents: [] }]))
  for (const ct of contents) {
    const node = byId.get(ct.categoryId)
    if (!node) continue
    const item = { id: ct.id, type: ct.type, title: ct.title, description: ct.description, position: ct.position }
    if (ct.type === 'tool') { item.url = ct.url; item.fileName = ct.fileName }   // arquivo (gated em /uploads)
    else if (includeVideoUrl) { item.url = ct.url }                              // vídeo: só pro admin editar
    node.contents.push(item)
  }
  const roots = []
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) byId.get(node.parentId).children.push(node)
    else roots.push(node)
  }
  return roots
}

// Aluno: árvore completa (exclusivo Alpha) — sem o link/ID dos vídeos
app.get('/api/student/tree', auth, alphaOnly, async (req, res) => {
  res.json({ tree: await buildTree(false) })
})

// Aluno: resolve UM vídeo só na hora do play (não vaza o ID na árvore).
// Para YouTube devolve só o videoId (o front usa a IFrame API com player próprio,
// sem a interface do YouTube — sem copiar-link/logo). Outros: cai pro src direto.
app.get('/api/student/video/:id', auth, alphaOnly, async (req, res) => {
  const content = await prisma.content.findUnique({ where: { id: Number(req.params.id) } })
  if (!content || content.type !== 'video' || !content.url) return res.status(404).json({ error: 'Vídeo não encontrado' })
  res.set('Cache-Control', 'private, no-store')
  const yt = youtubeId(content.url)
  if (yt) return res.json({ youtube: true, videoId: yt })
  res.json({ youtube: false, src: content.url })
})

// Admin: mesma árvore (para gerenciar) — inclui o url do vídeo para edição
app.get('/api/admin/tree', auth, adminOnly, async (req, res) => {
  res.json({ tree: await buildTree(true) })
})

// Admin: criar categoria
app.post('/api/admin/categories', auth, adminOnly, async (req, res) => {
  const name = (req.body.name || '').trim()
  if (!name) return res.status(400).json({ error: 'Nome obrigatório' })
  if (name.length > 60) return res.status(400).json({ error: 'Nome muito longo' })
  const parentId = req.body.parentId ? Number(req.body.parentId) : null
  const cat = await prisma.category.create({ data: { name, parentId, position: Number(req.body.position) || 0 } }).catch(() => null)
  if (!cat) return res.status(400).json({ error: 'Categoria-pai inválida' })
  res.json({ category: cat })
})

// Admin: renomear categoria
app.patch('/api/admin/categories/:id', auth, adminOnly, async (req, res) => {
  const data = {}
  if (typeof req.body.name === 'string' && req.body.name.trim()) data.name = req.body.name.trim().slice(0, 60)
  if ('position' in req.body) data.position = Number(req.body.position) || 0
  const cat = await prisma.category.update({ where: { id: Number(req.params.id) }, data }).catch(() => null)
  if (!cat) return res.status(404).json({ error: 'Categoria não existe' })
  res.json({ category: cat })
})

// Admin: apagar categoria (cascata: subcategorias + conteúdos)
app.delete('/api/admin/categories/:id', auth, adminOnly, async (req, res) => {
  await prisma.category.delete({ where: { id: Number(req.params.id) } }).catch(() => null)
  res.json({ ok: true })
})

// Apaga (best-effort) um arquivo enviado, dado seu url "/uploads/xxxx"
function removeUploadFile(url) {
  if (typeof url !== 'string' || !url.startsWith('/uploads/')) return
  const name = path.basename(url) // basename evita path traversal
  fs.promises.unlink(path.join(UPLOADS, name)).catch(() => {})
}

// Admin: enviar arquivo de ferramenta → devolve o caminho servível + nome original
app.post('/api/admin/upload', auth, adminOnly, (req, res) => {
  uploadTool(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Arquivo grande demais (máx. 50 MB)' : 'Falha no upload' })
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' })
    // multer entrega originalname em latin1; reinterpreta como UTF-8 (acentos/ç)
    const original = Buffer.from(req.file.originalname, 'latin1').toString('utf8')
    res.json({ url: `/uploads/${req.file.filename}`, fileName: original.slice(0, 200), size: req.file.size })
  })
})

// Admin: criar conteúdo (vídeo ou ferramenta)
app.post('/api/admin/contents', auth, adminOnly, async (req, res) => {
  const { categoryId, type, title, url, fileName, description } = req.body
  if (!categoryId) return res.status(400).json({ error: 'Categoria obrigatória' })
  if (!title?.trim()) return res.status(400).json({ error: 'Título obrigatório' })
  const isTool = type === 'tool'
  const content = await prisma.content.create({ data: {
    categoryId: Number(categoryId),
    type: isTool ? 'tool' : 'video',
    title: title.trim().slice(0, 120),
    url: (url || '').trim() || null,
    fileName: isTool && fileName ? String(fileName).slice(0, 200) : null,
    description: (description || '').trim().slice(0, 500) || null,
    position: Number(req.body.position) || 0,
  } }).catch(() => null)
  if (!content) return res.status(400).json({ error: 'Categoria inválida' })
  res.json({ content })
})

// Admin: editar conteúdo
app.patch('/api/admin/contents/:id', auth, adminOnly, async (req, res) => {
  const existing = await prisma.content.findUnique({ where: { id: Number(req.params.id) } })
  if (!existing) return res.status(404).json({ error: 'Conteúdo não existe' })
  const data = {}
  if (typeof req.body.title === 'string' && req.body.title.trim()) data.title = req.body.title.trim().slice(0, 120)
  if (typeof req.body.url === 'string') data.url = req.body.url.trim() || null
  if ('fileName' in req.body) data.fileName = req.body.fileName ? String(req.body.fileName).slice(0, 200) : null
  if (typeof req.body.description === 'string') data.description = req.body.description.trim().slice(0, 500) || null
  if (req.body.type) data.type = req.body.type === 'tool' ? 'tool' : 'video'
  if ('position' in req.body) data.position = Number(req.body.position) || 0
  const content = await prisma.content.update({ where: { id: existing.id }, data }).catch(() => null)
  if (!content) return res.status(404).json({ error: 'Conteúdo não existe' })
  // se o arquivo (url) mudou, remove o antigo do disco
  if ('url' in data && existing.url !== content.url) removeUploadFile(existing.url)
  res.json({ content })
})

// Admin: apagar conteúdo
app.delete('/api/admin/contents/:id', auth, adminOnly, async (req, res) => {
  const removed = await prisma.content.delete({ where: { id: Number(req.params.id) } }).catch(() => null)
  if (removed) removeUploadFile(removed.url)
  res.json({ ok: true })
})

// Reordena um item entre seus irmãos (troca com o vizinho) e renormaliza as posições 0..n.
// Funciona mesmo se todas as posições forem 0 (ordena por position, depois id — igual ao buildTree).
async function moveAmongSiblings(model, id, dir, siblingWhere) {
  const items = await prisma[model].findMany({ where: siblingWhere, orderBy: [{ position: 'asc' }, { id: 'asc' }] })
  const idx = items.findIndex(s => s.id === id)
  if (idx === -1) return false
  const swap = idx + (dir === 'up' ? -1 : 1)
  if (swap < 0 || swap >= items.length) return true // já está na ponta: no-op
  ;[items[idx], items[swap]] = [items[swap], items[idx]]
  await prisma.$transaction(items.map((s, i) => prisma[model].update({ where: { id: s.id }, data: { position: i } })))
  return true
}

// Admin: mover conteúdo para cima/baixo (dentro da mesma categoria)
app.post('/api/admin/contents/:id/move', auth, adminOnly, async (req, res) => {
  const item = await prisma.content.findUnique({ where: { id: Number(req.params.id) } })
  if (!item) return res.status(404).json({ error: 'Conteúdo não existe' })
  await moveAmongSiblings('content', item.id, req.body.dir, { categoryId: item.categoryId })
  res.json({ ok: true })
})

// Admin: mover categoria para cima/baixo (entre os irmãos de mesmo pai)
app.post('/api/admin/categories/:id/move', auth, adminOnly, async (req, res) => {
  const item = await prisma.category.findUnique({ where: { id: Number(req.params.id) } })
  if (!item) return res.status(404).json({ error: 'Categoria não existe' })
  await moveAmongSiblings('category', item.id, req.body.dir, { parentId: item.parentId })
  res.json({ ok: true })
})

/* ─── Comentários (reviews da comunidade) ─── */

// Formato de comentário enviado ao front
function commentToClient(c) {
  const sub = c.user.subscription
  const active = sub && new Date(sub.expiresAt) > new Date()
  return {
    id: c.id,
    text: c.text,
    likes: c.likes,
    createdAt: c.createdAt,
    author: {
      name: c.user.name,
      handle: c.user.handle,
      plan: active || c.user.role === 'admin' ? 'alpha' : 'normal',
    },
  }
}

// Lista pública de reviews
app.get('/api/comments', async (req, res) => {
  const comments = await prisma.comment.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: { include: { subscription: true } } },
  })
  res.json({ comments: comments.map(commentToClient) })
})

// Publicar review (precisa estar logado)
app.post('/api/comments', auth, async (req, res) => {
  const text = (req.body.text || '').trim()
  if (!text) return res.status(400).json({ error: 'Escreva alguma coisa' })
  if (text.length > 500) return res.status(400).json({ error: 'Máximo de 500 caracteres' })

  const c = await prisma.comment.create({
    data: { text, userId: req.user.id },
    include: { user: { include: { subscription: true } } },
  })
  res.json({ comment: commentToClient(c) })
})

// Curtir / descurtir
app.post('/api/comments/:id/like', auth, async (req, res) => {
  const id = Number(req.params.id)
  const delta = req.body.remove ? -1 : 1
  const c = await prisma.comment.update({
    where: { id },
    data: { likes: { increment: delta } },
  }).catch(() => null)
  if (!c) return res.status(404).json({ error: 'Comentário não existe' })
  res.json({ likes: Math.max(0, c.likes) })
})

// Apagar — o autor apaga o próprio, o admin apaga qualquer um
app.delete('/api/comments/:id', auth, async (req, res) => {
  const id = Number(req.params.id)
  const c = await prisma.comment.findUnique({ where: { id } })
  if (!c) return res.status(404).json({ error: 'Comentário não existe' })
  if (req.user.role !== 'admin' && c.userId !== req.user.id) {
    return res.status(403).json({ error: 'Sem permissão' })
  }
  await prisma.comment.delete({ where: { id } })
  res.json({ ok: true })
})

/* ─── Admin ─── */

// Estatísticas reais: receita, vendas por mês, totais
app.get('/api/admin/stats', auth, adminOnly, async (req, res) => {
  const subs = await prisma.subscription.findMany()

  // Receita em SOL (soma dos planos) e em R$ (soma do que foi cobrado via Stripe) — valores fixos
  const revenueSol = subs.reduce((a, s) => a + (s.priceSol || 0), 0)
  const revenueBrl = subs.reduce((a, s) => a + (s.priceBrl || 0), 0) / 100

  // Últimos 6 meses, vendas agrupadas por plano
  const months = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
      m1: 0, m3: 0, y1: 0,
    })
  }
  const bucket = { 'alpha-1m': 'm1', 'alpha-3m': 'm3', 'alpha-1y': 'y1' }
  for (const s of subs) {
    const d = new Date(s.startsAt)
    const m = months.find(x => x.key === `${d.getFullYear()}-${d.getMonth()}`)
    if (m && bucket[s.planId]) m[bucket[s.planId]]++
  }

  const commentsCount = await prisma.comment.count()
  res.json({
    revenueSol, revenueBrl,
    revenue: revenueBrl, // compat
    totalSales: subs.length, sales: months, commentsCount,
  })
})

// Lista todas as contas com plano
app.get('/api/admin/users', auth, adminOnly, async (req, res) => {
  const users = await prisma.user.findMany({
    include: { subscription: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json({
    users: users.map(u => ({
      ...toClient(u),
      createdAt: u.createdAt,
    })),
  })
})

// Apaga uma conta
app.delete('/api/admin/users/:id', auth, adminOnly, async (req, res) => {
  const id = Number(req.params.id)
  if (id === req.user.id) return res.status(400).json({ error: 'Você não pode apagar a própria conta admin' })
  await prisma.user.delete({ where: { id } }).catch(() => null)
  res.json({ ok: true })
})

/* ─── Verificador de planos expirados ─── */

async function checkExpiredPlans() {
  // Só remove assinaturas SEM stripeSubscriptionId (PIX avulso / comp manual).
  // As de cartão recorrente são governadas pela Stripe (evento customer.subscription.deleted),
  // senão o cargo seria removido no fim do ciclo antes da renovação chegar.
  const expired = await prisma.subscription.findMany({
    where: { expiresAt: { lt: new Date() }, stripeSubscriptionId: null },
    include: { user: true },
  })
  for (const sub of expired) {
    // Remove cargo Alpha no Discord — só toca em quem tem discordId vinculado pelo site
    if (sub.user.discordId) {
      await removeAlphaRole(sub.user.discordId).catch(err =>
        console.error(`Erro ao remover cargo Discord de ${sub.user.discordId}:`, err.message)
      )
    }
    await prisma.subscription.delete({ where: { id: sub.id } })
    console.log(`✓ Plano expirado removido: user ${sub.user.id} (${sub.user.name})`)
  }
}

// Roda imediatamente ao iniciar e depois a cada hora
checkExpiredPlans()
setInterval(checkExpiredPlans, 60 * 60 * 1000) // 1 hora

// Gateway Discord: detecta quando alguém entra no servidor e dá o cargo Alpha
startGateway(prisma, addAlphaRole, sendDM)

/* ─── Static (produção) ─── */

// Serve o build do React e deixa o React Router tratar as rotas SPA
import { existsSync } from 'fs'
if (IS_PROD && existsSync(DIST)) {
  app.use(express.static(DIST))
  app.get(/.*/, (req, res) => res.sendFile(path.join(DIST, 'index.html'))) // Express 5: catch-all do SPA (o '*' antigo quebra)
}

/* ─── Handler de erro global ─── */
// Express 5 encaminha erros (inclusive de async) pra cá. Nunca vaza stack trace pro cliente.
app.use((err, req, res, next) => {
  console.error(`[Erro] ${req.method} ${req.path}:`, err.message)
  if (res.headersSent) return next(err)
  res.status(err.status || 500).json({ error: 'Erro interno no servidor' })
})

/* ─── Start ─── */

app.listen(PORT, () => {
  console.log(`✓ API Elixir rodando em http://localhost:${PORT}`)
})
