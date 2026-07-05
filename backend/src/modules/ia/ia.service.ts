import { FastifyInstance } from 'fastify'
import { prisma } from '../../config/database'
import { config } from '../../config/env'
import { getDescripcionRecomendacion } from '../calculos/guiosad.engine'

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
    if (evaluacion.estado !== 'Completada') {
      return reply.status(400).send({ error: 'La evaluación debe estar completada primero' })
    }

    // Verificar si ya existe análisis IA
    const existing = await prisma.aIRecomendacion.findUnique({ where: { evaluacion_id: evalId } })
    if (existing) return reply.send({ ai: existing })

    // Construir análisis (con o sin API key)
    let respuestaTexto: string
    let modeloUsado: string

    if (config.aiApiKey) {
      // Intentar con API de IA real
      try {
        const prompt = buildPrompt(evaluacion)
        const response = await callAI(prompt)
        respuestaTexto = response.text
        modeloUsado = config.aiModel
      } catch {
        respuestaTexto = generateLocalAnalysis(evaluacion)
        modeloUsado = 'local-analysis-v2'
      }
    } else {
      // Análisis local inteligente
      respuestaTexto = generateLocalAnalysis(evaluacion)
      modeloUsado = 'guios-local-v2'
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
}

function buildPrompt(evaluacion: {
  software_nombre: string
  recomendacion: string | null
  risk_score: number | null
  evaluacion_factores: { factor: { factor_name: string; dimension: { dimension_name: string } }; clasificacion_foda: string | null; importancia_relativa: string | null; ponderacion_media: number | null }[]
}): string {
  const fortalezas = evaluacion.evaluacion_factores.filter(f => f.clasificacion_foda === 'Fortaleza').map(f => f.factor.factor_name)
  const oportunidades = evaluacion.evaluacion_factores.filter(f => f.clasificacion_foda === 'Oportunidad').map(f => f.factor.factor_name)
  const debilidades = evaluacion.evaluacion_factores.filter(f => f.clasificacion_foda === 'Debilidad').map(f => f.factor.factor_name)
  const amenazas = evaluacion.evaluacion_factores.filter(f => f.clasificacion_foda === 'Amenaza').map(f => f.factor.factor_name)

  return `Eres un experto en evaluación de software libre (FLOSS) utilizando la metodología GUIOSAD v2. Genera un análisis ejecutivo conciso y accionable para el siguiente resultado de evaluación:

Software evaluado: ${evaluacion.software_nombre}
Recomendación GUIOSAD: ${evaluacion.recomendacion}
Risk Score: ${evaluacion.risk_score}

FODA:
- Fortalezas (${fortalezas.length}): ${fortalezas.join(', ') || 'Ninguna'}
- Oportunidades (${oportunidades.length}): ${oportunidades.join(', ') || 'Ninguna'}
- Debilidades (${debilidades.length}): ${debilidades.join(', ') || 'Ninguna'}
- Amenazas (${amenazas.length}): ${amenazas.join(', ') || 'Ninguna'}

Proporciona:
1. Un resumen ejecutivo de 2-3 párrafos
2. Plan de acción para mitigar cada debilidad y amenaza identificada
3. Estrategias para capitalizar fortalezas y oportunidades
4. Conclusión con recomendación final clara

Responde en español, de forma profesional y estructurada.`
}

