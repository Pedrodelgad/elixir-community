import { useState, useEffect } from 'react'

const api = (path, method = 'GET', body) =>
  fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.json())

const btn = (bg, border, color) => ({
  background: bg, border: `1px solid ${border}`, color,
  fontFamily: "'Inter', sans-serif", cursor: 'pointer', borderRadius: 8,
})
const inputStyle = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(220,225,235,0.12)',
  color: '#e6e9f0', borderRadius: 8, padding: '7px 11px', fontSize: 13, fontFamily: "'Inter', sans-serif", outline: 'none',
}

/* ─── Setas de reordenar (↑↓) ─── */
function MoveBtns({ canUp, canDown, onMove }) {
  const s = (on) => ({ ...btn(on ? 'rgba(255,255,255,0.05)' : 'transparent', 'rgba(255,255,255,0.08)', on ? 'rgba(200,206,218,0.75)' : 'rgba(200,206,218,0.2)'), padding: '0 6px', lineHeight: '18px', cursor: on ? 'pointer' : 'default' })
  return (
    <span className="flex items-center gap-0.5">
      <button disabled={!canUp} onClick={() => canUp && onMove('up')} title="Mover para cima" className="text-[11px]" style={s(canUp)}>↑</button>
      <button disabled={!canDown} onClick={() => canDown && onMove('down')} title="Mover para baixo" className="text-[11px]" style={s(canDown)}>↓</button>
    </span>
  )
}

