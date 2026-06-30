// Envio de email via Gmail (Nodemailer).
// Configurar em server/.env:
//   GMAIL_USER=seuemail@gmail.com
//   GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx   (senha de app, não a senha normal!)
//
// Sem configuração, os emails caem no terminal (modo dev).
import nodemailer from 'nodemailer'

const user = process.env.GMAIL_USER
const pass = process.env.GMAIL_APP_PASSWORD

export const mailConfigured = Boolean(user && pass)

const transporter = mailConfigured
  ? nodemailer.createTransport({ service: 'gmail', auth: { user, pass } })
  : null

export async function sendPasswordCode(to, code) {
  if (!mailConfigured) {
    console.log(`📧 [DEV — email não configurado] Código para ${to}: ${code}`)
    return { dev: true }
  }

  await transporter.sendMail({
    from: `"Elixir" <${user}>`,
    to,
    subject: `${code} é o seu código Elixir`,
    text: `Seu código de troca de senha é: ${code}\n\nEle vale por 15 minutos. Se você não pediu essa troca, ignore este email.`,
    html: codeEmailHtml({ title: 'Troca de senha', body: 'Use o código abaixo para confirmar a troca da sua senha.<br/>Ele vale por 15 minutos.', code, footer: 'Se você não pediu essa troca, pode ignorar este email — nada acontece.' }),
  })
  return { dev: false }
}

// Código de recuperação do 2FA por email (fallback de quem perdeu o app autenticador)
export async function sendTwoFactorCode(to, code) {
  if (!mailConfigured) {
    console.log(`📧 [DEV — email não configurado] Código 2FA para ${to}: ${code}`)
    return { dev: true }
  }

  await transporter.sendMail({
    from: `"Elixir" <${user}>`,
    to,
    subject: `${code} é o seu código de acesso Elixir`,
    text: `Seu código de verificação em duas etapas é: ${code}\n\nEle vale por 15 minutos. Se você não tentou entrar, troque sua senha imediatamente.`,
    html: codeEmailHtml({ title: 'Código de acesso', body: 'Use o código abaixo para concluir a verificação em duas etapas.<br/>Ele vale por 15 minutos.', code, footer: 'Se você não tentou entrar, troque sua senha imediatamente.' }),
  })
  return { dev: false }
}

// Template compartilhado dos emails com código de 6 dígitos
function codeEmailHtml({ title, body, code, footer }) {
  return `
    <div style="background:#020617;padding:40px 20px;font-family:Arial,Helvetica,sans-serif">
      <div style="max-width:420px;margin:0 auto;background:linear-gradient(170deg,#060f26,#030714);border:1px solid rgba(122,167,255,0.2);border-radius:16px;padding:36px;text-align:center">
        <p style="color:#7AA7FF;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:bold;margin:0 0 16px">Elixir</p>
        <h1 style="color:#EEF2FF;font-size:20px;margin:0 0 8px">${title}</h1>
        <p style="color:#8FA4C4;font-size:13px;line-height:1.6;margin:0 0 28px">${body}</p>
        <div style="background:rgba(58,123,213,0.12);border:1px solid rgba(122,167,255,0.3);border-radius:12px;padding:18px;margin-bottom:28px">
          <span style="color:#A8C8FF;font-size:32px;font-weight:bold;letter-spacing:10px">${code}</span>
        </div>
        <p style="color:#3a5268;font-size:11px;margin:0">${footer}</p>
      </div>
    </div>
  `
}
