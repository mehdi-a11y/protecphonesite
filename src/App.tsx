import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import type { IPhoneModelId } from './data'
import type { SamsungModelId } from './data'
import { SAMSUNG_ULTRA_MODELS } from './data'
import { loadDeliveryPrices } from './delivery'
import { loadProducts } from './data'
import type { CartItem } from './types'
import { LandingStep } from './steps/LandingStep'
import { IPhoneStep } from './steps/IPhoneStep'
import { SamsungStep } from './steps/SamsungStep'
import { ProductsStep } from './steps/ProductsStep'
import { CheckoutStep } from './steps/CheckoutStep'
import { ConfirmationStep } from './steps/ConfirmationStep'

export type Step = 'landing' | 'iphone' | 'samsung' | 'products' | 'checkout' | 'confirmation'

interface AppProps {
  initialStep?: Step
}

export function App({ initialStep = 'landing' }: AppProps) {
  const [step, setStep] = useState<Step>(initialStep)
  const navigate = useNavigate()
  const location = useLocation()
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderId, setOrderId] = useState<string>('')
  const [confirmationCode, setConfirmationCode] = useState<string>('')

  useEffect(() => {
    loadDeliveryPrices().catch(() => {})
    loadProducts().catch(() => {})
  }, [])

  // Synchroniser l’étape avec l’URL (pour https://www.protecphone.shop/iphone)
  useEffect(() => {
    if (location.pathname === '/iphone' && step !== 'iphone') setStep('iphone')
    if (location.pathname === '/samsung' && step !== 'samsung') setStep('samsung')
  }, [location.pathname])

  const goToIphone = () => {
    setStep('iphone')
    loadProducts().catch(() => {})
    loadDeliveryPrices().catch(() => {})
  }
  const goToSamsung = () => {
    setStep('samsung')
    loadProducts().catch(() => {})
    loadDeliveryPrices().catch(() => {})
  }
  const goToProducts = (phoneId: IPhoneModelId) => {
    setSelectedModelId(phoneId)
    setCart([])
    setStep('products')
  }
  const goToProductsSamsung = (modelId: SamsungModelId) => {
    setSelectedModelId(modelId)
    setCart([])
    setStep('products')
  }
  const addToCart = (item: CartItem) => {
    setCart((prev) => [...prev, item])
  }
  const goToCheckout = () => {
    setStep('checkout')
  }
  const goToConfirmation = (id: string, code: string) => {
    setOrderId(id)
    setConfirmationCode(code)
    setStep('confirmation')
  }
  const reset = () => {
    setStep('landing')
    setSelectedModelId(null)
    setCart([])
    setOrderId('')
    setConfirmationCode('')
  }

  const isSamsungModel = selectedModelId != null && SAMSUNG_ULTRA_MODELS.some((m) => m.id === selectedModelId)
  const productsBackStep: Step = isSamsungModel ? 'samsung' : 'iphone'

  return (
    <div className="min-h-screen bg-brand-dark">
      {step === 'landing' && (
        <LandingStep
          onNext={goToIphone}
          onGoToIphonePage={() => navigate('/iphone')}
          onGoToSamsungPage={() => navigate('/samsung')}
        />
      )}
      {step === 'iphone' && (
        <IPhoneStep
          onBack={() => {
            if (location.pathname === '/iphone') navigate('/')
            else setStep('landing')
          }}
          onSelect={goToProducts}
        />
      )}
      {step === 'samsung' && (
        <SamsungStep
          onBack={() => {
            if (location.pathname === '/samsung') navigate('/')
            else setStep('landing')
          }}
          onSelect={goToProductsSamsung}
        />
      )}
      {step === 'products' && selectedModelId && (
        <ProductsStep
          modelId={selectedModelId}
          cart={cart}
          onBack={() => setStep(productsBackStep)}
          onAddToCart={addToCart}
          onCheckout={goToCheckout}
        />
      )}
      {step === 'checkout' && (
        <CheckoutStep
          cart={cart}
          onBack={() => setStep('products')}
          onConfirm={goToConfirmation}
        />
      )}
      {step === 'confirmation' && (
        <ConfirmationStep orderId={orderId} confirmationCode={confirmationCode} onNewOrder={reset} />
      )}
    </div>
  )
}
