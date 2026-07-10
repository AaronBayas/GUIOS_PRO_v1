// Motor de cálculo GUIOSAD v2
// Implementa diferencias respecto a la tesis original (Sánchez, 2022)
// Corrección aplicada: IR calculada mediante matriz discreta, no por promedio ponderado,
// para respetar la lógica de combinación tipo Figura 5.10.


// ── NIVELES DE IMPORTANCIA ───────────────────────────────────
export const LEVELS = ['Irrelevante', 'Opcional', 'Importante', 'Fundamental'] as const
export type NivelImportancia = typeof LEVELS[number]


// - calcularIR(3, 2) => Opcional

const IR_MATRIX: NivelImportancia[][] = [
  ['Irrelevante', 'Irrelevante', 'Opcional',   'Opcional'],
  ['Irrelevante', 'Opcional',    'Opcional',   'Importante'],
  ['Opcional',    'Opcional',    'Importante', 'Importante'],
  ['Opcional',    'Importante',  'Importante', 'Fundamental'],
]

export function calcularIR(is: number, id: number): NivelImportancia {
  if (!Number.isInteger(is) || !Number.isInteger(id)) {
    throw new Error('IS e ID deben ser enteros')
  }

  if (is < 1 || is > 4 || id < 1 || id > 4) {
    throw new Error('IS e ID deben estar en el rango 1..4')
  }

  return IR_MATRIX[id - 1][is - 1]
}

export function esRelevante(irLabel: NivelImportancia): boolean {
  return LEVELS.indexOf(irLabel) >= 1 // >= Opcional
}


// ── CÁLCULO PM: PONDERACIÓN MEDIA PONDERADA ─────────────────
// Subfactores críticos: coeff = 1.5 | No críticos: coeff = 1.0
export interface SubfactorInput {
  peso: number // 1–4
  es_critico: boolean
}

export function calcularPM(subfactores: SubfactorInput[]): number {
  if (!subfactores.length) return 0

  const sumPesos = subfactores.reduce(
    (acc, s) => acc + s.peso * (s.es_critico ? 1.5 : 1.0), 0
  )

  const sumCoeffs = subfactores.reduce(
    (acc, s) => acc + (s.es_critico ? 1.5 : 1.0), 0
  )

  return parseFloat((sumPesos / sumCoeffs).toFixed(2))
}


// ── UMBRALES FODA DIFERENCIADOS POR DIMENSIÓN ───────────────
// Diferencia respecto a tesis: umbrales fijos → diferenciados por dimensión
const UMBRALES: Record<string, number> = {
  Tecnológica: 3.0,
  Organizacional: 3.0,
  Económica: 3.0,
}

export function getUmbral(dimensionName: string): number {
  return UMBRALES[dimensionName] ?? 3.0
}


// ── CLASIFICACIÓN FODA ───────────────────────────────────────
export type ClasifFoda = 'Fortaleza' | 'Oportunidad' | 'Debilidad' | 'Amenaza'

export function clasificarFoda(
  pm: number,
  alcance: 'Interno' | 'Externo',
  umbral: number
): ClasifFoda {
  if (alcance === 'Interno') return pm >= umbral ? 'Fortaleza' : 'Debilidad'
  return pm >= umbral ? 'Oportunidad' : 'Amenaza'
}


// Factores tipo "Ambos": genera dos clasificaciones, retorna la más desfavorable
export function clasificarFodaAmbos(pm: number, umbral: number) {
  const interno = clasificarFoda(pm, 'Interno', umbral)
  const externo = clasificarFoda(pm, 'Externo', umbral)

  const ranking: ClasifFoda[] = ['Fortaleza', 'Oportunidad', 'Debilidad', 'Amenaza']
  const final = ranking.indexOf(interno) > ranking.indexOf(externo) ? interno : externo

  return { interno, externo, final }
}


// ── RISK SCORE Y RECOMENDACIÓN FINAL ────────────────────────
const IR_PESO: Record<NivelImportancia, number> = {
  Irrelevante: 0,
  Opcional: 1,
  Importante: 2,
  Fundamental: 3,
}

const FODA_PENALIDAD: Record<ClasifFoda, number> = {
  Fortaleza: 0,
  Oportunidad: 0,
  Debilidad: 1,
  Amenaza: 2,
}

export interface FactorResultado {
  ir: NivelImportancia
  foda: ClasifFoda
}

export function calcularRiskScore(factores: FactorResultado[]): number {
  return factores.reduce((acc, f) => {
    return acc + (IR_PESO[f.ir] * FODA_PENALIDAD[f.foda])
  }, 0)
}

export function calcularRecomendacion(riskScore: number): 'A' | 'B' | 'C' {
  if (riskScore === 0) return 'A'
  if (riskScore >= 1 && riskScore <= 4) return 'B'
  return 'C'
}


// ── DESCRIPCIÓN DE RECOMENDACIÓN ────────────────────────────
export function getDescripcionRecomendacion(
  rec: 'A' | 'B' | 'C',
  softwareNombre: string
): string {
  const descripciones = {
    A: `${softwareNombre} presenta un perfil FODA favorable para su adopción. No se detectaron debilidades o amenazas significativas en factores críticos. Se recomienda proceder con la adopción, elaborando un plan de implementación por fases que capitalice las fortalezas identificadas.`,
    B: `${softwareNombre} presenta condiciones aceptables para su adopción con reservas. Se detectaron algunas debilidades o amenazas en factores de importancia moderada que deben gestionarse. Se recomienda elaborar un plan de mitigación de riesgos antes de proceder, estableciendo hitos de revisión durante la implementación.`,
    C: `${softwareNombre} presenta riesgos significativos que desaconsejan su adopción inmediata. Se detectaron debilidades o amenazas importantes en factores críticos. Se recomienda no adoptar en este momento, reevaluar en 6-12 meses cuando el software haya madurado, o explorar alternativas con mejor perfil de riesgo.`,
  }

  return descripciones[rec]
}