/* ─── Formulário de conteúdo — cria ou edita ─── */
/* Vídeo = link externo · Ferramenta = upload de arquivo (faz o upload e só então salva). */
function ContentForm({ onSubmit, onCancel, initial, submitLabel = 'Adicionar' }) {
  const [type, setType] = useState(initial?.type || 'video')
  const [title, setTitle] = useState(initial?.title || '')
  const [url, setUrl] = useState(initial?.url || '')
  const [desc, setDesc] = useState(initial?.description || '')
  const [file, setFile] = useState(null)
  const existingFile = initial?.type === 'tool' ? initial?.fileName : null
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl || null)
  const [imgBusy, setImgBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const isTool = type === 'tool'
  const canSubmit = title.trim() && (isTool ? (file || existingFile) : true) && !busy && !imgBusy

  // Sobe a capa assim que escolhe o arquivo (mostra o preview antes de salvar)
  const pickImage = async (f) => {
    if (!f) return
    setImgBusy(true); setErr(null)
    try {
      const fd = new FormData(); fd.append('file', f)
      const r = await fetch('/api/admin/upload', { method: 'POST', credentials: 'include', body: fd })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Falha ao enviar a imagem')
      setImageUrl(j.url)
    } catch (e) { setErr(e.message) } finally { setImgBusy(false) }
  }

  const submit = async () => {
    if (!canSubmit) return
    setBusy(true); setErr(null)
    try {
      if (isTool) {
        let toolUrl = initial?.url || null, toolName = existingFile || null
        if (file) {
          const fd = new FormData(); fd.append('file', file)
          const r = await fetch('/api/admin/upload', { method: 'POST', credentials: 'include', body: fd })
          const j = await r.json()
          if (!r.ok) throw new Error(j.error || 'Falha no upload')
          toolUrl = j.url; toolName = j.fileName
        }
        await onSubmit({ type, title, url: toolUrl, fileName: toolName, description: desc })
      } else {
        await onSubmit({ type, title, url, fileName: null, description: desc, imageUrl: imageUrl || '' })
      }
    } catch (e) { setErr(e.message); setBusy(false) }
  }

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl mt-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(220,225,235,0.08)' }}>
      <div className="flex gap-1.5">
        {['video', 'tool'].map(t => (
          <button key={t} onClick={() => setType(t)} className="px-3 py-1 text-[12px] font-semibold"
            style={btn(type === t ? 'rgba(58,123,213,0.25)' : 'transparent', type === t ? 'rgba(122,167,255,0.4)' : 'rgba(255,255,255,0.08)', type === t ? '#A8C8FF' : 'rgba(200,206,218,0.5)')}>
            {t === 'video' ? '🎬 Vídeo' : '🔧 Ferramenta'}
          </button>
        ))}
      </div>

      {/* 1) Título · 2) Descrição · 3) só então o vídeo/arquivo (mais fácil de organizar) */}
      <input placeholder="Título" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
      <textarea placeholder="Descrição (opcional) — pode usar várias linhas, espaçamento e colar links (viram clicáveis)"
        value={desc} onChange={e => setDesc(e.target.value)} rows={3}
        style={{ ...inputStyle, resize: 'vertical', minHeight: 64, lineHeight: 1.5 }} />

      {isTool ? (
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors"
            style={{ background: 'rgba(58,100,220,0.1)', border: '1px dashed rgba(122,167,255,0.35)' }}>
            <input type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
            <span className="text-[12px] font-semibold" style={{ color: 'rgba(160,195,255,0.9)' }}>📎 {file ? 'Trocar arquivo' : (existingFile ? 'Substituir arquivo' : 'Escolher arquivo')}</span>
            <span className="text-[11px] truncate flex-1" style={{ color: 'rgba(200,206,218,0.55)' }}>
              {file ? file.name : (existingFile ? `atual: ${existingFile}` : 'nenhum arquivo (máx. 50 MB)')}
            </span>
          </label>
        </div>
      ) : (
        <>
          <input placeholder="URL do vídeo (YouTube, etc)" value={url} onChange={e => setUrl(e.target.value)} style={inputStyle} />

          {/* Capa 16:9 (opcional) — aparece no card da aula */}
          <label className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors"
            style={{ background: 'rgba(58,100,220,0.1)', border: '1px dashed rgba(122,167,255,0.35)' }}>
            <input type="file" accept="image/*" className="hidden" onChange={e => pickImage(e.target.files?.[0] || null)} />
            <span className="text-[12px] font-semibold" style={{ color: 'rgba(160,195,255,0.9)' }}>🖼️ {imageUrl ? 'Trocar capa' : 'Imagem de capa (16:9, opcional)'}</span>
            <span className="text-[11px] truncate flex-1" style={{ color: 'rgba(200,206,218,0.55)' }}>
              {imgBusy ? 'enviando…' : (imageUrl ? 'capa definida' : 'nenhuma')}
            </span>
          </label>
          {imageUrl && (
            <div className="relative rounded-lg overflow-hidden" style={{ aspectRatio: '16/9', maxWidth: 240, border: '1px solid rgba(122,167,255,0.25)' }}>
              <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button onClick={() => setImageUrl(null)} title="Remover capa"
                className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center text-[12px] rounded-md"
                style={{ background: 'rgba(10,12,20,0.75)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,180,180,0.9)', cursor: 'pointer' }}>✕</button>
            </div>
          )}
        </>
      )}

      {err && <p className="text-[11px]" style={{ color: 'rgba(255,140,140,0.85)' }}>{err}</p>}
      <div className="flex gap-2">
        <button disabled={!canSubmit} onClick={submit}
          className="px-4 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40"
          style={btn('linear-gradient(135deg,#2a5fc7,#5a98f0)', 'transparent', '#fff')}>{busy ? 'Enviando…' : submitLabel}</button>
        <button onClick={onCancel} className="px-3 py-1.5 text-[12px]" style={btn('rgba(255,255,255,0.04)', 'rgba(255,255,255,0.08)', 'rgba(200,206,218,0.6)')}>Cancelar</button>
      </div>
    </div>
  )
}

