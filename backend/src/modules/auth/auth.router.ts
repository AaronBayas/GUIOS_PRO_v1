import { FastifyInstance } from 'fastify'
import { registerHandler, loginHandler, logoutHandler, meHandler } from './auth.service'

export async function authRouter(fastify: FastifyInstance) {
  fastify.post('/register', registerHandler)
  fastify.post('/login', loginHandler)
  fastify.post('/logout', logoutHandler)
  fastify.get('/me', {
    preHandler: [fastify.authenticate],
  }, meHandler)
}
