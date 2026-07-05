// ── TIPOS COMPARTIDOS GUIOS PRO v2 ───────────────────────────

export type TipoImpacto = 'Interno' | 'Externo' | 'Ambos'
export type EvaluacionEstado = 'Borrador' | 'En_progreso' | 'Completada' | 'Archivada'
export type Recomendacion = 'A' | 'B' | 'C'
export type ClasificacionFoda = 'Fortaleza' | 'Oportunidad' | 'Debilidad' | 'Amenaza'
export type NivelImportancia = 'Irrelevante' | 'Opcional' | 'Importante' | 'Fundamental'
export type TipoSoftware = 'ERP' | 'CMS' | 'CRM' | 'IDE' | 'SGBD' | 'Ofimatica' | 'Seguridad' | 'Infraestructura' | 'Comunicaciones' | 'Analitica' | 'Otro'

export interface Rol {
  rol_id: number
  rol_name: string
}

export interface Usuario {
  usuario_id: number
  usuario_name: string
  email: string
  rol: string
  activo?: boolean
  created_at?: string
}

export interface Dimension {
  dimension_id: number
  dimension_name: string
  orden: number
}

export interface Subfactor {
  subfactor_id: number
  factor_id: number
  subfactor_name: string
  es_critico: boolean
  descripcion?: string
  orden: number
  activo: boolean
}

export interface Factor {
  factor_id: number
  dimension_id: number
  factor_name: string
  tipo_impacto: TipoImpacto
  importancia_sugerida: number
  descripcion?: string
  activo: boolean
  version_actual: number
  orden: number
  dimension: Dimension
  subfactores: Subfactor[]
}

export interface EvaluacionSubfactor {
  esubfactor_id: number
  efactor_id: number
  subfactor_id: number
  peso: number | null
  subfactor: Subfactor
}

export interface EvaluacionFactor {
  efactor_id: number
  evaluacion_id: number
  factor_id: number
  importancia_decisor: number | null
  importancia_relativa: NivelImportancia | null
  ponderacion_media: number | null
  clasificacion_foda: ClasificacionFoda | null
  foda_interno: ClasificacionFoda | null
  foda_externo: ClasificacionFoda | null
  alcance_override: TipoImpacto | null
  completado: boolean
  factor: Factor
  evaluacion_subfactores: EvaluacionSubfactor[]
}

export interface AIRecomendacion {
  ai_rec_id: number
  evaluacion_id: number
  modelo_usado: string
  respuesta_texto: string
  tokens_usados?: number
  estado: string
  created_at: string
}

export interface HistorialCambio {
  historial_id: number
  evaluacion_id: number
  tipo_cambio: string
  descripcion?: string
  created_at: string
}

export interface Evaluacion {
  evaluacion_id: number
  usuario_id: number
  software_nombre: string
  software_version?: string
  software_tipo: TipoSoftware
  software_sitio_web?: string
  software_licencia?: string
  software_descripcion?: string
  organizacion_nombre?: string
  organizacion_sector?: string
  evaluador_nombre?: string
  contexto_evaluacion?: string
  estado: EvaluacionEstado
  paso_actual: number
  recomendacion?: Recomendacion
  risk_score?: number
  fecha_creacion: string
  fecha_limite?: string
  ultimo_guardado: string
  created_at: string
  updated_at: string
  usuario?: { usuario_name: string; email: string }
  evaluacion_factores: EvaluacionFactor[]
  ai_recomendacion?: AIRecomendacion
  _count?: { evaluacion_factores: number }
}

export interface DashboardStats {
  total: number
  completadas: number
  enProgreso: number
  archivadas: number
  recientes: Evaluacion[]
}

export interface CalcResult {
  riskScore: number
  recomendacion: Recomendacion
  descripcion: string
  resultados: { ir: string; foda: string }[]
}

export const FODA_COLORS: Record<ClasificacionFoda, string> = {
  Fortaleza: '#1A6B48',
  Oportunidad: '#2D5BE3',
  Debilidad: '#92580A',
  Amenaza: '#B52020',
}

export const FODA_BG: Record<ClasificacionFoda, string> = {
  Fortaleza: '#E8F5EE',
  Oportunidad: '#EBF0FD',
  Debilidad: '#FDF3E3',
  Amenaza: '#FDECEA',
}

export const IMPORTANCIA_LABELS = ['Irrelevante', 'Opcional', 'Importante', 'Fundamental']

export const TIPOS_SOFTWARE: TipoSoftware[] = [
  'ERP', 'CMS', 'CRM', 'IDE', 'SGBD', 'Ofimatica',
  'Seguridad', 'Infraestructura', 'Comunicaciones', 'Analitica', 'Otro'
]

export const DIMENSION_COLORS: Record<string, { text: string; bg: string; badge: string }> = {
  'Tecnológica':    { text: '#5C3D9E', bg: '#F0EBF9', badge: 'badge-tec' },
  'Organizacional': { text: '#0F766E', bg: '#E6F4F4', badge: 'badge-org' },
  'Económica':      { text: '#92580A', bg: '#FDF3E3', badge: 'badge-eco' },
}
