import { useState } from 'react'
import type { IPhoneModelId } from './data'
import type { Antichoc } from './data'
import type { CartItem } from './types'
import { LandingStep } from './steps/LandingStep'
import { IPhoneStep } from './steps/IPhoneStep'
import { ProductsStep } from './steps/ProductsStep'
import { CheckoutStep } from './steps/CheckoutStep'
import { ConfirmationStep } from './steps/ConfirmationStep'

export type Step = 'landing' | 'iphone' | 'products' | 'checkout' | 'confirmation'

export function App() {
  const [step, setStep] = useState<Step>('landing')
  const [selectedPhone, setSelectedPhone] = useState<IPhoneModelId | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderId, setOrderId] = useState<string>('')
  const [confirmationCode, setConfirmationCode] = useState<string>('')

  const goToIphone = () => setStep('iphone')
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
      {step === 'landing' && <LandingStep onNext={goToIphone} />}
      {step === 'iphone' && (
        <IPhoneStep
          onBack={() => setStep('landing')}
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
