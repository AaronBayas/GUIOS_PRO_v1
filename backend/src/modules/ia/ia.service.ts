import { FastifyInstance } from 'fastify'
import { prisma } from '../../config/database'
import { getDescripcionRecomendacion } from '../calculos/guiosad.engine'

// ── Rotación de API keys con fallback ─────────────────────────
const AI_KEYS: string[] = (process.env.AI_API_KEYS || process.env.AI_API_KEY || '')
  .split(',')
  .map(k => k.trim())
  .filter(Boolean)

let currentKeyIndex = 0

function getNextKey(): string | null {
  if (AI_KEYS.length === 0) return null
  const key = AI_KEYS[currentKeyIndex % AI_KEYS.length]
  return key
}

function rotateKey() {
  currentKeyIndex = (currentKeyIndex + 1) % AI_KEYS.length
}

// ── Tipos internos ─────────────────────────────────────────────
type EvaluacionForIA = {
  software_nombre: string
  recomendacion: string | null
  risk_score: number | null
  evaluacion_factores: {
    factor: { factor_name: string; dimension: { dimension_name: string } }
    clasificacion_foda: string | null
    importancia_relativa: string | null
    ponderacion_media: number | null
  }[]
}

export async function iaRouter(fastify: FastifyInstance) {
  // POST /api/ia/analizar/:evaluacionId — Generar análisis cualitativo
  fastify.post('/analizar/:evaluacionId', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { evaluacionId } = req.params as { evaluacionId: string }
    const evalId = parseInt(evaluacionId)

    const evaluacion = await prisma.evaluacion.findUnique({
      where: { evaluacion_id: evalId },
      include: {
        evaluacion_factores: {
          where: { completado: true },
          include: {
            factor: { include: { dimension: true } },
          },
        },
      },
    })

    if (!evaluacion) return reply.status(404).send({ error: 'Evaluación no encontrada' })

    // Verificar que tenga factores evaluados
    const factoresCompletos = evaluacion.evaluacion_factores.filter(ef => ef.completado)
    if (factoresCompletos.length === 0) {
      return reply.status(400).send({ error: 'La evaluación no tiene factores completados. Finaliza la evaluación primero.' })
    }
    const existing = await prisma.aIRecomendacion.findUnique({ where: { evaluacion_id: evalId } })
    if (existing) return reply.send({ ai: existing })

    // Intentar con IA — rotando keys en caso de fallo
    let respuestaTexto: string
    let modeloUsado: string

    const iaResult = await callAIWithFallback(evaluacion)

    if (iaResult) {
      respuestaTexto = iaResult.text
      modeloUsado = iaResult.model
    } else {
      // Análisis local de alta calidad si todas las keys fallan
      respuestaTexto = generateProfessionalLocalAnalysis(evaluacion)
      modeloUsado = 'guios-local-v3'
    }

    const aiRec = await prisma.aIRecomendacion.create({
      data: {
        evaluacion_id: evalId,
        modelo_usado: modeloUsado,
        respuesta_texto: respuestaTexto,
        estado: 'completado',
      },
    })

    return reply.send({ ai: aiRec })
  })

  // POST /api/ia/regenerar/:evaluacionId — Forzar regeneración del análisis
  fastify.post('/regenerar/:evaluacionId', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { evaluacionId } = req.params as { evaluacionId: string }
    const evalId = parseInt(evaluacionId)

    const evaluacion = await prisma.evaluacion.findUnique({
      where: { evaluacion_id: evalId },
      include: {
        evaluacion_factores: {
          where: { completado: true },
          include: { factor: { include: { dimension: true } } },
        },
      },
    })

    if (!evaluacion) return reply.status(404).send({ error: 'Evaluación no encontrada' })

    const factoresCompletos = evaluacion.evaluacion_factores.filter(ef => ef.completado)
    if (factoresCompletos.length === 0) {
      return reply.status(400).send({ error: 'La evaluación no tiene factores completados.' })
    }

    // Eliminar análisis previo si existe
    await prisma.aIRecomendacion.deleteMany({ where: { evaluacion_id: evalId } })

    const iaResult = await callAIWithFallback(evaluacion)
    const respuestaTexto = iaResult ? iaResult.text : generateProfessionalLocalAnalysis(evaluacion)
    const modeloUsado = iaResult ? iaResult.model : 'guios-local-v3'

    const aiRec = await prisma.aIRecomendacion.create({
      data: {
        evaluacion_id: evalId,
        modelo_usado: modeloUsado,
        respuesta_texto: respuestaTexto,
        estado: 'completado',
      },
    })

    return reply.send({ ai: aiRec })
  })
}

