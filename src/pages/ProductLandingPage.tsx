import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { loadProducts, getAntichocById, SCREEN_PROTECTOR_UPSELL } from '../data'
import { loadDeliveryPrices } from '../delivery'
import type { Antichoc } from '../data'
import type { IPhoneModelId } from '../data'
import type { CartItem } from '../types'
import { apiGetLandingBySlug } from '../api'
import { ProductDetailView } from '../components/ProductDetailView'
import { CheckoutStep } from '../steps/CheckoutStep'
import { ConfirmationStep } from '../steps/ConfirmationStep'
import { trackAddToCart } from '../facebookPixel'

type Step = 'landing' | 'checkout' | 'confirmation'

export function ProductLandingPage() {
  const { slug } = useParams<{ slug: string }>()
  const [step, setStep] = useState<Step>('landing')
  const [antichoc, setAntichoc] = useState<Antichoc | null>(null)
  const [title, setTitle] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orderId, setOrderId] = useState('')
  const [confirmationCode, setConfirmationCode] = useState('')

  useEffect(() => {
    if (!slug) {
      setError('URL invalide')
      setLoading(false)
      return
    }
    let cancelled = false
    async function load() {
      try {
        await Promise.all([loadProducts(), loadDeliveryPrices()])
        const landing = await apiGetLandingBySlug(slug)
        if (cancelled) return
        if (!landing) {
          setError('Landing page introuvable')
          setLoading(false)
          return
        }
        const product = getAntichocById(landing.antichocId)
        if (cancelled) return
        if (!product) {
          setError('Produit introuvable')
          setLoading(false)
          return
        }
        setAntichoc(product)
        setTitle(landing.title || null)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Erreur')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [slug])

  const [cart, setCart] = useState<CartItem[]>([])
  const goToCheckout = (selectedPhoneId: IPhoneModelId, selectedColorId: string, addUpsellScreenProtector: boolean) => {
    const p = antichoc!
    const items: CartItem[] = [{ antichoc: p, selectedPhoneId, selectedColorId }]
    if (addUpsellScreenProtector) items.push({ antichoc: SCREEN_PROTECTOR_UPSELL, isUpsell: true })
    setCart(items)
    trackAddToCart(p.name, [p.id], p.price, 'DZD')
    setStep('checkout')
  }
  const goBack = () => setStep('landing')
  const onConfirm = (id: string, code: string) => {
    setOrderId(id)
    setConfirmationCode(code)
    setStep('confirmation')
  }
  const onNewOrder = () => {
    setOrderId('')
    setConfirmationCode('')
    setStep('landing')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <p className="text-brand-muted">Chargement...</p>
      </div>
    )
  }

  if (error || !antichoc) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center px-6">
        <p className="text-red-400 mb-4">{error ?? 'Page introuvable'}</p>
        <Link to="/" className="text-brand-accent hover:underline">
          Retour à l'accueil
        </Link>
      </div>
    )
  }

  if (step === 'checkout') {
    return (
      <div className="min-h-screen bg-brand-dark">
        <CheckoutStep
          cart={cart}
          onBack={goBack}
          onConfirm={onConfirm}
        />
      </div>
    )
  }

  if (step === 'confirmation') {
    return (
      <ConfirmationStep
        orderId={orderId}
        confirmationCode={confirmationCode}
        onNewOrder={onNewOrder}
      />
    )
  }

  return (
    <ProductDetailView
      product={antichoc}
      title={title ?? undefined}
      onCommander={goToCheckout}
      backLink={
        <Link to="/" className="text-brand-muted hover:text-white text-sm flex items-center gap-1">
          ← Retour au site
        </Link>
      }
    />
  )
}
