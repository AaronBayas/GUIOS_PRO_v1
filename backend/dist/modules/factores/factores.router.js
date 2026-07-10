"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.factoresRouter = factoresRouter;
const database_1 = require("../../config/database");
async function factoresRouter(fastify) {
    // GET /api/factores — Listar todos con subfactores y dimensión
    fastify.get('/', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const factores = await database_1.prisma.factor.findMany({
            where: { activo: true },
            include: {
                dimension: true,
                subfactores: {
                    where: { activo: true },
                    orderBy: { orden: 'asc' },
                },
            },
            orderBy: { orden: 'asc' },
        });
        return reply.send({ factores });
    });
    // GET /api/factores/:id
    fastify.get('/:id', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const { id } = req.params;
        const factor = await database_1.prisma.factor.findUnique({
            where: { factor_id: parseInt(id) },
            include: {
                dimension: true,
                subfactores: { where: { activo: true }, orderBy: { orden: 'asc' } },
                versiones: { orderBy: { numero_version: 'desc' }, take: 5 },
            },
        });
        if (!factor)
            return reply.status(404).send({ error: 'Factor no encontrado' });
        return reply.send({ factor });
    });
    // PUT /api/factores/:id — Actualizar factor (admin only)
    fastify.put('/:id', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const payload = req.user;
        if (payload.rol !== 'Administrador') {
            return reply.status(403).send({ error: 'Solo administradores pueden editar factores' });
        }
        const { id } = req.params;
        const body = req.body;
        if (!body.motivo_cambio) {
            return reply.status(400).send({ error: 'El motivo del cambio es requerido' });
        }
        const factorId = parseInt(id);
        const currentFactor = await database_1.prisma.factor.findUnique({
            where: { factor_id: factorId },
            include: { subfactores: true },
        });
        if (!currentFactor)
            return reply.status(404).send({ error: 'Factor no encontrado' });
        // Guardar snapshot de versión anterior
        await database_1.prisma.factorVersion.create({
            data: {
                factor_id: factorId,
                numero_version: currentFactor.version_actual,
                snapshot_json: JSON.stringify(currentFactor),
                motivo_cambio: body.motivo_cambio,
                creado_por: payload.usuario_id,
            },
        });
        // Actualizar factor
        const updatedFactor = await database_1.prisma.factor.update({
            where: { factor_id: factorId },
            data: {
                ...(body.factor_name && { factor_name: body.factor_name }),
                ...(body.importancia_sugerida && { importancia_sugerida: body.importancia_sugerida }),
                ...(body.tipo_impacto && { tipo_impacto: body.tipo_impacto }),
                ...(body.descripcion !== undefined && { descripcion: body.descripcion }),
                ...(body.dimension_id && { dimension_id: body.dimension_id }),
                version_actual: currentFactor.version_actual + 1,
            },
            include: { dimension: true, subfactores: { where: { activo: true } } },
        });
        return reply.send({ factor: updatedFactor });
    });
    // POST /api/factores/:id/subfactores — Agregar subfactor
    fastify.post('/:id/subfactores', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const payload = req.user;
        if (payload.rol !== 'Administrador') {
            return reply.status(403).send({ error: 'Solo administradores' });
        }
        const { id } = req.params;
        const body = req.body;
        const factor = await database_1.prisma.factor.findUnique({ where: { factor_id: parseInt(id) } });
        if (!factor)
            return reply.status(404).send({ error: 'Factor no encontrado' });
        const maxOrden = await database_1.prisma.subfactor.aggregate({
            where: { factor_id: parseInt(id) },
            _max: { orden: true },
        });
        const subfactor = await database_1.prisma.subfactor.create({
            data: {
                factor_id: parseInt(id),
                subfactor_name: body.subfactor_name,
                es_critico: body.es_critico || false,
                orden: (maxOrden._max.orden || 0) + 1,
            },
        });
        return reply.status(201).send({ subfactor });
    });
    // GET /api/factores/dimensiones — Listar dimensiones
    fastify.get('/dimensiones/list', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const dimensiones = await database_1.prisma.dimension.findMany({ orderBy: { orden: 'asc' } });
        return reply.send({ dimensiones });
    });
}
//# sourceMappingURL=factores.router.js.map