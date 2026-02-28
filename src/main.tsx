import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { App } from './App.tsx'
import { AdminPage } from './pages/AdminPage.tsx'
import { ConfirmPage } from './pages/ConfirmPage.tsx'
import { ProductLandingPage } from './pages/ProductLandingPage.tsx'
import { ProductPage } from './pages/ProductPage.tsx'
import { initFacebookPixel } from './facebookPixel'
import './index.css'

initFacebookPixel()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/confirmateur" element={<ConfirmPage />} />
        <Route path="/p/:slug" element={<ProductLandingPage />} />
        <Route path="/product/:id" element={<ProductPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
