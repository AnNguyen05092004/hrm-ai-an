import type { FastifyInstance } from 'fastify'
import { sourceRoutes } from './sources/routes.js'
import { kitRoutes } from './kits/routes.js'
import { examBankRoutes } from './kits/bank.js'
import { artifactRoutes } from './artifacts/routes.js'
import { viewRoutes } from './artifacts/view.js'
import { miscRoutes } from './misc.js'
import { reviewRoutes } from './reviews/routes.js'
import { userRoutes } from './users/routes.js'
import { imageRoutes } from './images/routes.js'
import { videoRoutes } from './video/routes.js'
// đăng ký các job nền
import './sources/service.js'
import './kits/service.js'

export async function registerModules(app: FastifyInstance): Promise<void> {
  await app.register(miscRoutes, { prefix: '/api' })
  await app.register(sourceRoutes, { prefix: '/api/sources' })
  await app.register(kitRoutes, { prefix: '/api/kits' })
  await app.register(examBankRoutes, { prefix: '/api/exams' })
  await app.register(artifactRoutes, { prefix: '/api/artifacts' })
  await app.register(viewRoutes, { prefix: '/api/view' })
  await app.register(reviewRoutes, { prefix: '/api/reviews' })
  await app.register(userRoutes, { prefix: '/api' })
  await app.register(videoRoutes, { prefix: '/api' })
  await app.register(imageRoutes, { prefix: '/api' })
}
