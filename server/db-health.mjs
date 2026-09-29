// Check-up do banco (SÓ LEITURA — não altera nada). Estrutura + consistência dos dados + arquivos.
//
// Rodar na VPS (com a API no ar mesmo, é só leitura):
//   cd /var/www/elixir/server && node db-health.mjs
// Local: cd server && node db-health.mjs
//
// ✓ = ok · ⚠ = olhar com calma (nem sempre é erro) · ✗ = problema
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { PrismaClient } from '@prisma/client'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const prisma = new PrismaClient()
const now = new Date()
const DAY = 24 * 3600 * 1000
let warns = 0, errs = 0
const ok = (m) => console.log(`  ✓ ${m}`)
const warn = (m) => { warns++; console.log(`  ⚠ ${m}`) }
const bad = (m) => { errs++; console.log(`  ✗ ${m}`) }
const check = (n, msgOk, msgBad, level = warn) => (n === 0 ? ok(msgOk) : level(`${msgBad}: ${n}`))
const brl = (c) => `R$ ${(c / 100).toFixed(2).replace('.', ',')}`
const kb = (b) => `${Math.round(b / 1024)} KB`

// ── 1. Estrutura ──
console.log('\n1. Estrutura do SQLite')
const integ = await prisma.$queryRawUnsafe('PRAGMA integrity_check')
const integMsg = integ.map(r => Object.values(r)[0]).join(', ')
integMsg === 'ok' ? ok('integrity_check: ok') : bad(`integrity_check: ${integMsg}`)
const fk = await prisma.$queryRawUnsafe('PRAGMA foreign_key_check')
check(fk.length, 'chaves estrangeiras íntegras', 'linhas apontando pra registro inexistente', bad)
const [{ journal_mode }] = await prisma.$queryRawUnsafe('PRAGMA journal_mode')
journal_mode === 'wal' ? ok('journal_mode: wal') : warn(`journal_mode: ${journal_mode} (wal aguenta melhor leitura+escrita juntas)`)
const [{ page_count }] = await prisma.$queryRawUnsafe('PRAGMA page_count')
const [{ page_size }] = await prisma.$queryRawUnsafe('PRAGMA page_size')
const [{ freelist_count }] = await prisma.$queryRawUnsafe('PRAGMA freelist_count')
const free = Number(freelist_count) / Math.max(1, Number(page_count))
ok(`tamanho: ${kb(Number(page_count) * Number(page_size))}`)
free > 0.25 ? warn(`${Math.round(free * 100)}% de páginas vazias — um VACUUM (com a API parada) recupera espaço`) : ok(`espaço vazio: ${Math.round(free * 100)}%`)
const dbFile = path.join(__dirname, 'prisma', 'dev.db')
if (fs.existsSync(dbFile + '-wal')) {
  const w = fs.statSync(dbFile + '-wal').size
  w > 50 * 1024 * 1024 ? warn(`arquivo -wal com ${kb(w)} (checkpoint não está rodando?)`) : ok(`arquivo -wal: ${kb(w)}`)
}

// ── 2. Migrations ──
console.log('\n2. Migrations')
const applied = await prisma.$queryRawUnsafe('SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations')
const onDisk = fs.readdirSync(path.join(__dirname, 'prisma', 'migrations')).filter(d => /^\d+_/.test(d))
const done = new Set(applied.filter(m => m.finished_at && !m.rolled_back_at).map(m => m.migration_name))
const failed = applied.filter(m => !m.finished_at && !m.rolled_back_at)
const pending = onDisk.filter(m => !done.has(m))
check(failed.length, 'nenhuma migration falhada', 'migrations falhadas (prisma migrate resolve)', bad)
check(pending.length, `todas as ${onDisk.length} migrations aplicadas`, `migrations pendentes (${pending.join(', ')})`, bad)

