import { useState, useMemo, useEffect } from 'react'
import { isVariantOrderable } from '../data'
import { saveOrder } from '../types'
import type { CartItem, DeliveryType } from '../types'
import { getDeliveryPriceForWilaya } from '../delivery'
import { apiGetYalidineStopdesks, apiGetCommunes, type YalidineStopdesk } from '../api'
import { trackPurchase } from '../facebookPixel'
import { identifyTikTokUser, trackTikTokCompletePayment } from '../tiktokPixel'

function generateConfirmationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * État + envoi du formulaire de commande (COD), partagé par la page checkout
 * et le formulaire intégré des landing pages : les commandes sont identiques.
 */
export function useCheckoutForm(cart: CartItem[]) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [wilaya, setWilaya] = useState('')
  const [commune, setCommune] = useState('')
  const [communes, setCommunes] = useState<string[]>([])
  const [communesLoading, setCommunesLoading] = useState(false)
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('domicile')
  const [stopdesks, setStopdesks] = useState<YalidineStopdesk[]>([])
  const [stopdesksLoading, setStopdesksLoading] = useState(false)
  const [selectedStopdeskId, setSelectedStopdeskId] = useState('')
  const [selectedStopdeskName, setSelectedStopdeskName] = useState('')
  const [selectedStopdeskCommune, setSelectedStopdeskCommune] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!wilaya) {
      setCommunes([])
      setCommune('')
      return
    }
    setCommunesLoading(true)
    setCommune('')
    let cancelled = false
    apiGetCommunes(wilaya)
      .then((list) => { if (!cancelled && list?.length) setCommunes(list) })
      .catch(() => { if (!cancelled) setCommunes([]) })
      .finally(() => { if (!cancelled) setCommunesLoading(false) })
    return () => { cancelled = true }
  }, [wilaya])

  useEffect(() => {
    if (deliveryType !== 'yalidine' || !wilaya) {
      setStopdesks([])
      setSelectedStopdeskId('')
      setSelectedStopdeskName('')
      setSelectedStopdeskCommune('')
      return
    }
    setStopdesksLoading(true)
    setSelectedStopdeskId('')
    setSelectedStopdeskName('')
    setSelectedStopdeskCommune('')

    let cancelled = false
    // Bureaux uniquement depuis l'API Yalidine pour que le stopdesk_id soit accepté à l'envoi
    apiGetYalidineStopdesks(wilaya, { onlyFromApi: true })
      .then((list) => {
        if (!cancelled && list && list.length > 0) setStopdesks(list)
      })
      .catch(() => { if (!cancelled) setStopdesks([]) })
      .finally(() => { if (!cancelled) setStopdesksLoading(false) })
    return () => { cancelled = true }
  }, [deliveryType, wilaya])

  const totalMain = cart.reduce((sum, i) => sum + i.antichoc.price, 0)
  const deliveryPrice = useMemo(
    () => (wilaya ? getDeliveryPriceForWilaya(wilaya, deliveryType) : 0),
    [wilaya, deliveryType],
  )
  const total = totalMain + deliveryPrice

  const canSubmitBureau =
    (deliveryType !== 'yalidine' || (selectedStopdeskId && selectedStopdeskName)) &&
    (deliveryType !== 'domicile' || !wilaya || commune.trim() !== '')

  const invalidCartItems = useMemo(() => {
    return cart.filter((item) => {
      if (item.isUpsell) return false
      const phoneId = item.selectedPhoneId
      const colorId = item.selectedColorId ?? ''
      if (!phoneId) return false
      return !isVariantOrderable(item.antichoc, colorId, phoneId)
    })
  }, [cart])
  const canSubmitOrder = Boolean(canSubmitBureau) && invalidCartItems.length === 0 && cart.length > 0

  /** Choix d'un bureau Yalidine depuis le <select> (id + libellé affiché + commune du bureau). */
  const selectStopdesk = (value: string, label: string) => {
    const bureau = stopdesks.find((s) => String(s.id) === value)
    setSelectedStopdeskId(value)
    setSelectedStopdeskName(label)
    setSelectedStopdeskCommune(bureau?.commune ?? '')
  }

  /** Enregistre la commande. Renvoie { orderId, confirmationCode } ou null si non envoyable. */
  const submit = async (): Promise<{ orderId: string; confirmationCode: string } | null> => {
    if (!canSubmitOrder || isSubmitting) return null
    setIsSubmitting(true)
    try {
      const orderId = 'CMD-' + Date.now()
      const confirmationCode = generateConfirmationCode()
      const finalCart: CartItem[] = [...cart]
      await saveOrder({
        id: orderId,
        customerName: name,
        phone,
        address: deliveryType === 'domicile' ? commune.trim() : (deliveryType === 'yalidine' ? selectedStopdeskCommune : ''),
        wilaya,
        deliveryType,
        deliveryPrice,
        items: finalCart,
        total,
        status: 'none',
        createdAt: new Date().toISOString(),
        confirmationCode,
        ...(deliveryType === 'yalidine' && selectedStopdeskId
          ? { yalidineStopdeskId: selectedStopdeskId, yalidineStopdeskName: selectedStopdeskName }
          : {}),
      })
      trackPurchase(total, 'DZD', orderId, finalCart.map((i) => i.antichoc.id))
      await identifyTikTokUser(phone)
      trackTikTokCompletePayment(total, 'DZD', orderId, finalCart.map((i) => i.antichoc.id))
      return { orderId, confirmationCode }
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    name, setName,
    phone, setPhone,
    wilaya, setWilaya,
    commune, setCommune,
    communes, communesLoading,
    deliveryType, setDeliveryType,
    stopdesks, stopdesksLoading,
    selectedStopdeskId, selectStopdesk,
    isSubmitting,
    deliveryPrice, total,
    invalidCartItems, canSubmitOrder,
    submit,
  }
}