// ── Llamada a NVIDIA API con rotación de keys ────────────
async function callAIWithFallback(evaluacion: EvaluacionForIA): Promise<{ text: string; model: string } | null> {
  if (AI_KEYS.length === 0) return null

  const prompt = buildProfessionalPrompt(evaluacion)
  const aiModel = process.env.AI_MODEL || 'meta/llama-3.1-8b-instruct'

  const maxAttempts = Math.min(2, AI_KEYS.length)
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const key = getNextKey()
    if (!key) break

    try {
      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          model: aiModel,
          messages: [
            {
              role: 'system',
              content: 'Eres un consultor senior especializado en adopción de software libre (FLOSS) y transformación digital institucional. Tu análisis debe ser riguroso, profesional y orientado a la toma de decisiones ejecutivas.',
            },
            { role: 'user', content: prompt },
          ],
          max_tokens: 1024,
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(15000), // 15s timeout
      })

      if (!response.ok) {
        rotateKey()
        continue
      }

      const data = await response.json() as { choices?: { message?: { content?: string } }[] }
      const text = data?.choices?.[0]?.message?.content

      if (!text) {
        rotateKey()
        continue
      }

      return { text, model: `${aiModel} (NVIDIA)` }
    } catch {
      rotateKey()
    }
  }

  return null
}

// ── Prompt profesional enriquecido ─────────────────────────────
function buildProfessionalPrompt(evaluacion: EvaluacionForIA): string {
  const fortalezas = evaluacion.evaluacion_factores.filter(f => f.clasificacion_foda === 'Fortaleza')
  const oportunidades = evaluacion.evaluacion_factores.filter(f => f.clasificacion_foda === 'Oportunidad')
  const debilidades = evaluacion.evaluacion_factores.filter(f => f.clasificacion_foda === 'Debilidad')
  const amenazas = evaluacion.evaluacion_factores.filter(f => f.clasificacion_foda === 'Amenaza')

  const formatFactores = (items: typeof fortalezas) =>
    items.map(f => `  • ${f.factor.factor_name} (PM: ${f.ponderacion_media?.toFixed(2) ?? 'N/A'}, Dimensión: ${f.factor.dimension.dimension_name})`).join('\n') || '  • Ninguno'

  const recLabel = evaluacion.recomendacion === 'A' ? 'A — Adopción Recomendada' :
                   evaluacion.recomendacion === 'B' ? 'B — Adopción Condicionada' :
                   'C — Adopción No Recomendada'

  return `Actúas como un consultor experto en FLOSS. 
Evalúa el software ${evaluacion.software_nombre} (Puntaje de Riesgo acumulado: ${evaluacion.risk_score ?? 'N/A'} puntos, Recomendación: ${recLabel}).

A continuación se detallan los resultados de la evaluación:
FORTALEZAS (${fortalezas.length}):
${formatFactores(fortalezas)}
OPORTUNIDADES (${oportunidades.length}):
${formatFactores(oportunidades)}
DEBILIDADES (${debilidades.length}):
${formatFactores(debilidades)}
AMENAZAS (${amenazas.length}):
${formatFactores(amenazas)}

INSTRUCCIÓN CRÍTICA:
Debes generar tu respuesta estrictamente en el siguiente formato, utilizando información 100% real basada EXCLUSIVAMENTE en los resultados listados arriba. No inventes datos.

<RESUMEN>
Genera un resumen ejecutivo breve y directo de entre 90 y 100 palabras. No uses emojis ni viñetas.
</RESUMEN>

<DETALLE>
Genera un análisis y recomendación detallada y profesional (3-4 párrafos) explicando el porqué de la recomendación basándote en las debilidades/amenazas críticas (si las hay) o en las fortalezas clave. Incluye recomendaciones accionables y precisas basadas en los resultados. Usa lenguaje formal, técnico y orientado a directivos de TI. No uses emojis.
</DETALLE>`
}

