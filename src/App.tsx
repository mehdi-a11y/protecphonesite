import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import type { IPhoneModelId } from './data'
import { loadDeliveryPrices } from './delivery'
import { loadProducts } from './data'
import type { Antichoc } from './data'
import type { CartItem } from './types'
import { LandingStep } from './steps/LandingStep'
import { IPhoneStep } from './steps/IPhoneStep'
import { ProductsStep } from './steps/ProductsStep'
import { CheckoutStep } from './steps/CheckoutStep'
import { ConfirmationStep } from './steps/ConfirmationStep'

export type Step = 'landing' | 'iphone' | 'products' | 'checkout' | 'confirmation'

interface AppProps {
  initialStep?: Step
}

export function App({ initialStep = 'landing' }: AppProps) {
  const [step, setStep] = useState<Step>(initialStep)
  const navigate = useNavigate()
  const location = useLocation()
  const [selectedPhone, setSelectedPhone] = useState<IPhoneModelId | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderId, setOrderId] = useState<string>('')
  const [confirmationCode, setConfirmationCode] = useState<string>('')

  useEffect(() => {
    loadDeliveryPrices().catch(() => {})
    loadProducts().catch(() => {})
  }, [])

  // Synchroniser l’étape avec l’URL (pour https://www.protecphone.shop/iphone)
  useEffect(() => {
    if (location.pathname === '/iphone' && step !== 'iphone') {
      setStep('iphone')
    }
  }, [location.pathname])

  const goToIphone = () => {
    setStep('iphone')
    loadProducts().catch(() => {})
    loadDeliveryPrices().catch(() => {})
  }
  const goToProducts = (phoneId: IPhoneModelId) => {
    setSelectedPhone(phoneId)
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
    setSelectedPhone(null)
    setCart([])
    setOrderId('')
    setConfirmationCode('')
  }

  return (
    <div className="min-h-screen bg-brand-dark">
      {step === 'landing' && (
        <LandingStep
          onNext={goToIphone}
          onGoToIphonePage={() => navigate('/iphone')}
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
      {step === 'products' && selectedPhone && (
        <ProductsStep
          phoneId={selectedPhone}
          cart={cart}
          onBack={() => setStep('iphone')}
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
