import { useParams } from 'react-router-dom'
import { Suspense, lazy } from 'react'

const ProductPage = lazy(() => import('./ProductPage.tsx').then((m) => ({ default: m.ProductPage })))

export function ProductPageWrapper() {
  const { id } = useParams<{ id: string }>()
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-brand-dark flex items-center justify-center">
          <p className="text-brand-muted">Chargement...</p>
        </div>
      }
    >
      <ProductPage id={id ?? undefined} />
    </Suspense>
  )
}
