// Popula o banco: catálogo de planos + conta admin.
// Rodar com: npm run db:seed (seguro rodar várias vezes — não duplica nada)
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const ADMIN_EMAIL = 'admin@elixir.com'
const ADMIN_PASSWORD = 'admin123' // trocar em produção!

// priceBrl em CENTAVOS (Stripe cartão/PIX). 18990 = R$ 189,90. Valores FIXOS.
const PLANS = [
  { id: 'free',     name: 'Gratuito', badge: null,      priceSol: 0,   priceBrl: null,  durationDays: null },
  { id: 'alpha-1m', name: 'Alpha',    badge: '1 mês',   priceSol: 0.5, priceBrl: 18990, durationDays: 30 },
  { id: 'alpha-3m', name: 'Alpha',    badge: '3 meses', priceSol: 0.8, priceBrl: 39790, durationDays: 90 },
  { id: 'alpha-1y', name: 'Alpha',    badge: '1 ano',   priceSol: 1.2, priceBrl: 59790, durationDays: 365 },
]

async function main() {
  // Catálogo de planos (upsert: cria se não existe, atualiza se mudou)
  for (const p of PLANS) {
    await prisma.plan.upsert({ where: { id: p.id }, create: p, update: p })
  }
  console.log(`✓ ${PLANS.length} planos no catálogo`)

  // Conta admin
  const exists = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } })
  if (exists) {
    console.log('✓ Admin já existe:', ADMIN_EMAIL)
  } else {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10)
    await prisma.user.create({
      data: { name: 'Admin', handle: 'admin', email: ADMIN_EMAIL, password: hash, role: 'admin' },
    })
    console.log('✓ Admin criado:', ADMIN_EMAIL, '/ senha:', ADMIN_PASSWORD)
  }

  // Área do Aluno — estrutura inicial (só cria se ainda não houver categorias)
  const catCount = await prisma.category.count()
  if (catCount === 0) {
    const memecoins = await prisma.category.create({ data: { name: 'Memecoins', position: 0 } })
    const chains = ['Solana', 'Base', 'BSC', 'Ethereum']
    for (let i = 0; i < chains.length; i++) {
      await prisma.category.create({ data: { name: chains[i], parentId: memecoins.id, position: i } })
    }
    await prisma.category.create({ data: { name: 'Futuros', position: 1 } })
    console.log('✓ Área do Aluno: Memecoins (Solana/Base/BSC/Ethereum) + Futuros')
  } else {
    console.log(`✓ Área do Aluno já tem ${catCount} categorias`)
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