/* ─── Linha de conteúdo (com edição inline + reordenar) ─── */
function ContentRow({ content, onEdit, onDelete, onMove, canUp, canDown }) {
  const [editing, setEditing] = useState(false)
  if (editing) {
    return (
      <ContentForm initial={content} submitLabel="Salvar"
        onSubmit={async (data) => { await onEdit(content.id, data); setEditing(false) }}
        onCancel={() => setEditing(false)} />
    )
  }
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(220,225,235,0.06)' }}>
      {(canUp || canDown) && <MoveBtns canUp={canUp} canDown={canDown} onMove={dir => onMove(content.id, dir)} />}
      <span>{content.type === 'video' ? '🎬' : '🔧'}</span>
      <span className="text-[12.5px] flex-1 truncate" style={{ color: 'rgba(220,225,235,0.8)', fontFamily: "'Inter', sans-serif" }}>{content.title}</span>
      {(() => { const sub = content.type === 'tool' ? content.fileName : content.url; return sub && <span className="text-[10px] truncate max-w-[160px]" style={{ color: 'rgba(160,180,210,0.4)' }}>{sub}</span> })()}
      <button onClick={() => setEditing(true)} className="px-2 py-0.5 text-[10px]" style={btn('rgba(255,255,255,0.04)', 'rgba(255,255,255,0.08)', 'rgba(200,206,218,0.55)')}>editar</button>
      <button onClick={() => onDelete(content.id)} className="px-2 py-0.5 text-[10px]" style={btn('rgba(220,60,60,0.06)', 'rgba(220,80,80,0.15)', 'rgba(255,140,140,0.6)')}>✕</button>
    </div>
  )
}

