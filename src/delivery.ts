// 58 wilayas d'Algérie (code + nom)
export const WILAYAS = [
  { code: '01', name: 'Adrar' },
  { code: '02', name: 'Chlef' },
  { code: '03', name: 'Laghouat' },
  { code: '04', name: 'Oum El Bouaghi' },
  { code: '05', name: 'Batna' },
  { code: '06', name: 'Béjaïa' },
  { code: '07', name: 'Biskra' },
  { code: '08', name: 'Béchar' },
  { code: '09', name: 'Blida' },
  { code: '10', name: 'Bouira' },
  { code: '11', name: 'Tamanrasset' },
  { code: '12', name: 'Tébessa' },
  { code: '13', name: 'Tlemcen' },
  { code: '14', name: 'Tiaret' },
  { code: '15', name: 'Tizi Ouzou' },
  { code: '16', name: 'Alger' },
  { code: '17', name: 'Djelfa' },
  { code: '18', name: 'Jijel' },
  { code: '19', name: 'Sétif' },
  { code: '20', name: 'Saïda' },
  { code: '21', name: 'Skikda' },
  { code: '22', name: 'Sidi Bel Abbès' },
  { code: '23', name: 'Annaba' },
  { code: '24', name: 'Guelma' },
  { code: '25', name: 'Constantine' },
  { code: '26', name: 'Médéa' },
  { code: '27', name: 'Mostaganem' },
  { code: '28', name: "M'Sila" },
  { code: '29', name: 'Mascara' },
  { code: '30', name: 'Ouargla' },
  { code: '31', name: 'Oran' },
  { code: '32', name: 'El Bayadh' },
  { code: '33', name: 'Illizi' },
  { code: '34', name: 'Bordj Bou Arréridj' },
  { code: '35', name: 'Boumerdès' },
  { code: '36', name: 'El Tarf' },
  { code: '37', name: 'Tindouf' },
  { code: '38', name: 'Tissemsilt' },
  { code: '39', name: 'El Oued' },
  { code: '40', name: 'Khenchela' },
  { code: '41', name: 'Souk Ahras' },
  { code: '42', name: 'Tipaza' },
  { code: '43', name: 'Mila' },
  { code: '44', name: "Aïn Defla" },
  { code: '45', name: 'Naâma' },
  { code: '46', name: "Aïn Témouchent" },
  { code: '47', name: 'Ghardaïa' },
  { code: '48', name: 'Relizane' },
  { code: '49', name: "El M'Ghair" },
  { code: '50', name: 'El Meniaa' },
  { code: '51', name: 'Ouled Djellal' },
  { code: '52', name: 'Bordj Badji Mokhtar' },
  { code: '53', name: 'Béni Abbès' },
  { code: '54', name: 'Timimoun' },
  { code: '55', name: 'Touggourt' },
  { code: '56', name: 'Djanet' },
  { code: '57', name: 'In Salah' },
  { code: '58', name: 'In Guezzam' },
] as const

export type WilayaCode = (typeof WILAYAS)[number]['code']

export interface DeliveryPricesByWilaya {
  domicile: number
  yalidine: number
}

export type DeliveryPrices = Record<string, DeliveryPricesByWilaya>

