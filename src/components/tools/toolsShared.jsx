import { Fragment, useState } from 'react'

/* Peças compartilhadas da aba Tools (vitrine, prévia e página da ferramenta) */

// Fundo das páginas (mesmo da Área do Aluno) + feixe de luz diagonal
export const pageBg = { minHeight: '100vh', background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(30,30,80,0.5) 0%, #020617 60%)' }
export const Beam = () => (
  <div aria-hidden="true" style={{ position: 'absolute', top: '-20%', left: '50%', width: '80px', height: '160%', background: 'linear-gradient(180deg, rgba(70,130,240,0.20) 0%, rgba(40,95,190,0.08) 60%, transparent 100%)', transform: 'rotate(-28deg)', transformOrigin: 'top center', filter: 'blur(16px)', pointerEvents: 'none' }} />
)

export async function getJSON(url) {
  const r = await fetch(url, { credentials: 'include' })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) {
    const e = new Error(j.error || 'Não foi possível carregar')
    e.status = r.status
    throw e
  }
  return j
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

// "1 vídeo · 1 arquivo · 2 links"
export function countsList(c = {}) {
  return [
    c.video && plural(c.video, 'vídeo', 'vídeos'),
    c.file && plural(c.file, 'arquivo', 'arquivos'),
    c.link && plural(c.link, 'link', 'links'),
  ].filter(Boolean)
}

// Frase do cartão "Conteúdo exclusivo Alpha", montada com o que a tool tem dentro
export function lockedLine(title, c = {}) {
  const parts = [
    c.video && (c.video === 1 ? 'o vídeo' : `os ${c.video} vídeos`),
    c.file && (c.file === 1 ? 'o arquivo' : `os ${c.file} arquivos`),
    c.link && (c.link === 1 ? 'o link de acesso' : `os ${c.link} links de acesso`),
  ].filter(Boolean)
  if (!parts.length) return `O conteúdo de ${title} é liberado para membros Alpha.`
  const joined = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}` : parts[0]
  return `${joined.charAt(0).toUpperCase()}${joined.slice(1)} de ${title} ${parts.length > 1 || /^os /.test(joined) ? 'ficam liberados' : 'fica liberado'} para membros Alpha.`
}

export const fmtDate = (d) =>
  new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/\./g, '')

export const fmtSize = (b) => {
  if (b == null) return ''
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`
  return `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

// Texto seguro (sem HTML): parágrafo a cada linha em branco, quebra de linha simples,
// **negrito** e links http(s) clicáveis. Tudo vira elemento React — nada é injetado como HTML.
const TOKEN = /(\*\*[^*\n]+\*\*|https?:\/\/[^\s<]*[^\s<.,;:!?)\]])/g
function inline(line, prefix) {
  return line.split(TOKEN).filter(Boolean).map((part, i) => {
    const key = `${prefix}-${i}`
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={key}>{part.slice(2, -2)}</strong>
    if (/^https?:\/\//.test(part)) return <a key={key} href={part} target="_blank" rel="noopener noreferrer">{part}</a>
    return <Fragment key={key}>{part}</Fragment>
  })
}
export function RichText({ text }) {
  return String(text || '').split(/\n\s*\n/).map((para, pi) => (
    <p key={pi}>
      {para.split('\n').map((line, li) => (
        <Fragment key={li}>{li > 0 && <br />}{inline(line, `${pi}-${li}`)}</Fragment>
      ))}
    </p>
  ))
}

/* ── ícones ── */
const sv = { viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true }
export const IconTools = () => <svg {...sv} width="13" height="13"><path d="M14.7 6.3a4 4 0 0 0-5 5l-6 6a1.5 1.5 0 0 0 2 2l6-6a4 4 0 0 0 5-5l-2.5 2.5L11 12l-1.8-1.8L11.7 8z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>
export const IconLock = () => <svg {...sv}><rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" /></svg>
export const IconBolt = () => <svg {...sv}><path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="currentColor" /></svg>
export const IconArrow = () => <svg {...sv}><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
export const IconLeft = () => <svg {...sv}><path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
export const IconX = () => <svg {...sv}><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
export const IconExt = () => <svg {...sv}><path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
export const IconFile = () => <svg {...sv}><path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" stroke="#d8ccff" strokeWidth="1.7" /><path d="M14 3v5h5M12 11v6m0 0-2.5-2.5M12 17l2.5-2.5" stroke="#d8ccff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
export const IconPlay = () => <svg {...sv}><path d="M8 5v14l11-7z" fill="#fff" /></svg>
export const IconLink = () => <svg {...sv}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
export const IconLockBig = () => <svg {...sv}><rect x="5" y="11" width="14" height="10" rx="2" stroke="#e8c25a" strokeWidth="1.8" /><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="#e8c25a" strokeWidth="1.8" /><circle cx="12" cy="16" r="1.4" fill="#e8c25a" /></svg>

// Selo "Alpha" (cadeado pra quem não tem acesso, raio pra quem tem)
export function AlphaBadge({ locked }) {
  return <span className="tl-badge">{locked ? <IconLock /> : <IconBolt />}Alpha</span>
}

// Arte do banner (3:1). Sem imagem ou se falhar → degradê com o nome da tool.
export function BannerArt({ tool }) {
  const [broken, setBroken] = useState(false)
  if (tool.imageUrl && !broken) {
    return <img className="tl-art" src={tool.imageUrl} alt="" decoding="async" onError={() => setBroken(true)} />
  }
  return <div className="tl-art tl-art-fallback"><span>{tool.title}</span></div>
}
