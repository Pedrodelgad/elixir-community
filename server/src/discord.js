// Discord API — OAuth2 + Bot (gerenciamento dos cargos do Alpha)
const API = 'https://discord.com/api/v10'

const CLIENT_ID     = process.env.DISCORD_CLIENT_ID
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET
const BOT_TOKEN     = process.env.DISCORD_BOT_TOKEN
const GUILD_ID      = process.env.DISCORD_GUILD_ID
const ALPHA_ROLE    = process.env.DISCORD_ALPHA_ROLE_ID
const REDIRECT_URI  = process.env.DISCORD_REDIRECT_URI

// Cargos extras dados JUNTO do Alpha — todo membro Alpha recebe estes também
// (e perde todos juntos na expiração/cancelamento). Sobrescrevível por
// DISCORD_EXTRA_ROLE_IDS (lista separada por vírgula) no .env.
const EXTRA_ROLES = (process.env.DISCORD_EXTRA_ROLE_IDS
  ? process.env.DISCORD_EXTRA_ROLE_IDS.split(',')
  : ['1506476637355642903', '1524076196957130904', '1524080856954703882']
).map(s => s.trim()).filter(Boolean)

// Todos os cargos de um Alpha ativo — aplicados e removidos em conjunto.
// ⚠️ O cargo do BOT precisa estar ACIMA de todos estes na hierarquia (Config. do
// Servidor → Cargos), senão o Discord recusa com "Missing Permissions".
const ALPHA_ROLES = [...new Set([ALPHA_ROLE, ...EXTRA_ROLES].filter(Boolean))]

async function req(method, path, body, userToken) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: userToken ? `Bearer ${userToken}` : `Bot ${BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `Discord ${res.status}`)
  return data
}

export function getOAuthUrl(state = '/') {
  return `https://discord.com/oauth2/authorize?` + new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'identify email guilds.join',
    state,
  })
}

export async function exchangeCode(code) {
  const res = await fetch(`${API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }),
  })
  if (!res.ok) throw new Error('Erro ao trocar código Discord')
  return res.json()
}

export async function getDiscordUser(accessToken) {
  return req('GET', '/users/@me', null, accessToken)
}

export async function addToGuild(discordUserId, accessToken) {
  await req('PUT', `/guilds/${GUILD_ID}/members/${discordUserId}`, { access_token: accessToken })
    .catch(() => {}) // ignora se já está no servidor
}

// Aplica TODOS os cargos do Alpha. Tenta cada um mesmo se outro falhar,
// e só então lança o erro (com detalhe de qual cargo falhou) para o log do caller.
export async function addAlphaRole(discordUserId) {
  const errs = []
  for (const roleId of ALPHA_ROLES) {
    try { await req('PUT', `/guilds/${GUILD_ID}/members/${discordUserId}/roles/${roleId}`) }
    catch (e) { errs.push(`${roleId}: ${e.message}`) }
  }
  if (errs.length) throw new Error(`cargos não aplicados → ${errs.join(' | ')}`)
}

export async function removeAlphaRole(discordUserId) {
  const errs = []
  for (const roleId of ALPHA_ROLES) {
    try { await req('DELETE', `/guilds/${GUILD_ID}/members/${discordUserId}/roles/${roleId}`) }
    catch (e) { errs.push(`${roleId}: ${e.message}`) }
  }
  if (errs.length) throw new Error(`cargos não removidos → ${errs.join(' | ')}`)
}

export async function sendDM(discordUserId, content) {
  const dm = await req('POST', '/users/@me/channels', { recipient_id: discordUserId })
  await req('POST', `/channels/${dm.id}/messages`, { content })
}
