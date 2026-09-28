import { useCallback, useEffect, useState } from 'react'
import { fmtSize } from './tools/toolsShared'
import './tools/tools.css'

/* Admin da aba Tools: lista (ordem, publicar, editar, apagar) + formulário da tool + montador de blocos da página */

async function req(path, method = 'GET', body) {
  const r = await fetch(path, {
    method, credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || 'Algo deu errado — tente de novo')
  return j
}
async function upload(endpoint, file) {
  const fd = new FormData()
  fd.append('file', file)
  const r = await fetch(endpoint, { method: 'POST', credentials: 'include', body: fd })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || 'Falha no upload')
  return j
}

// Link enquanto digita: minúsculas, sem acento, só letras/números/hífens (o servidor finaliza)
const typingSlug = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-/, '').slice(0, 60)
const autoSlug = (s) => typingSlug(s).replace(/-$/, '')

const BLOCK_LABEL = { text: 'Texto', video: 'Vídeo', image: 'Imagem', button: 'Botão', file: 'Arquivo' }
const blockSummary = (b) => ({
  text: b.title || (b.body || '').replace(/\s+/g, ' ').slice(0, 100),
  video: b.title || b.url,
  image: b.title || 'Imagem sem legenda',
  button: `${b.title} → ${b.url}`,
  file: b.title ? `${b.title} (${b.fileName})` : b.fileName,
}[b.type] || '')

function Seg({ value, options, onChange, label }) {
  return (
    <div className="tla-seg" role="group" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>{l}</button>
      ))}
    </div>
  )
}

// Área de upload de imagem (mostra a prévia no formato certo)
function ImageDrop({ id, url, busy, shape, hint, onPick }) {
  return (
    <div className={`tla-drop ${shape}`}>
      {url ? <img src={url} alt="" /> : <span>{busy ? 'Enviando…' : hint}</span>}
      <input id={id} type="file" accept="image/png,image/jpeg,image/webp" disabled={busy}
        onChange={e => { onPick(e.target.files?.[0]); e.target.value = '' }} />
    </div>
  )
}

