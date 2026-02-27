import { IPHONE_MODELS } from '../data'
import type { IPhoneModelId } from '../data'

interface Props {
  onBack: () => void
  onSelect: (phoneId: IPhoneModelId) => void
}

export function IPhoneStep({ onBack, onSelect }: Props) {
  return (
    <div className="min-h-screen px-4 py-8 pb-24 animate-fade-in">
      <div className="max-w-2xl mx-auto">
        <button
          type="button"
          onClick={onBack}
          className="text-brand-muted hover:text-white mb-6 flex items-center gap-2 transition-colors"
        >
          ← Retour
        </button>
        <h2 className="text-2xl font-bold text-white mb-2">
          Quel est votre iPhone ?
        </h2>
        <p className="text-brand-muted mb-8">
          Sélectionnez le modèle pour voir les antichocs compatibles.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {IPHONE_MODELS.map((model) => (
            <button
              key={model.id}
              type="button"
              onClick={() => onSelect(model.id)}
              className="p-4 rounded-xl bg-brand-card border border-white/10 text-left hover:border-brand-accent/50 hover:bg-white/5 transition-all duration-200 flex items-center justify-between group"
            >
              <span className="font-medium text-white">{model.name}</span>
              <span className="text-brand-muted group-hover:text-brand-accent transition-colors">
                →
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
