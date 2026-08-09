// Backfill 1x: aplica TODOS os cargos do Alpha (principal + extras) em quem já é
// Alpha ativo e tem Discord vinculado. Idempotente — reaplicar não faz mal.
//
// Rodar na VPS (carrega o .env com o token do bot, guild e cargos):
//   cd /var/www/elixir/server && node --env-file=.env backfill-cargos.mjs
//
// Requisitos: cargo do BOT acima dos cargos na hierarquia (Config. Servidor → Cargos).
import { PrismaClient } from '@prisma/client'
import { addAlphaRole } from './src/discord.js'

const prisma = new PrismaClient()
const now = new Date()

const users = await prisma.user.findMany({
  where: { discordId: { not: null } },
  include: { subscription: true },
})
const active = users.filter(u => u.subscription && new Date(u.subscription.expiresAt) > now)

console.log(`Alphas ativos com Discord vinculado: ${active.length}\n`)

let ok = 0, fail = 0
for (const u of active) {
  const who = u.name ?? u.email ?? u.id
  try {
    await addAlphaRole(u.discordId)
    ok++
    console.log(`✓ ${who} (${u.discordId})`)
  } catch (e) {
    fail++
    console.error(`✗ ${who} (${u.discordId}): ${e.message}`)
  }
  await new Promise(r => setTimeout(r, 700)) // respeita o rate limit do Discord
}

console.log(`\nConcluído: ${ok} ok, ${fail} falha(s).`)
await prisma.$disconnect()
