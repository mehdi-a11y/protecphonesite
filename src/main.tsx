import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { SiteLayout } from './components/SiteLayout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { App } from './App.tsx'
import { AdminPage } from './pages/AdminPage.tsx'
import { ConfirmPage } from './pages/ConfirmPage.tsx'
import { ProductLandingPage } from './pages/ProductLandingPage.tsx'
import { CollectionPage } from './pages/CollectionPage.tsx'
import { initFacebookPixel } from './facebookPixel'
import { initTikTokPixel } from './tiktokPixel'
import './index.css'

initFacebookPixel()
initTikTokPixel()

import { ProductPageWrapper } from './pages/ProductPageWrapper'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<App />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/confirmateur" element={<ConfirmPage />} />
          <Route path="/p/:slug" element={<ProductLandingPage />} />
          <Route path="/c/:slug" element={<CollectionPage />} />
          <Route
            path="/product/:id"
            element={
              <ErrorBoundary>
                <ProductPageWrapper />
              </ErrorBoundary>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
