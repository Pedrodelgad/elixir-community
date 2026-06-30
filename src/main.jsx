import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import App from './App.jsx'
import PlansPage from './pages/PlansPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import AffiliatePage from './pages/AffiliatePage.jsx'
import AreaDoAlunoPage from './pages/AreaDoAlunoPage.jsx'
import './index.css'

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
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
