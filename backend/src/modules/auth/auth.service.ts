import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../../config/database'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const registerSchema = z.object({
  usuario_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

export async function registerHandler(req: FastifyRequest, reply: FastifyReply) {
  const result = registerSchema.safeParse(req.body)
  if (!result.success) {
    return reply.status(400).send({ error: result.error.errors[0].message })
  }
  const { usuario_name, email, password } = result.data

  const existing = await prisma.usuario.findUnique({ where: { email } })
  if (existing) {
    return reply.status(409).send({ error: 'El email ya está registrado' })
  }

  // Primer usuario → Administrador
  const totalUsers = await prisma.usuario.count()
  const rolAdmin = await prisma.rol.findFirst({ where: { rol_name: 'Administrador' } })
  const rolEvaluador = await prisma.rol.findFirst({ where: { rol_name: 'Evaluador' } })

  if (!rolAdmin || !rolEvaluador) {
    return reply.status(500).send({ error: 'Roles no configurados. Ejecute el seed primero.' })
  }

  const rol_id = totalUsers === 0 ? rolAdmin.rol_id : rolEvaluador.rol_id
  const password_hash = await bcrypt.hash(password, 12)

  const usuario = await prisma.usuario.create({
    data: { usuario_name, email, password_hash, rol_id, activo: true },
    include: { rol: true },
  })

  const token = req.server.jwt.sign(
    { usuario_id: usuario.usuario_id, email: usuario.email, rol: usuario.rol.rol_name },
    { expiresIn: '8h' }
  )

  reply.setCookie('token', token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  })

  return reply.status(201).send({
    usuario: {
      usuario_id: usuario.usuario_id,
      usuario_name: usuario.usuario_name,
      email: usuario.email,
      rol: usuario.rol.rol_name,
    },
  })
}

export async function loginHandler(req: FastifyRequest, reply: FastifyReply) {
  const result = loginSchema.safeParse(req.body)
  if (!result.success) {
    return reply.status(400).send({ error: result.error.errors[0].message })
  }
  const { email, password } = result.data

  const usuario = await prisma.usuario.findUnique({
    where: { email },
    include: { rol: true },
  })

  if (!usuario || !usuario.activo) {
    return reply.status(401).send({ error: 'Credenciales inválidas' })
  }

  const valid = await bcrypt.compare(password, usuario.password_hash)
  if (!valid) {
    return reply.status(401).send({ error: 'Credenciales inválidas' })
  }

  const token = req.server.jwt.sign(
    { usuario_id: usuario.usuario_id, email: usuario.email, rol: usuario.rol.rol_name },
    { expiresIn: '8h' }
  )

  reply.setCookie('token', token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  })

  return reply.send({
    usuario: {
      usuario_id: usuario.usuario_id,
      usuario_name: usuario.usuario_name,
      email: usuario.email,
      rol: usuario.rol.rol_name,
    },
  })
}

export async function logoutHandler(req: FastifyRequest, reply: FastifyReply) {
  reply.clearCookie('token', { path: '/' })
  return reply.send({ message: 'Sesión cerrada' })
}

export async function meHandler(req: FastifyRequest, reply: FastifyReply) {
  try {
    const payload = req.user as { usuario_id: number; email: string; rol: string }
    const usuario = await prisma.usuario.findUnique({
      where: { usuario_id: payload.usuario_id },
      include: { rol: true },
    })
    if (!usuario || !usuario.activo) {
      return reply.status(401).send({ error: 'Sesión inválida' })
    }
    return reply.send({
      usuario: {
        usuario_id: usuario.usuario_id,
        usuario_name: usuario.usuario_name,
        email: usuario.email,
        rol: usuario.rol.rol_name,
      },
    })
  } catch {
    return reply.status(401).send({ error: 'Token inválido' })
  }
}
