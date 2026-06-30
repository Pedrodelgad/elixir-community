// Discord Gateway — WebSocket para capturar GUILD_MEMBER_ADD e dar cargo Alpha
// IMPORTANTE: Ative "Server Members Intent" no Discord Dev Portal → Bot → Privileged Gateway Intents

const GATEWAY = 'wss://gateway.discord.gg/?v=10&encoding=json'
const GUILD_MEMBERS_INTENT = 1 << 1

export function startGateway(prisma, addAlphaRole, sendDM) {
  let heartbeat = null
  let seq = null

  function connect() {
    const ws = new WebSocket(GATEWAY)

    ws.onopen = () => console.log('[Gateway] Conectado ao Discord')

    ws.onmessage = async ({ data }) => {
      let payload
      try { payload = JSON.parse(data) } catch { return }
      const { op, d, s, t } = payload

      if (s != null) seq = s

      if (op === 10) { // HELLO — inicia heartbeat e identifica o bot
        heartbeat = setInterval(() => {
          if (ws.readyState === 1) ws.send(JSON.stringify({ op: 1, d: seq }))
        }, d.heartbeat_interval)

        ws.send(JSON.stringify({
          op: 2,
          d: {
            token: process.env.DISCORD_BOT_TOKEN,
            intents: GUILD_MEMBERS_INTENT,
            properties: { os: 'linux', browser: 'elixir', device: 'elixir' },
          },
        }))
      }

      if (op === 0 && t === 'READY') {
        console.log(`[Gateway] Bot identificado: ${d.user.username}`)
      }

      if (op === 0 && t === 'GUILD_MEMBER_ADD') {
        if (d.guild_id !== process.env.DISCORD_GUILD_ID) return
        const discordId = d.user?.id
        if (!discordId) return

        try {
          const user = await prisma.user.findUnique({
            where: { discordId },
            include: { subscription: true },
          })
          if (user?.subscription && new Date(user.subscription.expiresAt) > new Date()) {
            await addAlphaRole(discordId)
            console.log(`[Gateway] ✓ Cargo Alpha dado a ${d.user.username ?? discordId}`)
            // DM de boas-vindas — agora o bot pode falar pois o usuário está no servidor
            const INVITE = process.env.DISCORD_INVITE_URL
            await sendDM(discordId,
              `⚡ **Bem-vindo ao Alpha, ${d.user.global_name ?? d.user.username}!**\n\n` +
              `Seu cargo Alpha foi aplicado automaticamente. Explore os canais exclusivos:\n${INVITE}`
            ).catch(() => {})
          }
        } catch (err) {
          console.error(`[Gateway] Erro ao processar entrada de ${discordId}:`, err.message)
        }
      }
    }

    ws.onclose = (e) => {
      clearInterval(heartbeat)
      heartbeat = null
      console.log(`[Gateway] Desconectado (${e.code}), reconectando em 5s...`)
      setTimeout(connect, 5000)
    }

    ws.onerror = (err) => console.error('[Gateway] Erro de conexão:', err.message)
  }

  connect()
}
