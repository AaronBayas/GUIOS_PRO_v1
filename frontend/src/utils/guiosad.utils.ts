// Utility functions mirroring the backend GUIOSAD engine
// For real-time frontend calculations

export const LEVELS = ['Irrelevante', 'Opcional', 'Importante', 'Fundamental'] as const
export type NivelImportancia = typeof LEVELS[number]

export function calcularIR(is: number, id: number): NivelImportancia {
  const isIdx = is - 1
  const idIdx = id - 1
  const irScore = (isIdx * 0.60) + (idIdx * 0.40)
  const irIdx = Math.round(irScore)
  return LEVELS[Math.min(irIdx, 3)]
}

export function esRelevante(ir: NivelImportancia): boolean {
  return LEVELS.indexOf(ir) >= 1
}

export function calcularPM(subfactores: { peso: number; es_critico: boolean }[]): number {
  if (!subfactores.length) return 0
  const sumPesos = subfactores.reduce((acc, s) => acc + s.peso * (s.es_critico ? 1.5 : 1.0), 0)
  const sumCoeffs = subfactores.reduce((acc, s) => acc + (s.es_critico ? 1.5 : 1.0), 0)
  return parseFloat((sumPesos / sumCoeffs).toFixed(2))
}

export const UMBRALES: Record<string, number> = {
  'Tecnológica': 2.8,
  'Organizacional': 3.0,
  'Económica': 3.2,
}

export function getUmbral(dimensionName: string): number {
  return UMBRALES[dimensionName] ?? 3.0
}

export type ClasifFoda = 'Fortaleza' | 'Oportunidad' | 'Debilidad' | 'Amenaza'

export function clasificarFoda(pm: number, alcance: 'Interno' | 'Externo', umbral: number): ClasifFoda {
  if (alcance === 'Interno') return pm >= umbral ? 'Fortaleza' : 'Debilidad'
  return pm >= umbral ? 'Oportunidad' : 'Amenaza'
}

export function calcularRiskScore(factores: { ir: string; foda: ClasifFoda }[]): number {
  const IR_PESO: Record<string, number> = { Opcional: 1, Importante: 2, Fundamental: 3 }
  const FODA_PEN: Record<string, number> = { Fortaleza: 0, Oportunidad: 0, Debilidad: 1, Amenaza: 2 }
  return factores.reduce((acc, f) => acc + ((IR_PESO[f.ir] ?? 0) * (FODA_PEN[f.foda] ?? 0)), 0)
}

export function calcularRecomendacion(riskScore: number): 'A' | 'B' | 'C' {
  if (riskScore === 0) return 'A'
  if (riskScore <= 4) return 'B'
  return 'C'
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 10) return 'ahora mismo'
  if (diff < 60) return `hace ${diff} segundos`
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} minutos`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} horas`
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function getImportanciaClass(ir: string): string {
  const map: Record<string, string> = {
    Irrelevante: 'badge-irrelevante',
    Opcional: 'badge-opcional',
    Importante: 'badge-importante',
    Fundamental: 'badge-fundamental',
  }
  return map[ir] || 'badge-irrelevante'
}

export function getFodaClass(foda: string): string {
  const map: Record<string, string> = {
    Fortaleza: 'badge-F',
    Oportunidad: 'badge-O',
    Debilidad: 'badge-D',
    Amenaza: 'badge-A',
  }
  return map[foda] || ''
}

export function getEstadoClass(estado: string): string {
  const map: Record<string, string> = {
    Borrador: 'badge-borrador',
    En_progreso: 'badge-en-progreso',
    Completada: 'badge-completada',
    Archivada: 'badge-archivada',
  }
  return map[estado] || 'badge-borrador'
}

export function getRecClass(rec: string): string {
  const map: Record<string, string> = { A: 'badge-rec-A', B: 'badge-rec-B', C: 'badge-rec-C' }
  return map[rec] || ''
}

export function getEstadoLabel(estado: string): string {
  const map: Record<string, string> = {
    Borrador: 'Borrador',
    En_progreso: 'En progreso',
    Completada: 'Completada',
    Archivada: 'Archivada',
  }
  return map[estado] || estado
}
