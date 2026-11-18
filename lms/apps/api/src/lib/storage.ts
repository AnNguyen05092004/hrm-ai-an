import { mkdir, writeFile, readFile } from 'node:fs/promises'
import path from 'node:path'
import { env } from '../env.js'

const root = (): string => path.resolve(process.cwd(), env.STORAGE_DIR)

/** Lưu tệp vào thư mục lưu trữ; key chỉ gồm ký tự an toàn để tránh path traversal */
export async function putFile(key: string, data: Buffer): Promise<string> {
  if (!/^[a-zA-Z0-9/_.-]+$/.test(key) || key.includes('..')) throw new Error('khóa tệp không hợp lệ')
  const p = path.join(root(), key)
  await mkdir(path.dirname(p), { recursive: true })
  await writeFile(p, data)
  return key
}

export const filePath = (key: string): string => {
  if (!/^[a-zA-Z0-9/_.-]+$/.test(key) || key.includes('..')) throw new Error('khóa tệp không hợp lệ')
  return path.join(root(), key)
}
export const getFile = (key: string): Promise<Buffer> => readFile(filePath(key))
