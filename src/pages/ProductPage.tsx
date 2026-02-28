import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { loadProducts, getAntichocById } from '../data'
import { loadDeliveryPrices } from '../delivery'
import type { Antichoc } from '../data'
import type { IPhoneModelId } from '../data'
import type { CartItem } from '../types'
import { ProductDetailView } from '../components/ProductDetailView'
import { CheckoutStep } from '../steps/CheckoutStep'
import { ConfirmationStep } from '../steps/ConfirmationStep'

type Step = 'product' | 'checkout' | 'confirmation'

export function ProductPage() {
  const { id } = useParams<{ id: string }>()
  const [step, setStep] = useState<Step>('product')
  const [product, setProduct] = useState<Antichoc | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orderId, setOrderId] = useState('')
  const [confirmationCode, setConfirmationCode] = useState('')

  useEffect(() => {
    if (!id) {
      setError('URL invalide')
      setLoading(false)
      return
    }
    let cancelled = false
    async function load() {
      try {
        await Promise.all([loadProducts(), loadDeliveryPrices()])
        if (cancelled) return
        const p = getAntichocById(id)
        if (cancelled) return
        setProduct(p ?? null)
        if (!p) setError('Produit introuvable')
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
  const goToCheckout = (selectedPhoneId: IPhoneModelId, selectedColorId: string) => {
    setCart([{ antichoc: product!, selectedPhoneId, selectedColorId }])
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
        <Link to="/" className="text-brand-accent hover:underline">
          Retour à l'accueil
        </Link>
      </div>
    )
  }

  if (step === 'checkout') {
    return (
      <div className="min-h-screen bg-brand-dark">
        <CheckoutStep cart={cart} onBack={goBack} onConfirm={onConfirm} />
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
      product={product}
      onCommander={goToCheckout}
      backLink={
        <Link to="/" className="text-brand-muted hover:text-white text-sm flex items-center gap-1">
          ← Retour au catalogue
        </Link>
      }
    />
  )
}
