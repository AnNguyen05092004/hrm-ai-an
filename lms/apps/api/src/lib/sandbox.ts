// Chạy bài code JavaScript của người thi trong worker thread riêng: không có require, mạng, file;
// giới hạn bộ nhớ và thời gian (NFR03, trường hợp biên #5). Production nên thay bằng sandbox container.
import { Worker } from 'node:worker_threads'

export interface TestCase { name: string; args: string; expected: string }
export interface TestResult { name: string; pass: boolean; got?: string; error?: string }

const PER_TEST_MS = 1000
const TOTAL_MS = 5000

const WORKER = `
const { parentPort, workerData } = require('node:worker_threads')
const vm = require('node:vm')
const { code, tests, perTest } = workerData
const out = []
const ctx = vm.createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false } })
try {
  vm.runInContext(code + '\\n;globalThis.__solve = typeof solve === "function" ? solve : undefined', ctx, { timeout: perTest })
} catch (e) {
  parentPort.postMessage(tests.map((t) => ({ name: t.name, pass: false, error: 'Lỗi biên dịch: ' + String(e && e.message || e).slice(0, 200) })))
  process.exit(0)
}
for (const t of tests) {
  try {
    // chỉ truyền chuỗi (giá trị nguyên thủy) vào vm; parse bên trong để không lộ đối tượng của realm ngoài
    ctx.__argsJson = String(t.args || '[]')
    const got = vm.runInContext('JSON.stringify(__solve(...JSON.parse(__argsJson)))', ctx, { timeout: perTest })
    const exp = JSON.stringify(JSON.parse(t.expected))
    out.push({ name: t.name, pass: got === exp, got: String(got).slice(0, 200) })
  } catch (e) {
    const msg = String(e && e.message || e)
    out.push({ name: t.name, pass: false, error: /timed out/i.test(msg) ? 'Quá thời gian (1 giây)' : msg.slice(0, 200) })
  }
}
parentPort.postMessage(out)
`

export function runTests(code: string, tests: TestCase[]): Promise<TestResult[]> {
  if (!tests.length) return Promise.resolve([])
  return new Promise((resolve) => {
    const w = new Worker(WORKER, { eval: true, env: {}, workerData: { code: code.slice(0, 20_000), tests, perTest: PER_TEST_MS }, resourceLimits: { maxOldGenerationSizeMb: 48, maxYoungGenerationSizeMb: 16, stackSizeMb: 4 } })
    const fail = (error: string) => resolve(tests.map((t) => ({ name: t.name, pass: false, error })))
    const timer = setTimeout(() => { void w.terminate(); fail('Quá thời gian chạy') }, TOTAL_MS)
    w.once('message', (r: TestResult[]) => { clearTimeout(timer); void w.terminate(); resolve(r) })
    w.once('error', (e: Error) => { clearTimeout(timer); fail(/memory/i.test(e.message) ? 'Dùng quá bộ nhớ cho phép' : `Lỗi khi chạy: ${e.message.slice(0, 160)}`) })
  })
}