// ── 3. Volume ──
console.log('\n3. Registros')
const counts = {
  usuários: await prisma.user.count(), assinaturas: await prisma.subscription.count(),
  pagamentos: await prisma.payment.count(), comissões: await prisma.commission.count(),
  saques: await prisma.payout.count(), comentários: await prisma.comment.count(),
  categorias: await prisma.category.count(), conteúdos: await prisma.content.count(),
  tools: await prisma.tool.count(), 'blocos de tool': await prisma.toolBlock.count(),
}
console.log('  ' + Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(' · '))

// ── 4. Assinaturas ──
console.log('\n4. Assinaturas')
const expiredActive = await prisma.subscription.count({ where: { status: 'active', expiresAt: { lt: new Date(now - DAY) } } })
check(expiredActive, 'nenhuma "ativa" vencida há mais de 1 dia', 'assinaturas "active" vencidas há +1 dia (o job de expiração não rodou?)')
const activeCount = await prisma.subscription.count({ where: { status: 'active', expiresAt: { gte: now } } })
ok(`Alphas ativos agora: ${activeCount}`)

// ── 5. Afiliados: comissões e saques ──
console.log('\n5. Afiliados (comissões e saques)')
const neg = await prisma.commission.count({ where: { OR: [{ amountBrl: { lt: 0 } }, { saleAmountBrl: { lt: 0 } }] } })
  + await prisma.payout.count({ where: { amountBrl: { lte: 0 } } })
check(neg, 'nenhum valor negativo/zerado', 'comissões/saques com valor negativo ou zero', bad)
const selfRef = await prisma.commission.count({ where: { affiliateUserId: { equals: prisma.commission.fields.referredUserId } } })
check(selfRef, 'nenhuma comissão de autoindicação', 'comissões onde afiliado = comprador')
const pendingNoPayout = await prisma.commission.count({ where: { status: 'pending', payoutId: null } })
check(pendingNoPayout, 'comissões "pending" todas presas a um saque', 'comissões "pending" sem saque (saldo travado)', bad)
const approvedWithPayout = await prisma.commission.count({ where: { status: 'approved', payoutId: { not: null } } })
check(approvedWithPayout, 'comissões disponíveis sem saque pendurado', 'comissões "approved" ainda ligadas a um saque', bad)
const payouts = await prisma.payout.findMany({ include: { commissions: { select: { amountBrl: true, status: true } } } })
let mismatch = 0, paidButOpen = 0, failedHolding = 0
for (const p of payouts) {
  const sum = p.commissions.reduce((a, c) => a + c.amountBrl, 0)
  if ((p.status === 'processing' || p.status === 'paid' || p.status === 'requested') && p.commissions.length && sum !== p.amountBrl) mismatch++
  if (p.status === 'paid' && p.commissions.some(c => c.status !== 'paid')) paidButOpen++
  if (p.status === 'failed' && p.commissions.length) failedHolding++
}
check(mismatch, 'valor de cada saque = soma das comissões dele', 'saques cujo valor ≠ soma das comissões')
check(paidButOpen, 'saques pagos com todas as comissões pagas', 'saques "paid" com comissão ainda aberta', bad)
check(failedHolding, 'saques falhados devolveram as comissões', 'saques "failed" ainda segurando comissões', bad)
const stuck = payouts.filter(p => p.status === 'processing' && now - p.createdAt > DAY)
check(stuck.length, 'nenhum saque em processamento há +1 dia', `saques em processamento há +1 dia (#${stuck.map(p => p.id).join(', #')}) — o reconciliador roda a cada 10 min`)
const noRef = payouts.filter(p => p.status === 'processing' && !p.externalRef)
check(noRef.length, 'saques em processamento têm id da transferência', 'saques em processamento SEM id da transferência no Asaas')
const avail = await prisma.commission.aggregate({ where: { status: 'approved' }, _sum: { amountBrl: true } })
const paidSum = await prisma.commission.aggregate({ where: { status: 'paid' }, _sum: { amountBrl: true } })
ok(`saldo disponível (todos os afiliados): ${brl(avail._sum.amountBrl || 0)} · já pago: ${brl(paidSum._sum.amountBrl || 0)}`)

