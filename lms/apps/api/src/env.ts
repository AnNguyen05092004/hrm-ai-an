import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.string().default('development'),
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().default('http://localhost:5190'),
  SESSION_DAYS: z.coerce.number().default(14),
  STORAGE_DIR: z.string().default('./storage'),
  AI_PROVIDER: z.enum(['openai', 'mock']).default('mock'),
  OPENAI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default('gpt-5.4-mini'),
  AI_MODEL_STRONG: z.string().default('gpt-5.4'),
  AI_EMBED_MODEL: z.string().default('text-embedding-3-small'),
  AI_TTS_MODEL: z.string().default('gpt-4o-mini-tts'),
  AI_IMAGE_MODEL: z.string().default('gpt-image-2'),
  // Bản demo: bỏ màn đăng nhập, đổi vai bằng một cú bấm. Mặc định bật khi không phải production
  DEMO_MODE: z.enum(['true', 'false']).optional(),
})

export type Env = z.infer<typeof schema>

export function loadEnv(): Env {
  const env = schema.parse(process.env)
  if (env.AI_PROVIDER === 'openai' && !env.OPENAI_API_KEY) {
    throw new Error('AI_PROVIDER=openai cần OPENAI_API_KEY')
  }
  return env
}

export const env: Env = loadEnv()

export const demoMode = (e: Env = env): boolean => (e.DEMO_MODE ? e.DEMO_MODE === 'true' : e.NODE_ENV !== 'production')
