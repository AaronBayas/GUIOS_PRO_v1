// Motor de cálculo GUIOSAD v2
// Implementa las diferencias respecto a la tesis original (Sánchez, 2022)

// ── NIVELES DE IMPORTANCIA ───────────────────────────────────
export const LEVELS = ['Irrelevante', 'Opcional', 'Importante', 'Fundamental'] as const
export type NivelImportancia = typeof LEVELS[number]

// ── CÁLCULO IR: IMPORTANCIA RELATIVA ────────────────────────
// Peso 60% IS (científica) / 40% ID (decisor) — diferencia respecto a tesis (50/50)
export function calcularIR(is: number, id: number): NivelImportancia {
  const isIdx = is - 1   // convierte 1-4 a índice 0-3
  const idIdx = id - 1
  const irScore = (isIdx * 0.60) + (idIdx * 0.40)
  const irIdx = Math.round(irScore)
  return LEVELS[Math.min(irIdx, 3)]
}

export function esRelevante(irLabel: NivelImportancia): boolean {
  return LEVELS.indexOf(irLabel) >= 1 // >= Opcional
}

// ── CÁLCULO PM: PONDERACIÓN MEDIA PONDERADA ─────────────────
// Subfactores críticos: coeff = 1.5 | No críticos: coeff = 1.0
export interface SubfactorInput {
  peso: number        // 1–4
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
  'Tecnológica': 2.8,
  'Organizacional': 3.0,
  'Económica': 3.2,
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
const IR_PESO: Record<string, number> = {
  Opcional: 1,
  Importante: 2,
  Fundamental: 3
}

const FODA_PENALIDAD: Record<string, number> = {
  Fortaleza: 0,
  Oportunidad: 0,
  Debilidad: 1,
  Amenaza: 2
}

export interface FactorResultado {
  ir: string
  foda: ClasifFoda
}

export function calcularRiskScore(factores: FactorResultado[]): number {
  return factores.reduce((acc, f) => {
    return acc + ((IR_PESO[f.ir] ?? 0) * (FODA_PENALIDAD[f.foda] ?? 0))
  }, 0)
}

export function calcularRecomendacion(riskScore: number): 'A' | 'B' | 'C' {
  if (riskScore === 0) return 'A'
  if (riskScore >= 1 && riskScore <= 4) return 'B'
  return 'C'
}

// ── DESCRIPCIÓN DE RECOMENDACIÓN ────────────────────────────
export function getDescripcionRecomendacion(rec: 'A' | 'B' | 'C', softwareNombre: string): string {
  const descripciones = {
    A: `${softwareNombre} presenta un perfil FODA favorable para su adopción. No se detectaron debilidades o amenazas significativas en factores críticos. Se recomienda proceder con la adopción, elaborando un plan de implementación por fases que capitalice las fortalezas identificadas.`,
    B: `${softwareNombre} presenta condiciones aceptables para su adopción con reservas. Se detectaron algunas debilidades o amenazas en factores de importancia moderada que deben gestionarse. Se recomienda elaborar un plan de mitigación de riesgos antes de proceder, estableciendo hitos de revisión durante la implementación.`,
    C: `${softwareNombre} presenta riesgos significativos que desaconsejan su adopción inmediata. Se detectaron debilidades o amenazas importantes en factores críticos. Se recomienda no adoptar en este momento, reevaluar en 6-12 meses cuando el software haya madurado, o explorar alternativas con mejor perfil de riesgo.`,
  }
  return descripciones[rec]
}
