import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { SiteLayout } from './components/SiteLayout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { App } from './App.tsx'
import { ProductPageWrapper } from './pages/ProductPageWrapper'
import './index.css'

// Lazy load des pages lourdes pour accélérer le premier affichage
const AdminPage = lazy(() => import('./pages/AdminPage.tsx').then((m) => ({ default: m.AdminPage })))
const ConfirmPage = lazy(() => import('./pages/ConfirmPage.tsx').then((m) => ({ default: m.ConfirmPage })))
const ProductLandingPage = lazy(() => import('./pages/ProductLandingPage.tsx').then((m) => ({ default: m.ProductLandingPage })))
const CollectionPage = lazy(() => import('./pages/CollectionPage.tsx').then((m) => ({ default: m.CollectionPage })))

// Pixels chargés après le premier rendu pour ne pas bloquer l’affichage
if (typeof requestIdleCallback !== 'undefined') {
  requestIdleCallback(() => {
    import('./facebookPixel').then((m) => m.initFacebookPixel())
    import('./tiktokPixel').then((m) => m.initTikTokPixel())
  }, { timeout: 2000 })
} else {
  setTimeout(() => {
    import('./facebookPixel').then((m) => m.initFacebookPixel())
    import('./tiktokPixel').then((m) => m.initTikTokPixel())
  }, 500)
}

function PageFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center bg-brand-dark">
      <div className="text-brand-muted text-sm">Chargement…</div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/iphone" element={<App initialStep="iphone" />} />
          <Route path="/" element={<App />} />
          <Route path="/admin" element={<Suspense fallback={<PageFallback />}><AdminPage /></Suspense>} />
          <Route path="/confirmateur" element={<Suspense fallback={<PageFallback />}><ConfirmPage /></Suspense>} />
          <Route path="/p/:slug" element={<Suspense fallback={<PageFallback />}><ProductLandingPage /></Suspense>} />
          <Route path="/c/:slug" element={<Suspense fallback={<PageFallback />}><CollectionPage /></Suspense>} />
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
