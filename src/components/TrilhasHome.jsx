import { useState } from 'react'
import './trilhas.css'

// Artes fixas por trilha (mapeadas pela seção de mesmo nome, com normalização).
const ART = {
  bemvindo:  { v: '/imgs/trilhas/bemvindo-v.png',  h: '/imgs/trilhas/bemvindo-h.png',  cat: '#e8c25a' },
  futuros:   { v: '/imgs/trilhas/futuros-v.png',   h: '/imgs/trilhas/futuros-h.png',   cat: '#3ddc84' },
  memecoins: { v: '/imgs/trilhas/memecoins-v.png', h: '/imgs/trilhas/memecoins-h.png', cat: '#5b9bff' },
  bets:      { v: '/imgs/trilhas/bets-v.png',      h: '/imgs/trilhas/bets-h.png',      cat: '#9a7bff' },
}
const DEFAULT_CAT = '#7AA7FF'
const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')
const WELCOME_KEYS = ['bemvindo', 'bemvindos', 'boasvindas', 'boavinda', 'welcome']
const artFor = name => ART[norm(name)] || null

// Tira/tile de uma trilha (accordion no desktop, card no mobile)
function Tile({ section, isOpen, onEnter, onOpen }) {
  const art = artFor(section.name)
  const cat = art?.cat || DEFAULT_CAT
  return (
    <button
      className={'trh-tile' + (isOpen ? ' is-open' : '')}
      style={{ '--cat': cat }}
      onMouseEnter={onEnter}
      onFocus={onEnter}
      onClick={onOpen}
      aria-label={section.name}
    >
      {art ? (
        <>
          <img className="trh-art trh-art-v" src={art.v} alt={section.name} />
          <img className="trh-art trh-art-hbg" src={art.h} alt="" aria-hidden="true" />
          <img className="trh-art trh-art-h" src={art.h} alt="" aria-hidden="true" />
        </>
      ) : (
        <span className="trh-fallback"><span>{section.name}</span></span>
      )}
      <span className="trh-scrim" />
      <span className="trh-cta">Ver conteúdo →</span>
    </button>
  )
}

export default function TrilhasHome({ sections, onOpenSection, user, refresh }) {
  const welcomeSection = sections.find(s => WELCOME_KEYS.includes(norm(s.name)))
  const [entered, setEntered] = useState(false)   // clicou "Entrar" nesta visita
  const [revealed, setRevealed] = useState(false) // clicou no banner (revela o texto)
  const [agree, setAgree] = useState(false)
  const [openId, setOpenId] = useState(null) // nada aberto no repouso; hover abre, sair do mouse fecha

  const showWelcome = welcomeSection && !user?.welcomeSeen && !entered

  const enterSite = () => {
    setEntered(true)
    fetch('/api/student/welcome-seen', { method: 'POST', credentials: 'include' })
      .then(() => refresh && refresh())
      .catch(() => {})
  }

  const clickTile = (section) => {
    const stacked = window.matchMedia('(max-width:720px)').matches
    if (!stacked && openId !== section.id) { setOpenId(section.id); return } // desktop: 1º clique expande
    onOpenSection(section.id)
  }

  // ── Tela de boas-vindas (1ª vez) ──
  if (showWelcome) {
    const wart = artFor(welcomeSection.name)
    return (
      <div className="trh-root">
        <div className={'trh-welcome' + (revealed ? ' is-revealed' : '')}>
          <div className="trh-wwrap">
            <button className="trh-wbanner" onClick={() => setRevealed(true)} aria-label="Começar">
              {wart
                ? <img src={wart.h} alt={welcomeSection.name} />
                : <span className="trh-fallback"><span>{welcomeSection.name}</span></span>}
            </button>
            <span className="trh-whint">clique para começar</span>
            <div className="trh-wcopy">
              <div className="trh-wcopy-in">
                <h2>Bem-vindo à Área do Aluno</h2>
                <p className="trh-lead">Aqui é o seu ponto de partida na Elixir: calls, leituras de mercado e conteúdo exclusivo Alpha, organizados por trilha. Marque abaixo para liberar as trilhas.</p>
                <label className="trh-check">
                  <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} />
                  <span>Li e entendi como funciona a Área do Aluno</span>
                </label>
                <div>
                  <button className="trh-enter" disabled={!agree} onClick={enterSite}>Entrar nas trilhas <span>→</span></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Accordion (desktop) / cards (mobile) ──
  return (
    <div className="trh-root">
      <div className="trh-head">
        <h2>Escolha por onde começar</h2>
        <p>Toque ou passe o mouse para abrir</p>
      </div>
      <div className="trh-accordion" onMouseLeave={() => setOpenId(null)}>
        {sections.map(s => (
          <Tile key={s.id} section={s} isOpen={openId === s.id}
            onEnter={() => setOpenId(s.id)} onOpen={() => clickTile(s)} />
        ))}
      </div>
    </div>
  )
}