// ── Análisis local de alta calidad (fallback) ─────────────────
function generateProfessionalLocalAnalysis(evaluacion: EvaluacionForIA): string {
  const rec = evaluacion.recomendacion || 'B'
  const fortalezas = evaluacion.evaluacion_factores.filter(f => f.clasificacion_foda === 'Fortaleza').length
  const debilidades = evaluacion.evaluacion_factores.filter(f => f.clasificacion_foda === 'Debilidad').length
  const riskScore = evaluacion.risk_score ?? 0

  let resumen = ''
  let detalle = ''

  if (rec === 'A') {
    resumen = `La evaluación de ${evaluacion.software_nombre} revela un perfil altamente favorable con un puntaje de riesgo de ${riskScore} puntos. Con una sólida base de ${fortalezas} fortalezas clave frente a mínimos factores de riesgo, la organización posee la madurez tecnológica y operativa necesaria. Se recomienda proceder con la adopción inmediata, capitalizando las ventajas estratégicas documentadas para asegurar una transición eficiente y alineada con los objetivos institucionales de transformación digital.`
    detalle = `El proceso de evaluación contempló factores clave tecnológicos, organizacionales y económicos, arrojando un perfil robusto para la adopción de ${evaluacion.software_nombre}. Las ${fortalezas} fortalezas identificadas representan ventajas competitivas consolidadas. Se sugiere documentar las prácticas actuales relativas a estos factores y utilizarlas como base principal para la fase de implementación.\n\nTras el análisis exhaustivo, el bajo nivel de riesgo (${riskScore} puntos) indica que la organización cuenta con las capacidades técnicas y económicas necesarias para implementar con éxito este software, sin requerir mitigaciones extensas.\n\nDecisión: Proceder con la adopción inmediata.`
  } else if (rec === 'B') {
    resumen = `El análisis de ${evaluacion.software_nombre} indica un escenario de adopción condicionada (puntaje de riesgo acumulado: ${riskScore} puntos). Aunque existen capacidades organizacionales rescatables, se han detectado ${debilidades} vulnerabilidades internas que podrían comprometer la estabilidad del proyecto. Es imperativo no iniciar el despliegue en producción hasta ejecutar un plan de mitigación focalizado que resuelva las deficiencias técnicas y de procesos. Se sugiere una reevaluación tras aplicar las medidas correctivas pertinentes.`
    detalle = `El análisis estructural de ${evaluacion.software_nombre} evidencia un escenario de adopción viable pero condicionada. Aunque existen fortalezas operativas, el riesgo acumulado de ${riskScore} puntos señala vulnerabilidades críticas (incluyendo ${debilidades} debilidades directas) que deben ser abordadas urgentemente.\n\nPlan de Mitigación Recomendado:\n- Constituir un equipo de trabajo responsable para un diagnóstico detallado.\n- Elaborar un plan de mejora técnica a corto plazo con indicadores medibles para cada debilidad y amenaza detectada.\n- Implementar un monitoreo continuo de los factores externos para establecer alternativas de contingencia.\n\nDecisión: Adopción condicionada a la resolución del plan de mitigación.`
  } else {
    resumen = `Los resultados de la evaluación concluyen que la organización no cuenta actualmente con las condiciones óptimas para adoptar ${evaluacion.software_nombre}, reflejando un riesgo crítico de ${riskScore} puntos. La severidad de las debilidades y amenazas identificadas supera el umbral de tolerancia aceptable para una implementación segura. Se aconseja descartar o posponer esta adopción, priorizando el fortalecimiento de la infraestructura base y la exploración de alternativas de software más viables.`
    detalle = `La evaluación integral de ${evaluacion.software_nombre} expone deficiencias sistemáticas severas tanto a nivel interno como externo. El alto nivel de riesgo de ${riskScore} puntos es indicativo de una carencia estructural crítica que imposibilitaría una implementación exitosa a corto o mediano plazo.\n\nLas numerosas vulnerabilidades y amenazas detectadas exceden los márgenes de maniobra presupuestarios y técnicos de la organización. Iniciar un proyecto de adopción bajo estas circunstancias representa un alto riesgo de fracaso tecnológico y pérdida de capital.\n\nDecisión: Posponer indefinidamente la adopción de ${evaluacion.software_nombre} y reorientar los esfuerzos hacia la consolidación tecnológica interna.`
  }

  return `<RESUMEN>\n${resumen}\n</RESUMEN>\n\n<DETALLE>\n${detalle}\n</DETALLE>`
}
