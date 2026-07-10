"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usuariosRouter = usuariosRouter;
const database_1 = require("../../config/database");
async function usuariosRouter(fastify) {
    // GET /api/usuarios — Admin only
    fastify.get('/', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const payload = req.user;
        if (payload.rol !== 'Administrador') {
            return reply.status(403).send({ error: 'Solo administradores' });
        }
        const usuarios = await database_1.prisma.usuario.findMany({
            include: { rol: true },
            orderBy: { created_at: 'desc' },
        });
        return reply.send({ usuarios: usuarios.map(u => ({
                ...u,
                password_hash: undefined,
            })) });
    });
    // PATCH /api/usuarios/:id/rol
    fastify.patch('/:id/rol', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const payload = req.user;
        if (payload.rol !== 'Administrador') {
            return reply.status(403).send({ error: 'Solo administradores' });
        }
        const { id } = req.params;
        const { rol_name } = req.body;
        const rol = await database_1.prisma.rol.findFirst({ where: { rol_name } });
        if (!rol)
            return reply.status(400).send({ error: 'Rol inválido' });
        const usuario = await database_1.prisma.usuario.update({
            where: { usuario_id: parseInt(id) },
            data: { rol_id: rol.rol_id },
            include: { rol: true },
        });
        return reply.send({ usuario });
    });
    // PATCH /api/usuarios/:id/activo
    fastify.patch('/:id/activo', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const payload = req.user;
        if (payload.rol !== 'Administrador') {
            return reply.status(403).send({ error: 'Solo administradores' });
        }
        const { id } = req.params;
        const { activo } = req.body;
        const usuario = await database_1.prisma.usuario.update({
            where: { usuario_id: parseInt(id) },
            data: { activo },
            include: { rol: true },
        });
        return reply.send({ usuario });
    });
    // DELETE /api/usuarios/:id
    fastify.delete('/:id', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const payload = req.user;
        if (payload.rol !== 'Administrador') {
            return reply.status(403).send({ error: 'Solo administradores' });
        }
        const { id } = req.params;
        if (payload.usuario_id === parseInt(id)) {
            return reply.status(400).send({ error: 'No puedes eliminarte a ti mismo' });
        }
        await database_1.prisma.usuario.delete({ where: { usuario_id: parseInt(id) } });
        return reply.send({ eliminado: true });
    });
}
//# sourceMappingURL=usuarios.router.js.map