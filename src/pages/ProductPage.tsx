import { useState, useEffect, lazy, Suspense } from 'react'
import { loadDeliveryPrices } from '../delivery'
import type { Antichoc } from '../data'
import type { IPhoneModelId } from '../data'
import type { CartItem } from '../types'
import { trackAddToCart } from '../facebookPixel'
import { trackTikTokAddToCart } from '../tiktokPixel'

const ProductDetailView = lazy(() => import('../components/ProductDetailView').then((m) => ({ default: m.ProductDetailView })))
const CheckoutStep = lazy(() => import('../steps/CheckoutStep').then((m) => ({ default: m.CheckoutStep })))
const ConfirmationStep = lazy(() => import('../steps/ConfirmationStep').then((m) => ({ default: m.ConfirmationStep })))

type Step = 'product' | 'checkout' | 'confirmation'

interface ProductPageProps {
  id: string | undefined
}

export function ProductPage({ id }: ProductPageProps) {
  const [step, setStep] = useState<Step>('product')
  const [product, setProduct] = useState<Antichoc | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orderId, setOrderId] = useState('')
  const [confirmationCode, setConfirmationCode] = useState('')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  useEffect(() => {
    if (!id) {
      setError('URL invalide')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    setProduct(null)
    let cancelled = false
    async function load() {
      try {
        const { loadProducts, getAntichocById, normalizeProduct } = await import('../data')
        await Promise.all([loadProducts(), loadDeliveryPrices()])
        if (cancelled) return
        const p = getAntichocById(id)
        if (cancelled) return
        const normalized = normalizeProduct(p ?? undefined)
        setProduct(normalized)
        if (!normalized) setError('Produit introuvable')
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id])

  const [cart, setCart] = useState<CartItem[]>([])
  const goToCheckout = async (selectedPhoneId: IPhoneModelId, selectedColorId: string, addUpsellScreenProtector: boolean) => {
    const p = product!
    const items: CartItem[] = [{ antichoc: p, selectedPhoneId, selectedColorId }]
    if (addUpsellScreenProtector) {
      const { getScreenProtectorUpsell } = await import('../data-screen-protector')
      items.push({ antichoc: getScreenProtectorUpsell(), isUpsell: true })
    }
    setCart(items)
    trackAddToCart(p.name, [p.id], p.price, 'DZD')
    trackTikTokAddToCart(p.name, [p.id], p.price, 'DZD')
    setStep('checkout')
  }
  const goBack = () => setStep('product')
  const onConfirm = (orderId: string, code: string) => {
    setOrderId(orderId)
    setConfirmationCode(code)
    setStep('confirmation')
  }
  const onNewOrder = () => {
    setOrderId('')
    setConfirmationCode('')
    setStep('product')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <p className="text-brand-muted">Chargement...</p>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center px-6">
        <p className="text-red-400 mb-4">{error ?? 'Produit introuvable'}</p>
        <a href="/" className="text-brand-accent hover:underline">
          Retour à l&apos;accueil
        </a>
      </div>
    )
  }

  if (step === 'checkout') {
    return (
      <div className="min-h-screen bg-brand-dark">
        <Suspense fallback={<div className="min-h-screen bg-brand-dark flex items-center justify-center"><p className="text-brand-muted">Chargement...</p></div>}>
          <CheckoutStep cart={cart} onBack={goBack} onConfirm={onConfirm} />
        </Suspense>
      </div>
    )
  }

  if (step === 'confirmation') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-brand-dark flex items-center justify-center"><p className="text-brand-muted">Chargement...</p></div>}>
        <ConfirmationStep
          orderId={orderId}
          confirmationCode={confirmationCode}
          onNewOrder={onNewOrder}
        />
      </Suspense>
    )
  }

  return (
    <div className="min-h-screen bg-brand-dark">
      <Suspense fallback={<div className="min-h-screen bg-brand-dark flex items-center justify-center"><p className="text-brand-muted">Chargement...</p></div>}>
        <ProductDetailView
          product={product}
          onCommander={goToCheckout}
          backLink={
            <a href="/" className="text-brand-muted hover:text-white text-sm flex items-center gap-1">
              ← Retour au catalogue
            </a>
          }
        />
      </Suspense>
    </div>
  )
}
