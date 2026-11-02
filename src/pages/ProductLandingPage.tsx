import { useState, useEffect } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { fetchProductById, usesSectionLanding } from '../data'
import { getScreenProtectorUpsell, getSmartFoldUpsell, getNanoPopUpsell, getCardHolderMagSafeUpsell } from '../data-screen-protector'
import { loadDeliveryPrices } from '../delivery'
import type { Antichoc } from '../data'
import type { CartItem } from '../types'
import { apiGetLandingBySlug, type LandingTemplate } from '../api'
import { ProductDetailView } from '../components/ProductDetailView'
import { GeneralProductLanding } from '../components/GeneralProductLanding'
import { SiteHeader } from '../components/SiteHeader'
import { SiteFooter } from '../components/SiteFooter'
import { CheckoutStep } from '../steps/CheckoutStep'
import { ConfirmationStep } from '../steps/ConfirmationStep'
import { trackAddToCart } from '../facebookPixel'
import { trackTikTokAddToCart } from '../tiktokPixel'

type Step = 'landing' | 'checkout' | 'confirmation'

export function ProductLandingPage() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState<Step>('landing')
  const [antichoc, setAntichoc] = useState<Antichoc | null>(null)
  const [title, setTitle] = useState<string | null>(null)
  const [template, setTemplate] = useState<LandingTemplate>('full')
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
        const [, landing] = await Promise.all([loadDeliveryPrices(), apiGetLandingBySlug(slug)])
        if (cancelled) return
        if (!landing) {
          setError('Landing page introuvable')
          setLoading(false)
          return
        }
        const product = await fetchProductById(landing.antichocId)
        if (cancelled) return
        if (!product) {
          setError('Produit introuvable')
          setLoading(false)
          return
        }
        setAntichoc(product)
        setTitle(landing.title || null)
        setTemplate(landing.template === 'simple' ? 'simple' : 'full')
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

  // Produit général : titre d'onglet propre au produit (sinon celui de ProtecPhone reste affiché)
  useEffect(() => {
    if (!antichoc || !usesSectionLanding(antichoc)) return
    const previous = document.title
    const name = title ?? antichoc.name
    const brand = antichoc.landing?.brandName
    document.title = brand ? `${name} — ${brand}` : name
    return () => {
      document.title = previous
    }
  }, [antichoc, title])

  const [cart, setCart] = useState<CartItem[]>([])
  const goToCheckout = (
    selectedPhoneId: string,
    selectedColorId: string,
    addUpsellScreenProtector: boolean,
    addUpsellSmartFold: boolean,
    addUpsellNanoPop: boolean,
    addUpsellCardHolder: boolean,
  ) => {
    const p = antichoc!
    const items: CartItem[] = [{ antichoc: p, selectedPhoneId, selectedColorId }]
    if (addUpsellScreenProtector) items.push({ antichoc: getScreenProtectorUpsell(), isUpsell: true })
    if (addUpsellSmartFold) items.push({ antichoc: getSmartFoldUpsell(), isUpsell: true })
    if (addUpsellNanoPop) items.push({ antichoc: getNanoPopUpsell(), isUpsell: true })
    if (addUpsellCardHolder) items.push({ antichoc: getCardHolderMagSafeUpsell(), isUpsell: true })
    setCart(items)
    trackAddToCart(p.name, [p.id], p.price, 'DZD')
    trackTikTokAddToCart(p.name, [p.id], p.price, 'DZD')
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

  // Les produits généraux n'ont pas l'en-tête / pied de page ProtecPhone
  const general = usesSectionLanding(antichoc)
  const withSiteChrome = (content: React.ReactNode) =>
    general ? (
      <div className="min-h-screen bg-brand-dark">{content}</div>
    ) : (
      <div className="min-h-screen flex flex-col bg-brand-dark">
        <SiteHeader />
        <main className="flex-1 bg-brand-dark min-h-0">{content}</main>
        <SiteFooter />
      </div>
    )

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
    return withSiteChrome(
      <CheckoutStep
        cart={cart}
        onBack={goBack}
        onConfirm={onConfirm}
      />,
    )
  }

  if (step === 'confirmation') {
    return withSiteChrome(
      <ConfirmationStep
        orderId={orderId}
        confirmationCode={confirmationCode}
        onNewOrder={onNewOrder}
      />,
    )
  }

  if (general) {
    return <GeneralProductLanding product={antichoc} title={title} template={template} />
  }

  return withSiteChrome(
    <ProductDetailView
      product={antichoc}
      title={title ?? undefined}
      initialSelectedModelId={searchParams.get('model')}
      onCommander={goToCheckout}
      backLink={
        <Link to="/" className="text-brand-muted hover:text-white text-sm flex items-center gap-1">
          ← Retour au site
        </Link>
      }
    />,
  )
}
