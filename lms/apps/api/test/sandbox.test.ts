import { describe, it, expect } from 'vitest'
import { runTests } from '../src/lib/sandbox.js'

const T = [{ name: 'cộng', args: '[1, 2]', expected: '3' }, { name: 'âm', args: '[-1, 5]', expected: '4' }]

describe('code sandbox', () => {
  it('passes correct solutions', async () => {
    const r = await runTests('function solve(a, b) { return a + b }', T)
    expect(r.every((x) => x.pass)).toBe(true)
  })
  it('reports wrong answers', async () => {
    const r = await runTests('function solve(a, b) { return a - b }', T)
    expect(r.map((x) => x.pass)).toEqual([false, false])
  })
  it('stops infinite loops', async () => {
    const r = await runTests('function solve() { while (true) {} }', T)
    expect(r[0].pass).toBe(false)
    expect(r[0].error).toContain('Quá thời gian')
  })
  it('has no access to require or process', async () => {
    const r = await runTests('function solve() { return typeof require + typeof process }', [{ name: 'x', args: '[]', expected: '"undefinedundefined"' }])
    expect(r[0].pass).toBe(true)
  })
  it('reports syntax errors', async () => {
    const r = await runTests('function solve( {', T)
    expect(r[0].error).toContain('Lỗi biên dịch')
  })
})

describe('code sandbox isolation', () => {
  it('cannot reach the host process through argument objects', async () => {
    const code = 'function solve(a) { try { return String(a.constructor.constructor("return process")().env.OPENAI_API_KEY) } catch (e) { return "blocked" } }'
    const r = await runTests(code, [{ name: 'escape', args: '[[1]]', expected: '"blocked"' }])
    expect(r[0].pass).toBe(true)
  })
})