/* ─── Nó da árvore (categoria) ─── */
function Node({ node, depth, onChange, index = 0, count = 1, onMoveSelf }) {
  const [addingCat, setAddingCat] = useState(false)
  const [catName, setCatName] = useState('')
  const [addingContent, setAddingContent] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState(node.name)
  const [imgOpen, setImgOpen] = useState(false)
  const [imgBusy, setImgBusy] = useState(false)

  const addCategory = async () => {
    if (!catName.trim()) return
    await api('/api/admin/categories', 'POST', { name: catName.trim(), parentId: node.id })
    setCatName(''); setAddingCat(false); onChange()
  }
  const rename = async () => {
    await api(`/api/admin/categories/${node.id}`, 'PATCH', { name: newName.trim() })
    setRenaming(false); onChange()
  }
  const delCat = async () => {
    if (!confirm(`Apagar "${node.name}" e tudo dentro dela?`)) return
    await api(`/api/admin/categories/${node.id}`, 'DELETE'); onChange()
  }
  const addContent = async (data) => {
    await api('/api/admin/contents', 'POST', { categoryId: node.id, ...data })
    setAddingContent(false); onChange()
  }
  const editContent = async (id, data) => {
    await api(`/api/admin/contents/${id}`, 'PATCH', data); onChange()
  }
  const delContent = async (id) => {
    if (!confirm('Apagar este conteúdo?')) return
    await api(`/api/admin/contents/${id}`, 'DELETE'); onChange()
  }
  const moveContent = async (id, dir) => {
    await api(`/api/admin/contents/${id}/move`, 'POST', { dir }); onChange()
  }
  const moveChild = async (id, dir) => {
    await api(`/api/admin/categories/${id}/move`, 'POST', { dir }); onChange()
  }
  // Foto (thumb) da categoria: sobe o arquivo e salva no imageUrl da categoria
  const pickCatImage = async (f) => {
    if (!f) return
    setImgBusy(true)
    try {
      const fd = new FormData(); fd.append('file', f)
      const r = await fetch('/api/admin/upload', { method: 'POST', credentials: 'include', body: fd })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Falha ao enviar a imagem')
      await api(`/api/admin/categories/${node.id}`, 'PATCH', { imageUrl: j.url }); onChange()
    } catch (e) { alert(e.message) } finally { setImgBusy(false) }
  }
  const removeCatImage = async () => {
    await api(`/api/admin/categories/${node.id}`, 'PATCH', { imageUrl: '' }); onChange()
  }

  return (
    <div style={{ marginLeft: depth * 16, borderLeft: depth ? '1px solid rgba(220,225,235,0.08)' : 'none', paddingLeft: depth ? 12 : 0, marginTop: 8 }}>
      {/* Cabeçalho da categoria */}
      <div className="flex items-center gap-2 flex-wrap">
        {renaming ? (
          <>
            <input value={newName} onChange={e => setNewName(e.target.value)} style={{ ...inputStyle, padding: '4px 8px' }} />
            <button onClick={rename} className="px-2.5 py-1 text-[11px] font-semibold text-white" style={btn('linear-gradient(135deg,#2a5fc7,#5a98f0)', 'transparent', '#fff')}>Salvar</button>
            <button onClick={() => { setRenaming(false); setNewName(node.name) }} className="px-2 py-1 text-[11px]" style={btn('transparent', 'rgba(255,255,255,0.08)', 'rgba(200,206,218,0.5)')}>✕</button>
          </>
        ) : (
          <>
            {count > 1 && onMoveSelf && <MoveBtns canUp={index > 0} canDown={index < count - 1} onMove={dir => onMoveSelf(node.id, dir)} />}
            <span className="font-bold" style={{ fontSize: depth === 0 ? 15 : 13.5, color: depth === 0 ? '#e4e8ef' : '#cdd3dd', fontFamily: "'Space Grotesk', sans-serif" }}>{node.name}</span>
            <button onClick={() => setAddingCat(v => !v)} title="Subcategoria" className="px-2 py-0.5 text-[11px]" style={btn('rgba(58,100,220,0.14)', 'rgba(100,150,255,0.2)', 'rgba(160,195,255,0.8)')}>+ sub</button>
            <button onClick={() => setAddingContent(v => !v)} title="Conteúdo" className="px-2 py-0.5 text-[11px]" style={btn('rgba(58,100,220,0.14)', 'rgba(100,150,255,0.2)', 'rgba(160,195,255,0.8)')}>+ conteúdo</button>
            <button onClick={() => { setRenaming(true); setNewName(node.name) }} className="px-2 py-0.5 text-[11px]" style={btn('rgba(255,255,255,0.04)', 'rgba(255,255,255,0.08)', 'rgba(200,206,218,0.5)')}>renomear</button>
            <button onClick={() => setImgOpen(v => !v)} title="Foto da categoria" className="px-2 py-0.5 text-[11px]" style={btn(node.imageUrl ? 'rgba(58,123,213,0.18)' : 'rgba(255,255,255,0.04)', node.imageUrl ? 'rgba(122,167,255,0.35)' : 'rgba(255,255,255,0.08)', node.imageUrl ? '#A8C8FF' : 'rgba(200,206,218,0.5)')}>🖼️ capa</button>
            <button onClick={delCat} className="px-2 py-0.5 text-[11px]" style={btn('rgba(220,60,60,0.08)', 'rgba(220,80,80,0.18)', 'rgba(255,140,140,0.7)')}>apagar</button>
          </>
        )}
      </div>

      {/* Form: nova subcategoria */}
      {addingCat && (
        <div className="flex gap-2 mt-2">
          <input autoFocus placeholder="Nome da subcategoria" value={catName} onChange={e => setCatName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCategory()} style={{ ...inputStyle, padding: '5px 9px' }} />
          <button onClick={addCategory} className="px-3 py-1 text-[12px] font-semibold text-white" style={btn('linear-gradient(135deg,#2a5fc7,#5a98f0)', 'transparent', '#fff')}>Criar</button>
        </div>
      )}

      {/* Painel: foto (thumb) da categoria */}
      {imgOpen && (
        <div className="flex items-center gap-3 mt-2 p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(220,225,235,0.08)' }}>
          {node.imageUrl ? (
            <div className="rounded-md overflow-hidden flex-shrink-0" style={{ width: 150, aspectRatio: '16/9', border: '1px solid rgba(122,167,255,0.25)' }}>
              <img src={node.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ) : (
            <div className="rounded-md flex items-center justify-center flex-shrink-0" style={{ width: 150, aspectRatio: '16/9', background: 'rgba(58,123,213,0.1)', border: '1px dashed rgba(122,167,255,0.3)' }}>
              <img src="/imgs/logo3d.png" alt="" style={{ width: 40, height: 40, objectFit: 'contain', opacity: 0.6 }} />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="px-3 py-1.5 text-[11px] font-semibold inline-flex cursor-pointer" style={btn('rgba(58,100,220,0.14)', 'rgba(100,150,255,0.2)', 'rgba(160,195,255,0.85)')}>
              <input type="file" accept="image/*" className="hidden" onChange={e => pickCatImage(e.target.files?.[0] || null)} />
              {imgBusy ? 'enviando…' : (node.imageUrl ? 'Trocar foto' : 'Escolher foto')}
            </label>
            {node.imageUrl && <button onClick={removeCatImage} className="px-3 py-1.5 text-[11px]" style={btn('rgba(220,60,60,0.06)', 'rgba(220,80,80,0.15)', 'rgba(255,140,140,0.6)')}>Remover foto</button>}
            <span className="text-[10px]" style={{ color: 'rgba(200,206,218,0.4)' }}>Banner 16:9 no card da Área do Aluno (use imagem 16:9 pra não cortar).</span>
          </div>
        </div>
      )}

      {/* Form: novo conteúdo */}
      {addingContent && <ContentForm onSubmit={addContent} onCancel={() => setAddingContent(false)} />}

      {/* Lista de conteúdos */}
      {node.contents.length > 0 && (
        <div className="flex flex-col gap-1 mt-2">
          {node.contents.map((c, i) => (
            <ContentRow key={c.id} content={c} onEdit={editContent} onDelete={delContent}
              onMove={moveContent} canUp={i > 0} canDown={i < node.contents.length - 1} />
          ))}
        </div>
      )}

      {/* Filhos */}
      {node.children.map((child, i) => (
        <Node key={child.id} node={child} depth={depth + 1} onChange={onChange}
          index={i} count={node.children.length} onMoveSelf={moveChild} />
      ))}
    </div>
  )
}

export default function AdminStudentArea() {
  const [tree, setTree] = useState([])
  const [addingRoot, setAddingRoot] = useState(false)
  const [rootName, setRootName] = useState('')

  const reload = () => api('/api/admin/tree').then(d => setTree(d.tree || []))
  useEffect(() => { reload() }, [])

  const addRoot = async () => {
    if (!rootName.trim()) return
    await api('/api/admin/categories', 'POST', { name: rootName.trim() })
    setRootName(''); setAddingRoot(false); reload()
  }
  const moveRoot = async (id, dir) => {
    await api(`/api/admin/categories/${id}/move`, 'POST', { dir }); reload()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[12px]" style={{ color: 'rgba(200,206,218,0.5)', fontFamily: "'Inter', sans-serif" }}>
          Crie seções, redes e tópicos, e poste vídeos e ferramentas em cada um.
        </p>
        <button onClick={() => setAddingRoot(v => !v)} className="px-3.5 py-1.5 text-[12px] font-semibold whitespace-nowrap"
          style={btn('rgba(58,100,220,0.16)', 'rgba(100,150,255,0.22)', 'rgba(160,195,255,0.9)')}>+ Nova seção</button>
      </div>

      {addingRoot && (
        <div className="flex gap-2 mb-3">
          <input autoFocus placeholder="Nome da seção (ex: Memecoins, Futuros)" value={rootName} onChange={e => setRootName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addRoot()} style={{ ...inputStyle, flex: 1 }} />
          <button onClick={addRoot} className="px-4 py-1.5 text-[12px] font-semibold text-white" style={btn('linear-gradient(135deg,#2a5fc7,#5a98f0)', 'transparent', '#fff')}>Criar</button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {tree.length === 0
          ? <p className="text-[12px] py-6 text-center" style={{ color: 'rgba(200,206,218,0.4)' }}>Nenhuma seção ainda. Crie a primeira.</p>
          : tree.map((root, i) => (
              <Node key={root.id} node={root} depth={0} onChange={reload}
                index={i} count={tree.length} onMoveSelf={moveRoot} />
            ))}
      </div>
    </div>
  )
}
