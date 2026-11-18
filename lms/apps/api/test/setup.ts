import path from 'node:path'

process.loadEnvFile(path.resolve(import.meta.dirname, '../../../.env'))
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
process.env.AI_PROVIDER = 'mock'
process.env.STORAGE_DIR = path.resolve(import.meta.dirname, '../.test-storage')
