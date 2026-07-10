"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = authRouter;
const auth_service_1 = require("./auth.service");
async function authRouter(fastify) {
    fastify.post('/register', auth_service_1.registerHandler);
    fastify.post('/login', auth_service_1.loginHandler);
    fastify.post('/logout', auth_service_1.logoutHandler);
    fastify.get('/me', {
        preHandler: [fastify.authenticate],
    }, auth_service_1.meHandler);
}
//# sourceMappingURL=auth.router.js.map