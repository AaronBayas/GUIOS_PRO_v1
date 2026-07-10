"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    port: parseInt(process.env.PORT || '3001'),
    nodeEnv: process.env.NODE_ENV || 'development',
    jwtSecret: process.env.JWT_SECRET || 'fallback_secret_change_me',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
    aiProvider: process.env.AI_PROVIDER || 'anthropic',
    aiApiKey: process.env.AI_API_KEY || '',
    aiModel: process.env.AI_MODEL || 'claude-sonnet-4-6',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
};
//# sourceMappingURL=env.js.map