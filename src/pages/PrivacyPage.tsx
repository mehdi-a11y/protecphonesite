import type { ReactNode } from 'react'

const CONTACT_EMAIL = 'mehdinaceur01@gmail.com'

function Bloc({ id, titre, children }: { id?: string; titre: string; children: ReactNode }) {
  return (
    <section id={id} className="mb-8 scroll-mt-24">
      <h2 className="text-lg font-semibold text-white mb-3">{titre}</h2>
      <div className="space-y-3 text-brand-muted leading-relaxed">{children}</div>
    </section>
  )
}

/** Politique de confidentialité et suppression des données (exigée par Meta pour l'API WhatsApp). */
export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-brand-dark">
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-white mb-2">Politique de confidentialité</h1>
        <p className="text-sm text-brand-muted mb-8">ProtecPhone — www.protecphone.shop · Dernière mise à jour : 1er novembre 2026</p>

        <Bloc titre="Qui sommes-nous">
          <p>
            ProtecPhone vend en ligne des coques et protections pour téléphones, livrées partout en Algérie. Cette page explique
            quelles données nous recueillons quand vous passez commande, à quoi elles servent et comment les faire supprimer.
          </p>
        </Bloc>

        <Bloc titre="Données que nous recueillons">
          <p>Quand vous passez commande, nous enregistrons :</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>votre nom et votre numéro de téléphone ;</li>
            <li>votre wilaya, votre commune ou adresse, et le bureau Yalidine choisi ;</li>
            <li>les produits commandés, le montant et la date de la commande ;</li>
            <li>vos réponses à nos messages WhatsApp (confirmation, report ou annulation d'une livraison).</li>
          </ul>
          <p>Nous ne demandons ni données bancaires ni pièce d'identité : le paiement se fait à la livraison.</p>
        </Bloc>

        <Bloc titre="À quoi servent ces données">
          <ul className="list-disc pl-5 space-y-1">
            <li>confirmer votre commande par téléphone ou par WhatsApp ;</li>
            <li>préparer et expédier votre colis, et le suivre jusqu'à la livraison ;</li>
            <li>vous prévenir sur WhatsApp de l'avancement de votre commande (arrivée au bureau, livraison, rappel avant retour) ;</li>
            <li>répondre à vos questions et traiter les retours.</li>
          </ul>
          <p>Nous n'envoyons pas de publicité par WhatsApp et nous ne vendons jamais vos données.</p>
        </Bloc>

        <Bloc titre="Avec qui elles sont partagées">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-white">Yalidine</strong>, notre transporteur, reçoit le nom, le téléphone et l'adresse nécessaires à la livraison ;</li>
            <li><strong className="text-white">WhatsApp (Meta)</strong> transmet nos messages de suivi de commande ;</li>
            <li>notre hébergeur conserve les données de commande sur nos serveurs.</li>
          </ul>
        </Bloc>

        <Bloc titre="Durée de conservation">
          <p>
            Nous gardons les données d'une commande le temps de la traiter et de gérer un éventuel retour, puis au maximum 3 ans
            pour notre comptabilité. Vous pouvez demander leur suppression avant, voir ci-dessous.
          </p>
        </Bloc>

        <Bloc id="suppression-des-donnees" titre="Supprimer vos données">
          <p>Pour que nous supprimions vos données personnelles :</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>
              écrivez à <a href={`mailto:${CONTACT_EMAIL}?subject=Suppression%20de%20mes%20donn%C3%A9es`} className="text-brand-accent hover:underline">{CONTACT_EMAIL}</a>{' '}
              avec l'objet « Suppression de mes données » ;
            </li>
            <li>indiquez le numéro de téléphone utilisé pour la commande ;</li>
            <li>nous supprimons vos données et vous le confirmons sous 30 jours.</li>
          </ol>
          <p>Vous pouvez aussi, à tout moment, demander à ne plus recevoir nos messages WhatsApp.</p>
        </Bloc>

        <Bloc titre="Vos droits et contact">
          <p>
            Vous pouvez demander à consulter, corriger ou supprimer vos données en écrivant à{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-accent hover:underline">{CONTACT_EMAIL}</a>.
          </p>
        </Bloc>
      </main>
    </div>
  )
}
