import type { FastifyInstance } from 'fastify'
import { sourceRoutes } from './sources/routes.js'
import { kitRoutes } from './kits/routes.js'
import { artifactRoutes } from './artifacts/routes.js'
import { miscRoutes } from './misc.js'
import { peopleRoutes } from './people/routes.js'
import { learnRoutes } from './learn/routes.js'
import { tutorRoutes } from './tutor/routes.js'
import { examRoutes, gradingRoutes } from './exams/routes.js'
import { analyticsRoutes } from './analytics/routes.js'
import { workforceRoutes } from './workforce/routes.js'
import { imageRoutes } from './images/routes.js'
import { videoRoutes } from './video/routes.js'
// đăng ký các job nền
import './sources/service.js'
import './kits/service.js'

export async function registerModules(app: FastifyInstance): Promise<void> {
  await app.register(miscRoutes, { prefix: '/api' })
  await app.register(sourceRoutes, { prefix: '/api/sources' })
  await app.register(kitRoutes, { prefix: '/api/kits' })
  await app.register(artifactRoutes, { prefix: '/api/artifacts' })
  await app.register(peopleRoutes, { prefix: '/api' })
  await app.register(learnRoutes, { prefix: '/api/learn' })
  await app.register(tutorRoutes, { prefix: '/api/tutor' })
  await app.register(examRoutes, { prefix: '/api/exams' })
  await app.register(gradingRoutes, { prefix: '/api/grading' })
  await app.register(analyticsRoutes, { prefix: '/api' })
  await app.register(workforceRoutes, { prefix: '/api/workforce' })
  await app.register(videoRoutes, { prefix: '/api' })
  await app.register(imageRoutes, { prefix: '/api' })
}
