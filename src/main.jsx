import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import App from './App.jsx'
import PlansPage from './pages/PlansPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import AffiliatePage from './pages/AffiliatePage.jsx'
import AreaDoAlunoPage from './pages/AreaDoAlunoPage.jsx'
import VincularDiscordPage from './pages/VincularDiscordPage.jsx'
import './index.css'

// Afiliados: ?ref=CODE → cookie elx_ref (60d, 1st-party) + conta o clique, e limpa a URL
;(() => {
  try {
    const raw = new URLSearchParams(window.location.search).get('ref')
    if (!raw) return
    const code = raw.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24)
    if (!code) return
    document.cookie = `elx_ref=${code}; max-age=${60 * 24 * 3600}; path=/; SameSite=Lax`
    fetch('/api/ref/hit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref: code }) }).catch(() => {})
    const url = new URL(window.location.href)
    url.searchParams.delete('ref')
    window.history.replaceState({}, '', url.pathname + url.search + url.hash)
  } catch { /* captura de ref nunca quebra o app */ }
})()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/planos" element={<PlansPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/videos" element={<Navigate to="/area-do-aluno" replace />} />
          <Route path="/area-do-aluno" element={<AreaDoAlunoPage />} />
          <Route path="/afiliado" element={<AffiliatePage />} />
          <Route path="/vincular-discord" element={<VincularDiscordPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
