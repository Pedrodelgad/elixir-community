import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import './index.css'

// Cada página vira um chunk separado (code-splitting) — corta o bundle inicial.
// O logo 3D (three.js) fica no chunk da home, então só baixa em '/'.
const App = lazy(() => import('./App.jsx'))
const PlansPage = lazy(() => import('./pages/PlansPage.jsx'))
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'))
const AffiliatePage = lazy(() => import('./pages/AffiliatePage.jsx'))
const AreaDoAlunoPage = lazy(() => import('./pages/AreaDoAlunoPage.jsx'))
const VincularDiscordPage = lazy(() => import('./pages/VincularDiscordPage.jsx'))

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
        <Suspense fallback={<div style={{ minHeight: '100vh', background: '#020617' }} />}>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/planos" element={<PlansPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/videos" element={<Navigate to="/area-do-aluno" replace />} />
            <Route path="/area-do-aluno" element={<AreaDoAlunoPage />} />
            <Route path="/afiliado" element={<AffiliatePage />} />
            <Route path="/vincular-discord" element={<VincularDiscordPage />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
