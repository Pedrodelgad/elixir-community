// Pagamento em SOL e split — monta a transação e verifica on-chain.
// SEM private key: o usuário assina na Phantom; o backend só monta e confere.
import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'

const RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
const RECEIVE = process.env.SOLANA_RECEIVE_WALLET
const FEE = process.env.SOLANA_FEE_WALLET
const FEE_BPS = 0 // sem taxa — 100% do pagamento vai para a carteira principal
const MEMO_PROGRAM = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')

let receivePk = null, feePk = null
try { if (RECEIVE) receivePk = new PublicKey(RECEIVE) } catch { console.error('⚠ SOLANA_RECEIVE_WALLET inválida') }
try { if (FEE) feePk = new PublicKey(FEE) } catch { console.error('⚠ SOLANA_FEE_WALLET inválida') }

// Só a carteira principal é obrigatória (a de taxa virou opcional — sem split).
export const solanaConfigured = !!receivePk
if (!solanaConfigured) console.warn('⚠ Carteira Solana não configurada — pagamento em SOL desativado')

export const connection = new Connection(RPC, 'confirmed')

// total em lamports, taxa e o principal (resto). main+fee = total exato.
// FEE_BPS=0 → fee=0 e main=total (100% para a carteira principal).
export function splitLamports(priceSol) {
  const total = Math.round(priceSol * LAMPORTS_PER_SOL)
  const fee = Math.round((total * FEE_BPS) / 10000)
  return { total, fee, main: total - fee }
}

// Monta a transação não-assinada (transfer principal + memo; transfer de taxa só
// se houver taxa configurada). feePayer = quem paga.
export async function buildPaymentTx(payerStr, priceSol, reference) {
  const payer = new PublicKey(payerStr)
  const { main, fee } = splitLamports(priceSol)

  const tx = new Transaction()
  tx.add(SystemProgram.transfer({ fromPubkey: payer, toPubkey: receivePk, lamports: main }))
  if (fee > 0 && feePk) tx.add(SystemProgram.transfer({ fromPubkey: payer, toPubkey: feePk, lamports: fee }))
  tx.add(new TransactionInstruction({ keys: [], programId: MEMO_PROGRAM, data: Buffer.from(reference, 'utf8') }))

  const { blockhash } = await connection.getLatestBlockhash()
  tx.recentBlockhash = blockhash
  tx.feePayer = payer

  return { transaction: tx.serialize({ requireAllSignatures: false }).toString('base64'), main, fee }
}

// Verifica a transação confirmada: valores certos pras carteiras + memo == referência.
// Faz algumas tentativas porque a confirmação pode demorar alguns segundos.
export async function verifyPayment(signature, { main, fee, reference }) {
  let tx = null
  for (let i = 0; i < 6 && !tx; i++) {
    tx = await connection.getParsedTransaction(signature, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 }).catch(() => null)
    if (!tx) await new Promise(r => setTimeout(r, 2500))
  }
  if (!tx) return { ok: false, reason: 'Transação não encontrada (ainda não confirmou?)' }
  if (tx.meta?.err) return { ok: false, reason: 'Transação falhou na rede' }

  const instrs = tx.transaction.message.instructions || []
  let paidMain = 0, paidFee = 0, memoOk = false
  for (const ix of instrs) {
    if (ix.program === 'system' && ix.parsed?.type === 'transfer') {
      const { destination, lamports } = ix.parsed.info
      if (destination === RECEIVE) paidMain += lamports
      if (destination === FEE) paidFee += lamports
    }
    if ((ix.program === 'spl-memo' || ix.programId?.toString?.() === MEMO_PROGRAM.toString()) && ix.parsed === reference) {
      memoOk = true
    }
  }
  if (!memoOk) return { ok: false, reason: 'Referência (memo) não confere' }
  if (paidMain < main || paidFee < fee) return { ok: false, reason: 'Valor pago incorreto' }
  return { ok: true }
}