/* ─── Formulário da tool (cria ou edita) ─── */
function ToolForm({ initial, onSaved, onCancel }) {
  const isNew = !initial
  const [f, setF] = useState({
    title: initial?.title || '', slug: initial?.slug || '', tagline: initial?.tagline || '', summary: initial?.summary || '',
    imageUrl: initial?.imageUrl || null, access: initial?.access || 'public', active: initial?.active || false,
  })
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const [busy, setBusy] = useState(false)
  const [imgBusy, setImgBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [warn, setWarn] = useState(null)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const idp = isNew ? 'tn' : `t${initial.id}`

  const onTitle = (v) => setF(p => ({ ...p, title: v, slug: slugTouched ? p.slug : autoSlug(v) }))

  const pickBanner = async (file) => {
    if (!file) return
    setErr(null); setWarn(null)
    if (file.size > 5 * 1024 * 1024) return setErr('Imagem grande demais (máx. 5 MB)')
    setImgBusy(true)
    try {
      const { url } = await upload('/api/admin/media', file)
      set('imageUrl', url)
      const img = new Image()
      img.onload = () => {
        const r = img.naturalWidth / img.naturalHeight
        if (Math.abs(r - 3) > 0.15) setWarn(`Essa imagem é ${r.toFixed(2).replace('.', ',')}:1. O banner é 3:1, então as bordas vão ser cortadas. Ideal: 2100×700.`)
        else if (img.naturalWidth < 1500) setWarn(`Resolução baixa (${img.naturalWidth}×${img.naturalHeight}): pode ficar borrado em telas grandes. Ideal: 2100×700.`)
      }
      img.src = url
    } catch (e) { setErr(e.message) } finally { setImgBusy(false) }
  }

  const save = async () => {
    if (f.active && !f.imageUrl) return setErr('Envie o banner antes de publicar (ou salve como rascunho)')
    setBusy(true); setErr(null)
    try {
      const body = { title: f.title, tagline: f.tagline, summary: f.summary, imageUrl: f.imageUrl, access: f.access, active: f.active }
      if (isNew ? f.slug : f.slug !== initial.slug) body.slug = f.slug
      const { tool } = isNew
        ? await req('/api/admin/tools', 'POST', body)
        : await req(`/api/admin/tools/${initial.id}`, 'PATCH', body)
      onSaved(tool)
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  const canSave = f.title.trim() && f.summary.trim() && !busy && !imgBusy

  return (
    <div className="tla-panel">
      <h3>{isNew ? 'Nova tool' : `Editar “${initial.title}”`}</h3>

      <div className="tla-field">
        <span><label htmlFor={`${idp}-banner`}>Banner (3:1)</label></span>
        <ImageDrop id={`${idp}-banner`} url={f.imageUrl} busy={imgBusy} shape="tla-drop-banner" onPick={pickBanner}
          hint="Clique para enviar · PNG, JPG ou WEBP · ideal 2100×700 · até 5 MB" />
        <small>O nome da tool vai dentro da arte. Deixe o canto superior direito livre: é onde aparece o selo Alpha.</small>
        {warn && <p className="tla-warn">{warn}</p>}
      </div>

      <div className="tla-grid2">
        <label className="tla-field" htmlFor={`${idp}-title`}>
          <span>Nome</span>
          <input id={`${idp}-title`} className="tla-input" maxLength={80} value={f.title} onChange={e => onTitle(e.target.value)} placeholder="Ex.: Calculadora de Risco" />
        </label>
        <label className="tla-field" htmlFor={`${idp}-slug`}>
          <span>Link da página</span>
          <input id={`${idp}-slug`} className="tla-input" maxLength={60} value={f.slug}
            onChange={e => { setSlugTouched(true); set('slug', typingSlug(e.target.value)) }} placeholder="calculadora-de-risco" />
          <small>elixiralpha.com/tools/{f.slug || '…'}</small>
        </label>
      </div>

      <label className="tla-field" htmlFor={`${idp}-tagline`}>
        <span>Linha de apoio (opcional)</span>
        <input id={`${idp}-tagline`} className="tla-input" maxLength={80} value={f.tagline} onChange={e => set('tagline', e.target.value)} placeholder="Ex.: Gestão de banca" />
      </label>

      <label className="tla-field" htmlFor={`${idp}-summary`}>
        <span>Texto da prévia</span>
        <textarea id={`${idp}-summary`} className="tla-textarea" maxLength={600} value={f.summary} onChange={e => set('summary', e.target.value)}
          placeholder="O que a ferramenta faz, em 2 ou 3 frases. Aparece na prévia e no topo da página." />
        <span className="tla-count">{f.summary.length}/600</span>
      </label>

      <div className="tla-grid2">
        <div className="tla-field">
          <span>Acesso</span>
          <Seg label="Acesso" value={f.access} onChange={v => set('access', v)} options={[['public', 'Pública'], ['alpha', 'Exclusiva Alpha']]} />
          <small>{f.access === 'alpha'
            ? 'Todos veem o banner e a prévia; o conteúdo da página só é liberado para Alpha.'
            : 'Qualquer visitante vê a página inteira.'}</small>
        </div>
        <div className="tla-field">
          <span>Status</span>
          <Seg label="Status" value={f.active ? 'on' : 'off'} onChange={v => set('active', v === 'on')} options={[['off', 'Rascunho'], ['on', 'Publicada']]} />
          <small>Rascunho não aparece em /tools. Dá pra montar a página com calma e publicar depois.</small>
        </div>
      </div>

      {err && <p className="tla-err" role="alert">{err}</p>}
      <div className="tla-foot">
        <button type="button" className="tla-btn" onClick={onCancel}>Cancelar</button>
        <button type="button" className="tla-btn tla-btn-primary" disabled={!canSave} onClick={save}>
          {busy ? 'Salvando…' : isNew ? 'Criar tool' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}

/* ─── Formulário de bloco (cria ou edita) ─── */
function BlockForm({ type, initial, toolId, onDone, onCancel }) {
  const [f, setF] = useState({
    title: initial?.title || '', body: initial?.body || '', url: initial?.url || '', imageUrl: initial?.imageUrl || null,
    variant: initial?.variant || 'primary', fileName: initial?.fileName || '', fileSize: initial?.fileSize ?? null,
  })
  const [busy, setBusy] = useState(false)
  const [upBusy, setUpBusy] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const idp = initial ? `b${initial.id}` : `bn-${type}`

  const pickImage = async (file, key) => {
    if (!file) return
    setErr(null)
    if (file.size > 5 * 1024 * 1024) return setErr('Imagem grande demais (máx. 5 MB)')
    setUpBusy(true)
    try { const { url } = await upload('/api/admin/media', file); set(key, url) }
    catch (e) { setErr(e.message) } finally { setUpBusy(false) }
  }
  const pickFile = async (file) => {
    if (!file) return
    setErr(null)
    if (file.size > 50 * 1024 * 1024) return setErr('Arquivo grande demais (máx. 50 MB)')
    setUpBusy(true)
    try { const d = await upload('/api/admin/tool-files', file); setF(p => ({ ...p, url: d.file, fileName: d.fileName, fileSize: d.fileSize })) }
    catch (e) { setErr(e.message) } finally { setUpBusy(false) }
  }

  const fields = {
    text: () => ({ title: f.title, body: f.body }),
    video: () => ({ title: f.title, url: f.url, imageUrl: f.imageUrl }),
    image: () => ({ title: f.title, url: f.url }),
    button: () => ({ title: f.title, url: f.url, variant: f.variant }),
    file: () => ({ title: f.title, url: f.url, fileName: f.fileName, fileSize: f.fileSize }),
  }[type]
  const ready = {
    text: f.body.trim(), video: f.url.trim(), image: f.url, button: f.title.trim() && f.url.trim(), file: f.url,
  }[type]

  const save = async () => {
    setBusy(true); setErr(null)
    try {
      if (initial) await req(`/api/admin/tool-blocks/${initial.id}`, 'PATCH', fields())
      else await req(`/api/admin/tools/${toolId}/blocks`, 'POST', { type, ...fields() })
      onDone()
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="tla-panel" style={{ borderStyle: 'dashed' }}>
      <h3>{initial ? 'Editar' : 'Novo'} bloco · {BLOCK_LABEL[type]}</h3>

      {type === 'text' && (<>
        <label className="tla-field" htmlFor={`${idp}-t`}>
          <span>Título (opcional)</span>
          <input id={`${idp}-t`} className="tla-input" maxLength={120} value={f.title} onChange={e => set('title', e.target.value)} placeholder="Ex.: Como funciona" />
        </label>
        <label className="tla-field" htmlFor={`${idp}-b`}>
          <span>Texto</span>
          <textarea id={`${idp}-b`} className="tla-textarea" style={{ minHeight: 150 }} maxLength={8000} value={f.body} onChange={e => set('body', e.target.value)} />
          <small>**negrito** · deixe uma linha em branco pra começar outro parágrafo · links https:// ficam clicáveis</small>
          <span className="tla-count">{f.body.length}/8000</span>
        </label>
      </>)}

      {type === 'video' && (<>
        <div className="tla-grid2">
          <label className="tla-field" htmlFor={`${idp}-t`}>
            <span>Título do vídeo</span>
            <input id={`${idp}-t`} className="tla-input" maxLength={120} value={f.title} onChange={e => set('title', e.target.value)} placeholder="Ex.: Configurando do zero" />
          </label>
          <label className="tla-field" htmlFor={`${idp}-u`}>
            <span>Link do YouTube</span>
            <input id={`${idp}-u`} className="tla-input" value={f.url} onChange={e => set('url', e.target.value)} placeholder="https://youtu.be/…" />
            <small>Pode ser vídeo não listado. O link nunca aparece pro aluno.</small>
          </label>
        </div>
        <div className="tla-field">
          <span><label htmlFor={`${idp}-c`}>Capa (opcional)</label></span>
          <ImageDrop id={`${idp}-c`} url={f.imageUrl} busy={upBusy} shape="tla-drop-img" onPick={file => pickImage(file, 'imageUrl')} hint="Clique para enviar a capa (16:9)" />
          {f.imageUrl && <button type="button" className="tla-btn" style={{ alignSelf: 'flex-start' }} onClick={() => set('imageUrl', null)}>Remover capa</button>}
        </div>
      </>)}

      {type === 'image' && (<>
        <div className="tla-field">
          <span><label htmlFor={`${idp}-i`}>Imagem</label></span>
          <ImageDrop id={`${idp}-i`} url={f.url} busy={upBusy} shape="tla-drop-img" onPick={file => pickImage(file, 'url')} hint="Clique para enviar · PNG, JPG ou WEBP · até 5 MB" />
          <small>Aparece no formato original, sem corte.</small>
        </div>
        <label className="tla-field" htmlFor={`${idp}-t`}>
          <span>Legenda (opcional)</span>
          <input id={`${idp}-t`} className="tla-input" maxLength={200} value={f.title} onChange={e => set('title', e.target.value)} />
        </label>
      </>)}

      {type === 'button' && (<>
        <div className="tla-grid2">
          <label className="tla-field" htmlFor={`${idp}-t`}>
            <span>Texto do botão</span>
            <input id={`${idp}-t`} className="tla-input" maxLength={60} value={f.title} onChange={e => set('title', e.target.value)} placeholder="Ex.: Abrir no Telegram" />
          </label>
          <label className="tla-field" htmlFor={`${idp}-u`}>
            <span>Link</span>
            <input id={`${idp}-u`} className="tla-input" value={f.url} onChange={e => set('url', e.target.value)} placeholder="https://… ou /planos" />
            <small>Link externo abre em nova aba. Começando com / abre uma página do site.</small>
          </label>
        </div>
        <div className="tla-field">
          <span>Estilo</span>
          <Seg label="Estilo do botão" value={f.variant} onChange={v => set('variant', v)} options={[['primary', 'Principal (azul)'], ['secondary', 'Secundário']]} />
        </div>
      </>)}

      {type === 'file' && (<>
        <div className="tla-field">
          <span><label htmlFor={`${idp}-f`}>Arquivo</label></span>
          <div className="tla-drop" style={{ minHeight: 64 }}>
            <span>{upBusy ? 'Enviando…' : f.url ? `${f.fileName} · ${fmtSize(f.fileSize)} — clique para trocar` : 'Clique para enviar o arquivo · até 50 MB'}</span>
            <input id={`${idp}-f`} type="file" disabled={upBusy} onChange={e => { pickFile(e.target.files?.[0]); e.target.value = '' }} />
          </div>
          <small>O download é protegido: numa tool Alpha, só quem é Alpha consegue baixar.</small>
        </div>
        <label className="tla-field" htmlFor={`${idp}-t`}>
          <span>Nome exibido (opcional)</span>
          <input id={`${idp}-t`} className="tla-input" maxLength={120} value={f.title} onChange={e => set('title', e.target.value)} placeholder="Se vazio, mostra o nome do arquivo" />
        </label>
      </>)}

      {err && <p className="tla-err" role="alert">{err}</p>}
      <div className="tla-foot">
        <button type="button" className="tla-btn" onClick={onCancel}>Cancelar</button>
        <button type="button" className="tla-btn tla-btn-primary" disabled={!ready || busy || upBusy} onClick={save}>
          {busy ? 'Salvando…' : initial ? 'Salvar bloco' : 'Adicionar bloco'}
        </button>
      </div>
    </div>
  )
}

/* ─── Montador da página (blocos) ─── */
function PageBuilder({ tool, onChange }) {
  const [adding, setAdding] = useState(null)   // tipo do bloco sendo criado
  const [editingId, setEditingId] = useState(null)
  const [err, setErr] = useState(null)
  const blocks = tool.blocks

  const act = async (fn) => { setErr(null); try { await fn(); onChange() } catch (e) { setErr(e.message) } }
  const move = (b, dir) => act(() => req(`/api/admin/tool-blocks/${b.id}/move`, 'POST', { dir }))
  const remove = (b) => { if (confirm(`Apagar o bloco "${BLOCK_LABEL[b.type]}"?`)) act(() => req(`/api/admin/tool-blocks/${b.id}`, 'DELETE')) }

  return (
    <div className="tla-panel">
      <h3>Página de “{tool.title}”</h3>
      <p className="tla-hint">Os blocos aparecem na página nesta ordem. Botões seguidos ficam lado a lado.</p>
      {err && <p className="tla-err" role="alert">{err}</p>}

      <div className="tla-blocks">
        {blocks.length === 0 && !adding && <div className="tla-empty">Página vazia. Adicione o primeiro bloco abaixo.</div>}
        {blocks.map((b, i) => editingId === b.id ? (
          <BlockForm key={b.id} type={b.type} initial={b} onDone={() => { setEditingId(null); onChange() }} onCancel={() => setEditingId(null)} />
        ) : (
          <div key={b.id} className="tla-block">
            <span className="tla-btype">{BLOCK_LABEL[b.type]}</span>
            <span className="tla-bsum" title={blockSummary(b)}>{blockSummary(b)}</span>
            <div className="tla-actions">
              <button type="button" className="tla-btn tla-mv" disabled={i === 0} onClick={() => move(b, 'up')} aria-label="Mover bloco para cima">↑</button>
              <button type="button" className="tla-btn tla-mv" disabled={i === blocks.length - 1} onClick={() => move(b, 'down')} aria-label="Mover bloco para baixo">↓</button>
              <button type="button" className="tla-btn" onClick={() => { setEditingId(b.id); setAdding(null) }}>Editar</button>
              <button type="button" className="tla-btn tla-btn-danger" onClick={() => remove(b)}>Apagar</button>
            </div>
          </div>
        ))}
        {adding && <BlockForm type={adding} toolId={tool.id} onDone={() => { setAdding(null); onChange() }} onCancel={() => setAdding(null)} />}
      </div>

      {!adding && (
        <div className="tla-add">
          <span>Adicionar bloco:</span>
          {Object.keys(BLOCK_LABEL).map(t => (
            <button key={t} type="button" className="tla-btn" onClick={() => { setAdding(t); setEditingId(null) }}>+ {BLOCK_LABEL[t]}</button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Lista das tools ─── */
export default function AdminTools() {
  const [tools, setTools] = useState(null)
  const [err, setErr] = useState(null)
  const [editing, setEditing] = useState(null) // 'new' | id da tool em edição
  const [pageOf, setPageOf] = useState(null)   // id da tool com o montador de página aberto

  const load = useCallback(() => req('/api/admin/tools').then(d => setTools(d.tools)).catch(e => setErr(e.message)), [])
  useEffect(() => { load() }, [load])

  const act = async (fn) => { setErr(null); try { await fn(); await load() } catch (e) { setErr(e.message) } }
  const move = (t, dir) => act(() => req(`/api/admin/tools/${t.id}/move`, 'POST', { dir }))
  const togglePublish = (t) => act(() => req(`/api/admin/tools/${t.id}`, 'PATCH', { active: !t.active }))
  const remove = (t) => {
    if (!confirm(`Apagar a tool "${t.title}" e toda a página dela? Isso não pode ser desfeito.`)) return
    if (pageOf === t.id) setPageOf(null)
    act(() => req(`/api/admin/tools/${t.id}`, 'DELETE'))
  }

  return (
    <div className="tla">
      <div className="tla-bar">
        <p className="tla-hint">Cada tool vira um banner em <a href="/tools" target="_blank" rel="noopener noreferrer" style={{ color: '#9cc0ff' }}>/tools</a> e ganha uma página própria. Rascunhos não aparecem pro público.</p>
        {editing !== 'new' && (
          <button type="button" className="tla-btn tla-btn-primary" onClick={() => { setEditing('new'); setPageOf(null) }}>+ Nova tool</button>
        )}
      </div>
      {err && <p className="tla-err" role="alert">{err}</p>}

      {editing === 'new' && (
        <ToolForm onCancel={() => setEditing(null)} onSaved={t => { setEditing(null); load(); setPageOf(t.id) }} />
      )}

      {!tools ? (
        <p className="tla-hint">Carregando…</p>
      ) : tools.length === 0 ? (
        editing !== 'new' && <div className="tla-empty">Nenhuma tool ainda. Clique em “+ Nova tool” pra criar a primeira.</div>
      ) : (
        <div className="tla-list">
          {tools.map((t, i) => (
            <div key={t.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {editing === t.id ? (
                <ToolForm initial={t} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />
              ) : (
                <div className="tla-row">
                  <div className="tla-thumb">{t.imageUrl ? <img src={t.imageUrl} alt="" /> : <span>sem banner</span>}</div>
                  <div className="tla-info">
                    <strong>{t.title}</strong>
                    <span className="tla-slug">/tools/{t.slug}</span>
                    <div className="tla-chips">
                      <span className={`tla-chip ${t.access === 'alpha' ? 'tla-chip-alpha' : 'tla-chip-pub'}`}>{t.access === 'alpha' ? 'Alpha' : 'Pública'}</span>
                      <span className={`tla-chip ${t.active ? 'tla-chip-live' : 'tla-chip-draft'}`}>{t.active ? 'Publicada' : 'Rascunho'}</span>
                      <span className="tla-chip">{t.blocks.length} {t.blocks.length === 1 ? 'bloco' : 'blocos'}</span>
                    </div>
                  </div>
                  <div className="tla-actions">
                    <button type="button" className="tla-btn tla-mv" disabled={i === 0} onClick={() => move(t, 'up')} aria-label="Mover tool para cima">↑</button>
                    <button type="button" className="tla-btn tla-mv" disabled={i === tools.length - 1} onClick={() => move(t, 'down')} aria-label="Mover tool para baixo">↓</button>
                    <button type="button" className="tla-btn" onClick={() => togglePublish(t)}>{t.active ? 'Despublicar' : 'Publicar'}</button>
                    <button type="button" className="tla-btn" onClick={() => { setEditing(t.id) }}>Editar</button>
                    <button type="button" className={`tla-btn ${pageOf === t.id ? 'tla-btn-primary' : ''}`} onClick={() => setPageOf(pageOf === t.id ? null : t.id)}>
                      Página ({t.blocks.length})
                    </button>
                    <a className="tla-btn" href={`/tools/${t.slug}`} target="_blank" rel="noopener noreferrer">Ver ↗</a>
                    <button type="button" className="tla-btn tla-btn-danger" onClick={() => remove(t)}>Apagar</button>
                  </div>
                </div>
              )}
              {pageOf === t.id && <PageBuilder tool={t} onChange={load} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
