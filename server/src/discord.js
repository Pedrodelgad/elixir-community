// Discord API — OAuth2 + Bot (gerenciamento de cargo Alpha)
const API = 'https://discord.com/api/v10'

const CLIENT_ID     = process.env.DISCORD_CLIENT_ID
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET
const BOT_TOKEN     = process.env.DISCORD_BOT_TOKEN
const GUILD_ID      = process.env.DISCORD_GUILD_ID
const ALPHA_ROLE    = process.env.DISCORD_ALPHA_ROLE_ID
const REDIRECT_URI  = process.env.DISCORD_REDIRECT_URI

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

export async function addAlphaRole(discordUserId) {
  await req('PUT', `/guilds/${GUILD_ID}/members/${discordUserId}/roles/${ALPHA_ROLE}`)
}

export async function removeAlphaRole(discordUserId) {
  await req('DELETE', `/guilds/${GUILD_ID}/members/${discordUserId}/roles/${ALPHA_ROLE}`)
}

export async function sendDM(discordUserId, content) {
  const dm = await req('POST', '/users/@me/channels', { recipient_id: discordUserId })
  await req('POST', `/channels/${dm.id}/messages`, { content })
}
