import { FastifyInstance } from 'fastify'
import { prisma } from '../../config/database'
import {
  calcularIR,
  calcularPM,
  clasificarFoda,
  clasificarFodaAmbos,
  getUmbral,
  calcularRiskScore,
  calcularRecomendacion,
  getDescripcionRecomendacion,
  esRelevante,
} from '../calculos/guiosad.engine'

export async function evaluacionesRouter(fastify: FastifyInstance) {
  // GET /api/evaluaciones — Listar evaluaciones del usuario
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const payload = req.user as { usuario_id: number; rol: string }
    const { estado, tipo, buscar, orden } = req.query as {
      estado?: string; tipo?: string; buscar?: string; orden?: string
    }

    const where: Record<string, unknown> = {}

    // Admin ve todas; Evaluador solo las suyas
    if (payload.rol !== 'Administrador') {
      where.usuario_id = payload.usuario_id
    }
    if (estado && estado !== 'Todos') where.estado = estado
    if (tipo) where.software_tipo = tipo
    if (buscar) where.software_nombre = { contains: buscar }

    const evaluaciones = await prisma.evaluacion.findMany({
      where,
      include: {
        usuario: { select: { usuario_name: true, email: true } },
        _count: { select: { evaluacion_factores: true } },
      },
      orderBy: orden === 'nombre' ? { software_nombre: 'asc' }
        : orden === 'antiguo' ? { created_at: 'asc' }
        : { updated_at: 'desc' },
    })

    return reply.send({ evaluaciones })
  })

  // POST /api/evaluaciones — Crear nueva evaluación
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const payload = req.user as { usuario_id: number }
    const body = req.body as {
      software_nombre: string
      software_version?: string
      software_tipo: string
      software_sitio_web?: string
      software_licencia?: string
      software_descripcion?: string
      organizacion_nombre?: string
      organizacion_sector?: string
      evaluador_nombre?: string
      contexto_evaluacion?: string
      fecha_limite?: string
    }

    if (!body.software_nombre) {
      return reply.status(400).send({ error: 'El nombre del software es requerido' })
    }

    const evaluacion = await prisma.evaluacion.create({
      data: {
        usuario_id: payload.usuario_id,
        software_nombre: body.software_nombre,
        software_version: body.software_version,
        software_tipo: body.software_tipo || 'Otro',
        software_sitio_web: body.software_sitio_web,
        software_licencia: body.software_licencia,
        software_descripcion: body.software_descripcion,
        organizacion_nombre: body.organizacion_nombre,
        organizacion_sector: body.organizacion_sector,
        evaluador_nombre: body.evaluador_nombre,
        contexto_evaluacion: body.contexto_evaluacion,
        fecha_limite: body.fecha_limite ? new Date(body.fecha_limite) : null,
        estado: 'Borrador',
        paso_actual: 1,
      },
    })

    // Crear registros de evaluacion_factor para todos los factores activos
    const factores = await prisma.factor.findMany({ where: { activo: true } })
    await prisma.evaluacionFactor.createMany({
      data: factores.map(f => ({
        evaluacion_id: evaluacion.evaluacion_id,
        factor_id: f.factor_id,
      })),
    })

    // Crear registros de evaluacion_subfactor para todos los subfactores
    const efactores = await prisma.evaluacionFactor.findMany({
      where: { evaluacion_id: evaluacion.evaluacion_id },
      include: { factor: { include: { subfactores: { where: { activo: true } } } } },
    })

    for (const ef of efactores) {
      if (ef.factor.subfactores.length > 0) {
        await prisma.evaluacionSubfactor.createMany({
          data: ef.factor.subfactores.map(sf => ({
            efactor_id: ef.efactor_id,
            subfactor_id: sf.subfactor_id,
          })),
        })
      }
    }

    return reply.status(201).send({ evaluacion })
  })

  // GET /api/evaluaciones/:id — Obtener evaluación completa
  fastify.get('/:id', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const payload = req.user as { usuario_id: number; rol: string }

    const evaluacion = await prisma.evaluacion.findUnique({
      where: { evaluacion_id: parseInt(id) },
      include: {
        usuario: { select: { usuario_name: true, email: true } },
        evaluacion_factores: {
          include: {
            factor: {
              include: {
                dimension: true,
                subfactores: { where: { activo: true }, orderBy: { orden: 'asc' } },
              },
            },
            evaluacion_subfactores: {
              include: { subfactor: true },
            },
          },
          orderBy: { factor: { orden: 'asc' } },
        },
        ai_recomendacion: true,
      },
    })

    if (!evaluacion) return reply.status(404).send({ error: 'Evaluación no encontrada' })

    if (payload.rol !== 'Administrador' && evaluacion.usuario_id !== payload.usuario_id) {
      return reply.status(403).send({ error: 'Sin acceso a esta evaluación' })
    }

    return reply.send({ evaluacion })
  })

  // PATCH /api/evaluaciones/:id — Actualizar campos de la evaluación
  fastify.patch('/:id', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = req.body as Record<string, unknown>

    const evaluacion = await prisma.evaluacion.update({
      where: { evaluacion_id: parseInt(id) },
      data: { ...body, updated_at: new Date() },
    })

    return reply.send({ evaluacion })
  })

  // PATCH /api/evaluaciones/:id/autosave — Guardar progreso automático
  fastify.patch('/:id/autosave', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const evaluacionId = parseInt(id)
    const body = req.body as {
      paso_actual?: number
      factores?: {
        factor_id: number
        importancia_decisor?: number
        alcance_override?: string
        subfactores?: { subfactor_id: number; peso: number }[]
      }[]
    }

    // Actualizar factores si vienen
    if (body.factores && body.factores.length > 0) {
      for (const f of body.factores) {
        const efactor = await prisma.evaluacionFactor.findFirst({
          where: { evaluacion_id: evaluacionId, factor_id: f.factor_id },
          include: {
            factor: { include: { dimension: true } },
          },
        })

        if (!efactor) continue

        // Calcular IR si hay ID
        let importancia_relativa: string | undefined
        if (f.importancia_decisor) {
          const is = efactor.factor.importancia_sugerida
          importancia_relativa = calcularIR(is, f.importancia_decisor)
        }

        await prisma.evaluacionFactor.update({
          where: { efactor_id: efactor.efactor_id },
          data: {
            ...(f.importancia_decisor !== undefined && { importancia_decisor: f.importancia_decisor }),
            ...(importancia_relativa && { importancia_relativa }),
            ...(f.alcance_override && { alcance_override: f.alcance_override }),
            updated_at: new Date(),
          },
        })

        // Actualizar subfactores si vienen
        if (f.subfactores && f.subfactores.length > 0) {
          for (const sf of f.subfactores) {
            await prisma.evaluacionSubfactor.updateMany({
              where: { efactor_id: efactor.efactor_id, subfactor_id: sf.subfactor_id },
              data: { peso: sf.peso },
            })
          }

          // Recalcular PM y clasificación FODA
          const subfactoresData = await prisma.evaluacionSubfactor.findMany({
            where: { efactor_id: efactor.efactor_id },
            include: { subfactor: true },
          })

          const subfactoresConPeso = subfactoresData.filter(sf => sf.peso !== null) as {
            peso: number; subfactor: { es_critico: boolean }
          }[]

          if (subfactoresConPeso.length > 0) {
            const pm = calcularPM(subfactoresConPeso.map(sf => ({
              peso: sf.peso,
              es_critico: sf.subfactor.es_critico,
            })))

            const umbral = getUmbral(efactor.factor.dimension.dimension_name)
            const alcance = (f.alcance_override || efactor.factor.tipo_impacto) as 'Interno' | 'Externo' | 'Ambos'

            let clasif_foda: string
            let foda_interno: string | undefined
            let foda_externo: string | undefined

            if (alcance === 'Ambos') {
              const result = clasificarFodaAmbos(pm, umbral)
              clasif_foda = result.final
              foda_interno = result.interno
              foda_externo = result.externo
            } else {
              clasif_foda = clasificarFoda(pm, alcance, umbral)
            }

            const totalSubfactores = subfactoresData.length
            const completado = subfactoresConPeso.length === totalSubfactores

            await prisma.evaluacionFactor.update({
              where: { efactor_id: efactor.efactor_id },
              data: {
                ponderacion_media: pm,
                clasificacion_foda: clasif_foda,
                ...(foda_interno && { foda_interno }),
                ...(foda_externo && { foda_externo }),
                completado,
              },
            })
          }
        }
      }
    }

    // Actualizar evaluación principal — solo cambia a En_progreso si aún no está Completada
    const evActual = await prisma.evaluacion.findUnique({ where: { evaluacion_id: evaluacionId }, select: { estado: true } })
    await prisma.evaluacion.update({
      where: { evaluacion_id: evaluacionId },
      data: {
        ...(body.paso_actual && { paso_actual: body.paso_actual }),
        ultimo_guardado: new Date(),
        // No sobreescribir "Completada" con "En_progreso"
        ...(evActual?.estado !== 'Completada' && { estado: 'En_progreso' }),
      },
    })

    // Registrar en historial
    await prisma.historialCambio.create({
      data: {
        evaluacion_id: evaluacionId,
        tipo_cambio: 'autosave',
        descripcion: `AutoSave paso ${body.paso_actual || '?'}`,
      },
    })

    return reply.send({ guardado: true, timestamp: new Date() })
  })

  // POST /api/evaluaciones/:id/calcular — Calcular FODA y recomendación final
  fastify.post('/:id/calcular', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const evaluacionId = parseInt(id)
    const body = req.body as {
      factores?: {
        factor_id: number
        importancia_decisor?: number
        alcance_override?: string
        subfactores?: { subfactor_id: number; peso: number }[]
      }[]
    }

    const evaluacion = await prisma.evaluacion.findUnique({
      where: { evaluacion_id: evaluacionId },
      include: {
        evaluacion_factores: {
          include: {
            factor: { include: { dimension: true } },
            evaluacion_subfactores: { include: { subfactor: true } },
          },
        },
      },
    })

    if (!evaluacion) return reply.status(404).send({ error: 'Evaluación no encontrada' })

    // If frontend sent factor data, apply it to the evaluacion_factores in memory
    const factorOverrides = new Map<number, { importancia_decisor?: number; alcance_override?: string; subfactorMap: Map<number, number> }>()
    if (body?.factores) {
      for (const f of body.factores) {
        const sfMap = new Map<number, number>()
        f.subfactores?.forEach(sf => sfMap.set(sf.subfactor_id, sf.peso))
        factorOverrides.set(f.factor_id, {
          importancia_decisor: f.importancia_decisor,
          alcance_override: f.alcance_override,
          subfactorMap: sfMap,
        })
      }
    }

    // Recalcular todo — using data from DB merged with any overrides from frontend
    const resultados: { ir: string; foda: string }[] = []
    const updatePromises: Promise<unknown>[] = []

    for (const ef of evaluacion.evaluacion_factores) {
      const override = factorOverrides.get(ef.factor_id)
      const importancia_decisor = override?.importancia_decisor ?? ef.importancia_decisor
      if (!importancia_decisor) continue

      const ir = calcularIR(ef.factor.importancia_sugerida, importancia_decisor)
      if (!esRelevante(ir)) continue

      // Merge subfactor weights: DB data + any overrides from frontend
      const sfWeights = new Map<number, { peso: number; es_critico: boolean }>()
      for (const esf of ef.evaluacion_subfactores) {
        sfWeights.set(esf.subfactor_id, { peso: esf.peso ?? 0, es_critico: esf.subfactor.es_critico })
      }
      if (override?.subfactorMap) {
        override.subfactorMap.forEach((peso, sfId) => {
          const existing = sfWeights.get(sfId)
          if (existing) sfWeights.set(sfId, { ...existing, peso })
        })
      }

      const subfactoresConPeso = [...sfWeights.values()].filter(sf => sf.peso > 0)
      if (subfactoresConPeso.length === 0) continue

      const pm = calcularPM(subfactoresConPeso)
      const umbral = getUmbral(ef.factor.dimension.dimension_name)
      const alcance = (override?.alcance_override || ef.alcance_override || ef.factor.tipo_impacto) as 'Interno' | 'Externo' | 'Ambos'

      let clasif_foda: string
      let foda_interno: string | undefined
      let foda_externo: string | undefined

      if (alcance === 'Ambos') {
        const result = clasificarFodaAmbos(pm, umbral)
        clasif_foda = result.final
        foda_interno = result.interno
        foda_externo = result.externo
      } else {
        clasif_foda = clasificarFoda(pm, alcance, umbral)
      }

      // Persist subfactor overrides in parallel
      if (override?.subfactorMap) {
        override.subfactorMap.forEach((peso, subfactor_id) => {
          updatePromises.push(
            prisma.evaluacionSubfactor.updateMany({
              where: { efactor_id: ef.efactor_id, subfactor_id },
              data: { peso },
            })
          )
        })
      }

      // Update factor result in parallel
      updatePromises.push(
        prisma.evaluacionFactor.update({
          where: { efactor_id: ef.efactor_id },
          data: {
            ponderacion_media: pm,
            importancia_relativa: ir,
            importancia_decisor,
            clasificacion_foda: clasif_foda,
            ...(foda_interno && { foda_interno }),
            ...(foda_externo && { foda_externo }),
            completado: true,
          },
        })
      )

      resultados.push({ ir, foda: clasif_foda })
    }

    // Execute all DB updates in parallel
    await Promise.all(updatePromises)

    // Calcular risk score y recomendación
    const riskScore = calcularRiskScore(resultados as { ir: string; foda: 'Fortaleza' | 'Oportunidad' | 'Debilidad' | 'Amenaza' }[])
    const recomendacion = calcularRecomendacion(riskScore)

    await prisma.evaluacion.update({
      where: { evaluacion_id: evaluacionId },
      data: {
        risk_score: riskScore,
        recomendacion,
        estado: 'Completada',
        paso_actual: 3,
        ultimo_guardado: new Date(),
      },
    })

    // Registrar en historial (no bloquea la respuesta)
    prisma.historialCambio.create({
      data: {
        evaluacion_id: evaluacionId,
        tipo_cambio: 'paso_completado',
        descripcion: `Evaluación completada. Recomendación: ${recomendacion} | Risk Score: ${riskScore}`,
      },
    }).catch(() => {})

    return reply.send({
      riskScore,
      recomendacion,
      descripcion: getDescripcionRecomendacion(recomendacion, evaluacion.software_nombre),
      resultados,
    })
  })

  // GET /api/evaluaciones/:id/historial — Historial de cambios
  fastify.get('/:id/historial', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const historial = await prisma.historialCambio.findMany({
      where: { evaluacion_id: parseInt(id) },
      orderBy: { created_at: 'desc' },
      take: 50,
    })
    return reply.send({ historial })
  })

  // DELETE /api/evaluaciones/:id — Eliminar evaluación
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    await prisma.evaluacion.delete({ where: { evaluacion_id: parseInt(id) } })
    return reply.send({ eliminado: true })
  })

  // PATCH /api/evaluaciones/:id/archivar
  fastify.patch('/:id/archivar', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const evaluacion = await prisma.evaluacion.update({
      where: { evaluacion_id: parseInt(id) },
      data: { estado: 'Archivada' },
    })
    return reply.send({ evaluacion })
  })

  // GET /api/evaluaciones/stats/dashboard — Stats para dashboard
  fastify.get('/stats/dashboard', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const payload = req.user as { usuario_id: number; rol: string }
    const where = payload.rol !== 'Administrador' ? { usuario_id: payload.usuario_id } : {}

    const [total, completadas, enProgreso, archivadas, recientes] = await Promise.all([
      prisma.evaluacion.count({ where }),
      prisma.evaluacion.count({ where: { ...where, estado: 'Completada' } }),
      prisma.evaluacion.count({ where: { ...where, estado: 'En_progreso' } }),
      prisma.evaluacion.count({ where: { ...where, estado: 'Archivada' } }),
      prisma.evaluacion.findMany({
        where,
        take: 5,
        orderBy: { updated_at: 'desc' },
        include: { usuario: { select: { usuario_name: true } } },
      }),
    ])

    return reply.send({ total, completadas, enProgreso, archivadas, recientes })
  })
}
