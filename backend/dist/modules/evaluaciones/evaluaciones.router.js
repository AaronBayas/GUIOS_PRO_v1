"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluacionesRouter = evaluacionesRouter;
const database_1 = require("../../config/database");
const guiosad_engine_1 = require("../calculos/guiosad.engine");
async function evaluacionesRouter(fastify) {
    // GET /api/evaluaciones — Listar evaluaciones del usuario
    fastify.get('/', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const payload = req.user;
        const { estado, tipo, buscar, orden } = req.query;
        const where = {};
        // Admin ve todas; Evaluador solo las suyas
        if (payload.rol !== 'Administrador') {
            where.usuario_id = payload.usuario_id;
        }
        if (estado && estado !== 'Todos')
            where.estado = estado;
        if (tipo)
            where.software_tipo = tipo;
        if (buscar)
            where.software_nombre = { contains: buscar };
        const evaluaciones = await database_1.prisma.evaluacion.findMany({
            where,
            include: {
                usuario: { select: { usuario_name: true, email: true } },
                _count: { select: { evaluacion_factores: true } },
            },
            orderBy: orden === 'nombre' ? { software_nombre: 'asc' }
                : orden === 'antiguo' ? { created_at: 'asc' }
                    : { updated_at: 'desc' },
        });
        return reply.send({ evaluaciones });
    });
    // POST /api/evaluaciones — Crear nueva evaluación
    fastify.post('/', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const payload = req.user;
        const body = req.body;
        if (!body.software_nombre) {
            return reply.status(400).send({ error: 'El nombre del software es requerido' });
        }
        const evaluacion = await database_1.prisma.evaluacion.create({
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
        });
        // Crear registros de evaluacion_factor para todos los factores activos
        const factores = await database_1.prisma.factor.findMany({ where: { activo: true } });
        await database_1.prisma.evaluacionFactor.createMany({
            data: factores.map(f => ({
                evaluacion_id: evaluacion.evaluacion_id,
                factor_id: f.factor_id,
            })),
        });
        // Crear registros de evaluacion_subfactor para todos los subfactores
        const efactores = await database_1.prisma.evaluacionFactor.findMany({
            where: { evaluacion_id: evaluacion.evaluacion_id },
            include: { factor: { include: { subfactores: { where: { activo: true } } } } },
        });
        for (const ef of efactores) {
            if (ef.factor.subfactores.length > 0) {
                await database_1.prisma.evaluacionSubfactor.createMany({
                    data: ef.factor.subfactores.map(sf => ({
                        efactor_id: ef.efactor_id,
                        subfactor_id: sf.subfactor_id,
                    })),
                });
            }
        }
        return reply.status(201).send({ evaluacion });
    });
    // GET /api/evaluaciones/:id — Obtener evaluación completa
    fastify.get('/:id', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const { id } = req.params;
        const payload = req.user;
        const evaluacion = await database_1.prisma.evaluacion.findUnique({
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
        });
        if (!evaluacion)
            return reply.status(404).send({ error: 'Evaluación no encontrada' });
        if (payload.rol !== 'Administrador' && evaluacion.usuario_id !== payload.usuario_id) {
            return reply.status(403).send({ error: 'Sin acceso a esta evaluación' });
        }
        return reply.send({ evaluacion });
    });
    // PATCH /api/evaluaciones/:id — Actualizar campos de la evaluación
    fastify.patch('/:id', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const { id } = req.params;
        const body = req.body;
        const evaluacion = await database_1.prisma.evaluacion.update({
            where: { evaluacion_id: parseInt(id) },
            data: { ...body, updated_at: new Date() },
        });
        return reply.send({ evaluacion });
    });
    // PATCH /api/evaluaciones/:id/autosave — Guardar progreso automático
    fastify.patch('/:id/autosave', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const { id } = req.params;
        const evaluacionId = parseInt(id);
        const body = req.body;
        // Actualizar factores si vienen
        if (body.factores && body.factores.length > 0) {
            for (const f of body.factores) {
                const efactor = await database_1.prisma.evaluacionFactor.findFirst({
                    where: { evaluacion_id: evaluacionId, factor_id: f.factor_id },
                    include: {
                        factor: { include: { dimension: true } },
                    },
                });
                if (!efactor)
                    continue;
                // Calcular IR si hay ID
                let importancia_relativa;
                if (f.importancia_decisor) {
                    const is = efactor.factor.importancia_sugerida;
                    importancia_relativa = (0, guiosad_engine_1.calcularIR)(is, f.importancia_decisor);
                }
                await database_1.prisma.evaluacionFactor.update({
                    where: { efactor_id: efactor.efactor_id },
                    data: {
                        ...(f.importancia_decisor !== undefined && { importancia_decisor: f.importancia_decisor }),
                        ...(importancia_relativa && { importancia_relativa }),
                        ...(f.alcance_override && { alcance_override: f.alcance_override }),
                        updated_at: new Date(),
                    },
                });
                // Actualizar subfactores si vienen
                if (f.subfactores && f.subfactores.length > 0) {
                    for (const sf of f.subfactores) {
                        await database_1.prisma.evaluacionSubfactor.updateMany({
                            where: { efactor_id: efactor.efactor_id, subfactor_id: sf.subfactor_id },
                            data: { peso: sf.peso },
                        });
                    }
                    // Recalcular PM y clasificación FODA
                    const subfactoresData = await database_1.prisma.evaluacionSubfactor.findMany({
                        where: { efactor_id: efactor.efactor_id },
                        include: { subfactor: true },
                    });
                    const subfactoresConPeso = subfactoresData.filter(sf => sf.peso !== null);
                    if (subfactoresConPeso.length > 0) {
                        const pm = (0, guiosad_engine_1.calcularPM)(subfactoresConPeso.map(sf => ({
                            peso: sf.peso,
                            es_critico: sf.subfactor.es_critico,
                        })));
                        const umbral = (0, guiosad_engine_1.getUmbral)(efactor.factor.dimension.dimension_name);
                        const alcance = (f.alcance_override || efactor.factor.tipo_impacto);
                        let clasif_foda;
                        let foda_interno;
                        let foda_externo;
                        if (alcance === 'Ambos') {
                            const result = (0, guiosad_engine_1.clasificarFodaAmbos)(pm, umbral);
                            clasif_foda = result.final;
                            foda_interno = result.interno;
                            foda_externo = result.externo;
                        }
                        else {
                            clasif_foda = (0, guiosad_engine_1.clasificarFoda)(pm, alcance, umbral);
                        }
                        const totalSubfactores = subfactoresData.length;
                        const completado = subfactoresConPeso.length === totalSubfactores;
                        await database_1.prisma.evaluacionFactor.update({
                            where: { efactor_id: efactor.efactor_id },
                            data: {
                                ponderacion_media: pm,
                                clasificacion_foda: clasif_foda,
                                ...(foda_interno && { foda_interno }),
                                ...(foda_externo && { foda_externo }),
                                completado,
                            },
                        });
                    }
                }
            }
        }
        // Actualizar evaluación principal
        await database_1.prisma.evaluacion.update({
            where: { evaluacion_id: evaluacionId },
            data: {
                ...(body.paso_actual && { paso_actual: body.paso_actual }),
                ultimo_guardado: new Date(),
                estado: 'En_progreso',
            },
        });
        // Registrar en historial
        await database_1.prisma.historialCambio.create({
            data: {
                evaluacion_id: evaluacionId,
                tipo_cambio: 'autosave',
                descripcion: `AutoSave paso ${body.paso_actual || '?'}`,
            },
        });
        return reply.send({ guardado: true, timestamp: new Date() });
    });
    // POST /api/evaluaciones/:id/calcular — Calcular FODA y recomendación final
    fastify.post('/:id/calcular', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const { id } = req.params;
        const evaluacionId = parseInt(id);
        const evaluacion = await database_1.prisma.evaluacion.findUnique({
            where: { evaluacion_id: evaluacionId },
            include: {
                evaluacion_factores: {
                    include: {
                        factor: { include: { dimension: true } },
                        evaluacion_subfactores: { include: { subfactor: true } },
                    },
                },
            },
        });
        if (!evaluacion)
            return reply.status(404).send({ error: 'Evaluación no encontrada' });
        // Recalcular todo
        const resultados = [];
        for (const ef of evaluacion.evaluacion_factores) {
            if (!ef.importancia_decisor)
                continue;
            const ir = (0, guiosad_engine_1.calcularIR)(ef.factor.importancia_sugerida, ef.importancia_decisor);
            if (!(0, guiosad_engine_1.esRelevante)(ir))
                continue;
            const subfactoresConPeso = ef.evaluacion_subfactores.filter(sf => sf.peso !== null);
            if (subfactoresConPeso.length === 0)
                continue;
            const pm = (0, guiosad_engine_1.calcularPM)(subfactoresConPeso.map(sf => ({
                peso: sf.peso,
                es_critico: sf.subfactor.es_critico,
            })));
            const umbral = (0, guiosad_engine_1.getUmbral)(ef.factor.dimension.dimension_name);
            const alcance = (ef.alcance_override || ef.factor.tipo_impacto);
            let clasif_foda;
            if (alcance === 'Ambos') {
                const result = (0, guiosad_engine_1.clasificarFodaAmbos)(pm, umbral);
                clasif_foda = result.final;
                await database_1.prisma.evaluacionFactor.update({
                    where: { efactor_id: ef.efactor_id },
                    data: {
                        ponderacion_media: pm,
                        importancia_relativa: ir,
                        clasificacion_foda: result.final,
                        foda_interno: result.interno,
                        foda_externo: result.externo,
                        completado: true,
                    },
                });
            }
            else {
                clasif_foda = (0, guiosad_engine_1.clasificarFoda)(pm, alcance, umbral);
                await database_1.prisma.evaluacionFactor.update({
                    where: { efactor_id: ef.efactor_id },
                    data: {
                        ponderacion_media: pm,
                        importancia_relativa: ir,
                        clasificacion_foda: clasif_foda,
                        completado: true,
                    },
                });
            }
            resultados.push({ ir, foda: clasif_foda });
        }
        // Calcular risk score y recomendación
        const riskScore = (0, guiosad_engine_1.calcularRiskScore)(resultados);
        const recomendacion = (0, guiosad_engine_1.calcularRecomendacion)(riskScore);
        await database_1.prisma.evaluacion.update({
            where: { evaluacion_id: evaluacionId },
            data: {
                risk_score: riskScore,
                recomendacion,
                estado: 'Completada',
                paso_actual: 3,
                ultimo_guardado: new Date(),
            },
        });
        // Registrar en historial
        await database_1.prisma.historialCambio.create({
            data: {
                evaluacion_id: evaluacionId,
                tipo_cambio: 'paso_completado',
                descripcion: `Evaluación completada. Recomendación: ${recomendacion} | Risk Score: ${riskScore}`,
            },
        });
        return reply.send({
            riskScore,
            recomendacion,
            descripcion: (0, guiosad_engine_1.getDescripcionRecomendacion)(recomendacion, evaluacion.software_nombre),
            resultados,
        });
    });
    // GET /api/evaluaciones/:id/historial — Historial de cambios
    fastify.get('/:id/historial', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const { id } = req.params;
        const historial = await database_1.prisma.historialCambio.findMany({
            where: { evaluacion_id: parseInt(id) },
            orderBy: { created_at: 'desc' },
            take: 50,
        });
        return reply.send({ historial });
    });
    // DELETE /api/evaluaciones/:id — Eliminar evaluación
    fastify.delete('/:id', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const { id } = req.params;
        await database_1.prisma.evaluacion.delete({ where: { evaluacion_id: parseInt(id) } });
        return reply.send({ eliminado: true });
    });
    // PATCH /api/evaluaciones/:id/archivar
    fastify.patch('/:id/archivar', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const { id } = req.params;
        const evaluacion = await database_1.prisma.evaluacion.update({
            where: { evaluacion_id: parseInt(id) },
            data: { estado: 'Archivada' },
        });
        return reply.send({ evaluacion });
    });
    // GET /api/evaluaciones/stats/dashboard — Stats para dashboard
    fastify.get('/stats/dashboard', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const payload = req.user;
        const where = payload.rol !== 'Administrador' ? { usuario_id: payload.usuario_id } : {};
        const [total, completadas, enProgreso, archivadas, recientes] = await Promise.all([
            database_1.prisma.evaluacion.count({ where }),
            database_1.prisma.evaluacion.count({ where: { ...where, estado: 'Completada' } }),
            database_1.prisma.evaluacion.count({ where: { ...where, estado: 'En_progreso' } }),
            database_1.prisma.evaluacion.count({ where: { ...where, estado: 'Archivada' } }),
            database_1.prisma.evaluacion.findMany({
                where,
                take: 5,
                orderBy: { updated_at: 'desc' },
                include: { usuario: { select: { usuario_name: true } } },
            }),
        ]);
        return reply.send({ total, completadas, enProgreso, archivadas, recientes });
    });
}
//# sourceMappingURL=evaluaciones.router.js.map