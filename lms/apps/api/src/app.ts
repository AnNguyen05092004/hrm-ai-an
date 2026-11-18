import Fastify, { type FastifyInstance } from 'fastify'
import cookie from '@fastify/cookie'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import { serializerCompiler, validatorCompiler, type ZodTypeProvider, hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod'
import { AppError } from './lib/errors.js'
import { authRoutes } from './modules/auth.js'
import { registerModules } from './modules/index.js'

export const MAX_UPLOAD = 25 * 1024 * 1024

export async function buildApp(opts: { logger?: boolean } = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: opts.logger ?? false, bodyLimit: 5 * 1024 * 1024 }).withTypeProvider<ZodTypeProvider>()
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  await app.register(cookie)
  await app.register(multipart, { limits: { fileSize: MAX_UPLOAD, files: 5 } })
  await app.register(rateLimit, { max: 600, timeWindow: '1 minute' })

  // Chống CSRF: mọi request ghi phải có header riêng (form từ trang khác không gửi được header này)
  app.addHook('onRequest', async (req) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return
    if (req.headers['x-lms'] !== '1') throw new AppError(403, 'csrf', 'Thiếu header bảo vệ')
  })

  app.setErrorHandler((err, req, reply) => {
    if (hasZodFastifySchemaValidationErrors(err)) {
      return reply.status(400).send({ error: { code: 'validation', message: 'Dữ liệu gửi lên không hợp lệ', details: err.validation } })
    }
    if (err instanceof AppError) return reply.status(err.status).send({ error: { code: err.code, message: err.message } })
    const e = err as { statusCode?: number; message?: string; code?: string }
    if (e.statusCode && e.statusCode < 500) {
      return reply.status(e.statusCode).send({ error: { code: e.code ?? 'error', message: e.message ?? 'Lỗi' } })
    }
    req.log.error(err)
    return reply.status(500).send({ error: { code: 'internal', message: 'Lỗi máy chủ, vui lòng thử lại' } })
  })

  app.get('/api/health', async () => ({ ok: true }))
  await app.register(authRoutes, { prefix: '/api/auth' })
  await registerModules(app)
  return app
}

export type App = FastifyInstance
