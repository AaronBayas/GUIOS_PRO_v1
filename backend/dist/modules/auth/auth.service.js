"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerHandler = registerHandler;
exports.loginHandler = loginHandler;
exports.logoutHandler = logoutHandler;
exports.meHandler = meHandler;
const database_1 = require("../../config/database");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const registerSchema = zod_1.z.object({
    usuario_name: zod_1.z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    email: zod_1.z.string().email('Email inválido'),
    password: zod_1.z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email inválido'),
    password: zod_1.z.string().min(1, 'La contraseña es requerida'),
});
async function registerHandler(req, reply) {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
        return reply.status(400).send({ error: result.error.errors[0].message });
    }
    const { usuario_name, email, password } = result.data;
    const existing = await database_1.prisma.usuario.findUnique({ where: { email } });
    if (existing) {
        return reply.status(409).send({ error: 'El email ya está registrado' });
    }
    // Primer usuario → Administrador
    const totalUsers = await database_1.prisma.usuario.count();
    const rolAdmin = await database_1.prisma.rol.findFirst({ where: { rol_name: 'Administrador' } });
    const rolEvaluador = await database_1.prisma.rol.findFirst({ where: { rol_name: 'Evaluador' } });
    if (!rolAdmin || !rolEvaluador) {
        return reply.status(500).send({ error: 'Roles no configurados. Ejecute el seed primero.' });
    }
    const rol_id = totalUsers === 0 ? rolAdmin.rol_id : rolEvaluador.rol_id;
    const password_hash = await bcryptjs_1.default.hash(password, 12);
    const usuario = await database_1.prisma.usuario.create({
        data: { usuario_name, email, password_hash, rol_id, activo: true },
        include: { rol: true },
    });
    const token = req.server.jwt.sign({ usuario_id: usuario.usuario_id, email: usuario.email, rol: usuario.rol.rol_name }, { expiresIn: '8h' });
    reply.setCookie('token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 8,
    });
    return reply.status(201).send({
        usuario: {
            usuario_id: usuario.usuario_id,
            usuario_name: usuario.usuario_name,
            email: usuario.email,
            rol: usuario.rol.rol_name,
        },
    });
}
async function loginHandler(req, reply) {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
        return reply.status(400).send({ error: result.error.errors[0].message });
    }
    const { email, password } = result.data;
    const usuario = await database_1.prisma.usuario.findUnique({
        where: { email },
        include: { rol: true },
    });
    if (!usuario || !usuario.activo) {
        return reply.status(401).send({ error: 'Credenciales inválidas' });
    }
    const valid = await bcryptjs_1.default.compare(password, usuario.password_hash);
    if (!valid) {
        return reply.status(401).send({ error: 'Credenciales inválidas' });
    }
    const token = req.server.jwt.sign({ usuario_id: usuario.usuario_id, email: usuario.email, rol: usuario.rol.rol_name }, { expiresIn: '8h' });
    reply.setCookie('token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 8,
    });
    return reply.send({
        usuario: {
            usuario_id: usuario.usuario_id,
            usuario_name: usuario.usuario_name,
            email: usuario.email,
            rol: usuario.rol.rol_name,
        },
    });
}
async function logoutHandler(req, reply) {
    reply.clearCookie('token', { path: '/' });
    return reply.send({ message: 'Sesión cerrada' });
}
async function meHandler(req, reply) {
    try {
        const payload = req.user;
        const usuario = await database_1.prisma.usuario.findUnique({
            where: { usuario_id: payload.usuario_id },
            include: { rol: true },
        });
        if (!usuario || !usuario.activo) {
            return reply.status(401).send({ error: 'Sesión inválida' });
        }
        return reply.send({
            usuario: {
                usuario_id: usuario.usuario_id,
                usuario_name: usuario.usuario_name,
                email: usuario.email,
                rol: usuario.rol.rol_name,
            },
        });
    }
    catch {
        return reply.status(401).send({ error: 'Token inválido' });
    }
}
//# sourceMappingURL=auth.service.js.map