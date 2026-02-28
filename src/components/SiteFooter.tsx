import { Link } from 'react-router-dom'

export function SiteFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-brand-card border-t border-white/10 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <p className="font-bold text-white text-lg mb-3">PROTECPHONE</p>
            <p className="text-brand-muted text-sm">
              Antichocs iPhone à prix cassés. Paiement à la livraison partout en Algérie.
            </p>
          </div>
          <div>
            <p className="font-semibold text-white text-sm mb-3 uppercase tracking-wider">Navigation</p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-brand-muted hover:text-white transition-colors">
                  Accueil
                </Link>
              </li>
              <li>
                <Link to="/admin" className="text-brand-muted hover:text-white transition-colors">
                  Admin
                </Link>
              </li>
              <li>
                <Link to="/confirmateur" className="text-brand-muted hover:text-white transition-colors">
                  Confirmation commande
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-white text-sm mb-3 uppercase tracking-wider">Avantages</p>
            <ul className="space-y-2 text-sm text-brand-muted">
              <li>✓ Paiement à la livraison (COD)</li>
              <li>✓ Livraison partout en Algérie</li>
              <li>✓ Retours sous 7 jours</li>
              <li>✓ Stock limité — liquidation</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-white text-sm mb-3 uppercase tracking-wider">Contact</p>
            <p className="text-brand-muted text-sm">
              Pour toute question, utilisez les coordonnées indiquées lors de la commande.
            </p>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-white/10 text-center text-sm text-brand-muted">
          <p>© {currentYear} ProtecPhone. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  )
}
