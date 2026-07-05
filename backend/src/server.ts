import Fastify from 'fastify'
import fastifyJWT from '@fastify/jwt'
import fastifyCookie from '@fastify/cookie'
import fastifyCors from '@fastify/cors'
import { config } from './config/env'
import { authRouter } from './modules/auth/auth.router'
import { factoresRouter } from './modules/factores/factores.router'
import { evaluacionesRouter } from './modules/evaluaciones/evaluaciones.router'
import { usuariosRouter } from './modules/usuarios/usuarios.router'
import { iaRouter } from './modules/ia/ia.service'

const fastify = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  },
})

// ── PLUGINS ──────────────────────────────────────────────────
fastify.register(fastifyCors, {
  origin: config.frontendUrl,
  credentials: true,
})

fastify.register(fastifyCookie)

fastify.register(fastifyJWT, {
  secret: config.jwtSecret,
  cookie: { cookieName: 'token', signed: false },
})

// ── DECORADORES ───────────────────────────────────────────────
fastify.decorate('authenticate', async function (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    reply.status(401).send({ error: 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.' })
  }
})

// ── RUTAS ─────────────────────────────────────────────────────
fastify.register(authRouter, { prefix: '/api/auth' })
fastify.register(factoresRouter, { prefix: '/api/factores' })
fastify.register(evaluacionesRouter, { prefix: '/api/evaluaciones' })
fastify.register(usuariosRouter, { prefix: '/api/usuarios' })
fastify.register(iaRouter, { prefix: '/api/ia' })

// Health check
fastify.get('/api/health', async () => {
  return { status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() }
})

// ── MANEJO DE ERRORES ─────────────────────────────────────────
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error)
  const statusCode = error.statusCode || 500
  reply.status(statusCode).send({
    error: error.message || 'Error interno del servidor',
    statusCode,
  })
})

// ── INICIO ────────────────────────────────────────────────────
const start = async () => {
  try {
    await fastify.listen({ port: config.port, host: '0.0.0.0' })
    console.log(`\n🚀 GUIOS PRO v2 Backend corriendo en http://localhost:${config.port}`)
    console.log(`📊 API Health: http://localhost:${config.port}/api/health`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()

// Augment Fastify types for authenticate
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}