// Tarifs par défaut (départ Alger), -100 DA sur tarif de base : à domicile / stop-desk (Yalidine)
const DEFAULT_DELIVERY_PRICES: DeliveryPrices = {
  '16': { domicile: 490, yalidine: 350 },   // Alger (Zone 0)
  '09': { domicile: 600, yalidine: 450 },   // Blida (Zone 1)
  '35': { domicile: 600, yalidine: 450 },   // Boumerdès (Zone 1)
  '42': { domicile: 600, yalidine: 450 },   // Tipaza (Zone 1)
  '02': { domicile: 800, yalidine: 550 },  // Chlef
  '03': { domicile: 800, yalidine: 550 },  // Laghouat
  '04': { domicile: 800, yalidine: 550 },  // Oum El Bouaghi
  '05': { domicile: 800, yalidine: 550 },  // Batna
  '06': { domicile: 800, yalidine: 550 },  // Béjaïa
  '07': { domicile: 800, yalidine: 550 },  // Biskra
  '10': { domicile: 800, yalidine: 550 },  // Bouira
  '12': { domicile: 800, yalidine: 550 },  // Tébessa
  '13': { domicile: 800, yalidine: 550 },  // Tlemcen
  '14': { domicile: 800, yalidine: 550 },  // Tiaret
  '15': { domicile: 800, yalidine: 550 },  // Tizi Ouzou
  '17': { domicile: 800, yalidine: 550 },  // Djelfa
  '18': { domicile: 800, yalidine: 550 },  // Jijel
  '19': { domicile: 800, yalidine: 550 },  // Sétif
  '20': { domicile: 800, yalidine: 550 },  // Saïda
  '21': { domicile: 800, yalidine: 550 },  // Skikda
  '22': { domicile: 800, yalidine: 550 },  // Sidi Bel Abbès
  '23': { domicile: 800, yalidine: 550 },  // Annaba
  '24': { domicile: 800, yalidine: 550 },  // Guelma
  '25': { domicile: 800, yalidine: 550 },  // Constantine
  '26': { domicile: 800, yalidine: 550 },  // Médéa
  '27': { domicile: 800, yalidine: 550 },  // Mostaganem
  '28': { domicile: 800, yalidine: 550 },  // M'Sila
  '29': { domicile: 800, yalidine: 550 },  // Mascara
  '30': { domicile: 800, yalidine: 550 },  // Ouargla
  '31': { domicile: 800, yalidine: 550 },  // Oran
  '34': { domicile: 800, yalidine: 550 },  // Bordj Bou Arréridj
  '36': { domicile: 800, yalidine: 550 },  // El Tarf
  '38': { domicile: 800, yalidine: 550 },  // Tissemsilt
  '39': { domicile: 800, yalidine: 550 },  // El Oued
  '40': { domicile: 800, yalidine: 550 },  // Khenchela
  '41': { domicile: 800, yalidine: 550 },  // Souk Ahras
  '43': { domicile: 800, yalidine: 550 },  // Mila
  '44': { domicile: 800, yalidine: 550 },  // Aïn Defla
  '46': { domicile: 800, yalidine: 550 },  // Aïn Témouchent
  '47': { domicile: 800, yalidine: 550 },  // Ghardaïa
  '48': { domicile: 800, yalidine: 550 },  // Relizane
  '32': { domicile: 950, yalidine: 750 },  // El Bayadh (Zone 4)
  '33': { domicile: 950, yalidine: 750 },  // Illizi
  '45': { domicile: 950, yalidine: 750 },  // Naâma
  '49': { domicile: 950, yalidine: 750 },  // El M'Ghair
  '50': { domicile: 950, yalidine: 750 },  // El Meniaa
  '51': { domicile: 950, yalidine: 750 },  // Ouled Djellal
  '53': { domicile: 950, yalidine: 750 },  // Béni Abbès
  '54': { domicile: 950, yalidine: 750 },  // Timimoun
  '55': { domicile: 950, yalidine: 750 },  // Touggourt
  '01': { domicile: 950, yalidine: 750 },  // Adrar (Zone 4)
  '08': { domicile: 950, yalidine: 750 },  // Béchar
  '37': { domicile: 950, yalidine: 750 },  // Tindouf
  '11': { domicile: 1500, yalidine: 1300 }, // Tamanrasset (Zone 5)
  '52': { domicile: 1500, yalidine: 1300 }, // Bordj Badji Mokhtar
  '56': { domicile: 1500, yalidine: 1300 }, // Djanet
  '57': { domicile: 1500, yalidine: 1300 }, // In Salah
  '58': { domicile: 1500, yalidine: 1300 }, // In Guezzam
}

const DELIVERY_KEY = 'protecphone_delivery_prices'

export function getDeliveryPrices(): DeliveryPrices {
  try {
    const raw = localStorage.getItem(DELIVERY_KEY)
    const stored: DeliveryPrices = raw ? JSON.parse(raw) : {}
    // Fusion : valeurs enregistrées par l'admin priment, sinon défaut
    const result: DeliveryPrices = {}
    for (const w of WILAYAS) {
      result[w.code] = {
        domicile: stored[w.code]?.domicile ?? DEFAULT_DELIVERY_PRICES[w.code]?.domicile ?? 0,
        yalidine: stored[w.code]?.yalidine ?? DEFAULT_DELIVERY_PRICES[w.code]?.yalidine ?? 0,
      }
    }
    return result
  } catch {
    return { ...DEFAULT_DELIVERY_PRICES }
  }
}

export function saveDeliveryPrices(prices: DeliveryPrices): void {
  localStorage.setItem(DELIVERY_KEY, JSON.stringify(prices))
}

export function getDeliveryPriceForWilaya(
  wilayaCode: string,
  type: 'domicile' | 'yalidine',
): number {
  const prices = getDeliveryPrices()
  const w = prices[wilayaCode]
  return w ? w[type] : DEFAULT_DELIVERY_PRICES[wilayaCode]?.[type] ?? 0
}

export function getWilayaName(wilayaCode: string): string {
  const w = WILAYAS.find((x) => x.code === wilayaCode)
  return w ? w.name : wilayaCode
}
