interface Props {
  orderId: string
  confirmationCode: string
  onNewOrder: () => void
}

export function ConfirmationStep({ orderId, confirmationCode, onNewOrder }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center animate-fade-in">
      <div className="max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-brand-accent/20 flex items-center justify-center mx-auto mb-6 text-3xl">
          ✓
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Commande enregistrée
        </h1>
        <p className="text-brand-muted mb-2">
          Merci pour votre achat. Paiement à la livraison (COD).
        </p>
        <p className="text-brand-accent font-mono font-semibold mb-2">
          N° commande : {orderId}
        </p>
        <p className="text-brand-accent font-mono text-sm mb-8">
          Code de confirmation : {confirmationCode}
        </p>
        <button
          type="button"
          onClick={onNewOrder}
          className="px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
        >
          Passer une nouvelle commande
        </button>
      </div>
    </div>
  )
}
