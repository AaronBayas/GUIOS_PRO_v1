import { FastifyInstance } from 'fastify'
import { prisma } from '../../config/database'

export async function usuariosRouter(fastify: FastifyInstance) {
  // GET /api/usuarios — Admin only
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const payload = req.user as { rol: string }
    if (payload.rol !== 'Administrador') {
      return reply.status(403).send({ error: 'Solo administradores' })
    }

    const usuarios = await prisma.usuario.findMany({
      include: { rol: true },
      orderBy: { created_at: 'desc' },
    })

    return reply.send({ usuarios: usuarios.map(u => ({
      ...u,
      password_hash: undefined,
    })) })
  })

  // PATCH /api/usuarios/:id/rol
  fastify.patch('/:id/rol', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const payload = req.user as { rol: string }
    if (payload.rol !== 'Administrador') {
      return reply.status(403).send({ error: 'Solo administradores' })
    }

    const { id } = req.params as { id: string }
    const { rol_name } = req.body as { rol_name: string }

    const rol = await prisma.rol.findFirst({ where: { rol_name } })
    if (!rol) return reply.status(400).send({ error: 'Rol inválido' })

    const usuario = await prisma.usuario.update({
      where: { usuario_id: parseInt(id) },
      data: { rol_id: rol.rol_id },
      include: { rol: true },
    })

    return reply.send({ usuario })
  })

  // PATCH /api/usuarios/:id/activo
  fastify.patch('/:id/activo', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const payload = req.user as { rol: string }
    if (payload.rol !== 'Administrador') {
      return reply.status(403).send({ error: 'Solo administradores' })
    }

    const { id } = req.params as { id: string }
    const { activo } = req.body as { activo: boolean }

    const usuario = await prisma.usuario.update({
      where: { usuario_id: parseInt(id) },
      data: { activo },
      include: { rol: true },
    })

    return reply.send({ usuario })
  })

  // DELETE /api/usuarios/:id
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const payload = req.user as { usuario_id: number; rol: string }
    if (payload.rol !== 'Administrador') {
      return reply.status(403).send({ error: 'Solo administradores' })
    }

    const { id } = req.params as { id: string }
    if (payload.usuario_id === parseInt(id)) {
      return reply.status(400).send({ error: 'No puedes eliminarte a ti mismo' })
    }

    await prisma.usuario.delete({ where: { usuario_id: parseInt(id) } })
    return reply.send({ eliminado: true })
  })
}