async function callAI(prompt: string): Promise<{ text: string }> {
  if (config.aiProvider === 'anthropic') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.aiApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.aiModel,
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await response.json() as { content: { text: string }[] }
    return { text: data.content[0].text }
  } else {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.aiApiKey}`,
      },
      body: JSON.stringify({
        model: config.aiModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
      }),
    })
    const data = await response.json() as { choices: { message: { content: string } }[] }
    return { text: data.choices[0].message.content }
  }
}

function generateLocalAnalysis(evaluacion: {
  software_nombre: string
  recomendacion: string | null
  risk_score: number | null
  evaluacion_factores: { factor: { factor_name: string; dimension: { dimension_name: string } }; clasificacion_foda: string | null; importancia_relativa: string | null; ponderacion_media: number | null }[]
}): string {
  const rec = evaluacion.recomendacion || 'B'
  const fortalezas = evaluacion.evaluacion_factores.filter(f => f.clasificacion_foda === 'Fortaleza')
  const oportunidades = evaluacion.evaluacion_factores.filter(f => f.clasificacion_foda === 'Oportunidad')
  const debilidades = evaluacion.evaluacion_factores.filter(f => f.clasificacion_foda === 'Debilidad')
  const amenazas = evaluacion.evaluacion_factores.filter(f => f.clasificacion_foda === 'Amenaza')

  const recTexto = getDescripcionRecomendacion(rec as 'A' | 'B' | 'C', evaluacion.software_nombre)

  let analisis = `## Análisis Ejecutivo — ${evaluacion.software_nombre}\n\n`
  analisis += `### Resumen Ejecutivo\n\n`
  analisis += `${recTexto}\n\n`
  analisis += `La evaluación GUIOSAD v2 de **${evaluacion.software_nombre}** ha procesado ${evaluacion.evaluacion_factores.length} factores distribuidos en las dimensiones Tecnológica, Organizacional y Económica. El Risk Score acumulativo es de **${evaluacion.risk_score ?? 0}**, lo que ubica al software en la categoría de recomendación **${rec}**.\n\n`

  if (fortalezas.length > 0) {
    analisis += `### 💚 Fortalezas a Capitalizar\n\n`
    fortalezas.forEach(f => {
      analisis += `- **${f.factor.factor_name}** (PM: ${f.ponderacion_media?.toFixed(2) ?? 'N/A'}): Este factor representa una ventaja competitiva. Se recomienda documentar y replicar las prácticas que contribuyen a este resultado positivo.\n`
    })
    analisis += '\n'
  }

  if (oportunidades.length > 0) {
    analisis += `### 🔵 Oportunidades Estratégicas\n\n`
    oportunidades.forEach(f => {
      analisis += `- **${f.factor.factor_name}** (PM: ${f.ponderacion_media?.toFixed(2) ?? 'N/A'}): Representa una oportunidad de mejora organizacional. Se recomienda elaborar un plan de adopción por fases para maximizar el valor.\n`
    })
    analisis += '\n'
  }

  if (debilidades.length > 0) {
    analisis += `### ⚠️ Plan de Mitigación — Debilidades\n\n`
    debilidades.forEach(f => {
      analisis += `- **${f.factor.factor_name}** (PM: ${f.ponderacion_media?.toFixed(2) ?? 'N/A'}): `
      analisis += `Acción recomendada: Establecer un equipo de trabajo especializado en ${f.factor.factor_name.toLowerCase()}, definir KPIs de mejora y revisar el estado en 90 días. Considerar soporte profesional especializado.\n`
    })
    analisis += '\n'
  }

  if (amenazas.length > 0) {
    analisis += `### 🔴 Plan de Contingencia — Amenazas\n\n`
    amenazas.forEach(f => {
      analisis += `- **${f.factor.factor_name}** (PM: ${f.ponderacion_media?.toFixed(2) ?? 'N/A'}): `
      analisis += `Acción recomendada: Desarrollar un plan de contingencia específico, establecer métricas de monitoreo continuo y definir criterios de escalada. Esta amenaza requiere atención prioritaria.\n`
    })
    analisis += '\n'
  }

  analisis += `### 📋 Conclusión y Próximos Pasos\n\n`

  if (rec === 'A') {
    analisis += `**${evaluacion.software_nombre}** está listo para adopción. Se recomienda:\n1. Elaborar un plan de implementación por fases (piloto → producción)\n2. Definir indicadores de éxito y métricas de seguimiento\n3. Establecer un equipo de soporte interno\n4. Documentar la experiencia para futuras evaluaciones`
  } else if (rec === 'B') {
    analisis += `**${evaluacion.software_nombre}** puede adoptarse con un plan de mitigación robusto. Se recomienda:\n1. Implementar primero las medidas de mitigación identificadas\n2. Realizar una prueba de concepto en entorno no crítico\n3. Evaluar nuevamente en 3-6 meses\n4. Establecer criterios de exit strategy si los riesgos no mejoran`
  } else {
    analisis += `**${evaluacion.software_nombre}** no está listo para adopción en este momento. Se recomienda:\n1. Evaluar alternativas FLOSS con mejor perfil de riesgo\n2. Monitorear la evolución del proyecto durante 6-12 meses\n3. Si se insiste en adoptar, elaborar un plan de riesgo exhaustivo con patrocinio ejecutivo\n4. Considerar una evaluación parcial en módulos menos críticos`
  }

  return analisis
}