// ── 6. Contas ──
console.log('\n6. Contas')
const selfReferred = await prisma.user.count({ where: { referredById: { equals: prisma.user.fields.id } } })
check(selfReferred, 'ninguém indicado por si mesmo', 'usuários com referredById = o próprio id')
const twofaBroken = await prisma.user.count({ where: { twoFactorEnabled: true, twoFactorSecret: null } })
check(twofaBroken, '2FA ligado sempre tem segredo', 'contas com 2FA ligado e sem segredo (não conseguem logar)', bad)
const admins = await prisma.user.count({ where: { role: 'admin' } })
admins === 0 ? bad('nenhum admin') : ok(`admins: ${admins}`)
const legacy = await prisma.user.count({ where: { OR: [{ affiliateId: { not: null } }, { affiliateToken: { not: null } }, { affiliateLink: { not: null } }] } })
legacy ? warn(`${legacy} conta(s) com dados legados do Rewardful (colunas sem uso — dá pra limpar)`) : ok('colunas legadas do Rewardful vazias')

// ── 7. Arquivos referenciados × disco ──
console.log('\n7. Arquivos (banco × disco)')
const dirs = { '/media/': path.join(__dirname, 'media'), '/uploads/': path.join(__dirname, 'uploads') }
const refs = new Set()
const addRef = (u) => { if (typeof u === 'string' && (u.startsWith('/media/') || u.startsWith('/uploads/'))) refs.add(u) }
for (const t of await prisma.tool.findMany({ select: { imageUrl: true } })) addRef(t.imageUrl)
for (const b of await prisma.toolBlock.findMany({ select: { url: true, imageUrl: true, type: true } })) { addRef(b.imageUrl); if (b.type === 'image') addRef(b.url) }
for (const c of await prisma.category.findMany({ select: { imageUrl: true } })) addRef(c.imageUrl)
for (const c of await prisma.content.findMany({ select: { url: true, imageUrl: true } })) { addRef(c.url); addRef(c.imageUrl) }
const missing = [...refs].filter(u => { const [pre, dir] = Object.entries(dirs).find(([p]) => u.startsWith(p)); return !fs.existsSync(path.join(dir, u.slice(pre.length))) })
check(missing.length, `todos os ${refs.size} arquivos referenciados existem`, `arquivos referenciados que sumiram do disco (${missing.slice(0, 5).join(', ')})`, bad)
const toolFileDir = path.join(__dirname, 'tool-files')
const fileBlocks = await prisma.toolBlock.findMany({ where: { type: 'file' }, select: { url: true } })
const missingPriv = fileBlocks.filter(b => b.url && !fs.existsSync(path.join(toolFileDir, path.basename(b.url))))
check(missingPriv.length, `arquivos de download das tools presentes (${fileBlocks.length})`, 'downloads de tool sem o arquivo no disco', bad)
let orphanN = 0, orphanB = 0
const privRefs = new Set(fileBlocks.map(b => path.basename(b.url || '')))
for (const [pre, dir] of [...Object.entries(dirs), ['tool-files:', toolFileDir]]) {
  if (!fs.existsSync(dir)) continue
  for (const f of fs.readdirSync(dir)) {
    const st = fs.statSync(path.join(dir, f)); if (!st.isFile() || f.startsWith('.')) continue
    const used = pre === 'tool-files:' ? privRefs.has(f) : refs.has(pre + f)
    if (!used) { orphanN++; orphanB += st.size }
  }
}
orphanN ? warn(`${orphanN} arquivo(s) no disco sem uso no banco (${kb(orphanB)}) — sobras de uploads trocados/apagados`) : ok('nenhum arquivo órfão no disco')

console.log(`\nResultado: ${errs ? `✗ ${errs} problema(s)` : '✓ sem problemas'}${warns ? ` · ⚠ ${warns} aviso(s)` : ''}\n`)
await prisma.$disconnect()
process.exit(errs ? 1 : 0)
