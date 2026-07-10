"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
const cookie_1 = __importDefault(require("@fastify/cookie"));
const cors_1 = __importDefault(require("@fastify/cors"));
const env_1 = require("./config/env");
const auth_router_1 = require("./modules/auth/auth.router");
const factores_router_1 = require("./modules/factores/factores.router");
const evaluaciones_router_1 = require("./modules/evaluaciones/evaluaciones.router");
const usuarios_router_1 = require("./modules/usuarios/usuarios.router");
const ia_service_1 = require("./modules/ia/ia.service");
const fastify = (0, fastify_1.default)({
    logger: {
        transport: {
            target: 'pino-pretty',
            options: { colorize: true },
        },
    },
});
// ── PLUGINS ──────────────────────────────────────────────────
fastify.register(cors_1.default, {
    origin: env_1.config.frontendUrl,
    credentials: true,
});
fastify.register(cookie_1.default);
fastify.register(jwt_1.default, {
    secret: env_1.config.jwtSecret,
    cookie: { cookieName: 'token', signed: false },
});
// ── DECORADORES ───────────────────────────────────────────────
fastify.decorate('authenticate', async function (request, reply) {
    try {
        await request.jwtVerify();
    }
    catch {
        reply.status(401).send({ error: 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.' });
    }
});
// ── RUTAS ─────────────────────────────────────────────────────
fastify.register(auth_router_1.authRouter, { prefix: '/api/auth' });
fastify.register(factores_router_1.factoresRouter, { prefix: '/api/factores' });
fastify.register(evaluaciones_router_1.evaluacionesRouter, { prefix: '/api/evaluaciones' });
fastify.register(usuarios_router_1.usuariosRouter, { prefix: '/api/usuarios' });
fastify.register(ia_service_1.iaRouter, { prefix: '/api/ia' });
// Health check
fastify.get('/api/health', async () => {
    return { status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() };
});
// ── MANEJO DE ERRORES ─────────────────────────────────────────
fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);
    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send({
        error: error.message || 'Error interno del servidor',
        statusCode,
    });
});
// ── INICIO ────────────────────────────────────────────────────
const start = async () => {
    try {
        await fastify.listen({ port: env_1.config.port, host: '0.0.0.0' });
        console.log(`\n🚀 GUIOS PRO v2 Backend corriendo en http://localhost:${env_1.config.port}`);
        console.log(`📊 API Health: http://localhost:${env_1.config.port}/api/health`);
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();
//# sourceMappingURL=server.js.map