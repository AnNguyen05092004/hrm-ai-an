// Hiển thị Markdown tối giản (đậm, mã, khối mã, danh sách) bằng phần tử React, không dùng HTML thô.
import { Fragment } from 'react'

function inline(text, key) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <b key={`${key}-${i}`}>{p.slice(2, -2)}</b>
    if (p.startsWith('`') && p.endsWith('`')) return <code key={`${key}-${i}`} className="rounded bg-black/5 px-1 font-mono text-[0.92em]">{p.slice(1, -1)}</code>
    return <Fragment key={`${key}-${i}`}>{p}</Fragment>
  })
}

export function Md({ text = '' }) {
  const out = []
  const chunks = text.split(/```[a-z]*\n?/)
  chunks.forEach((c, i) => {
    if (i % 2 === 1) { out.push(<pre key={`c${i}`} className="my-2 overflow-x-auto rounded-lg bg-[#1e1e2e] p-3 font-mono text-[12px] leading-relaxed text-[#e5e7eb]">{c.replace(/\n$/, '')}</pre>); return }
    const lines = c.split('\n')
    let list = []
    const flush = (k) => { if (list.length) { out.push(<ul key={`l${k}`} className="my-1 list-disc space-y-0.5 pl-5">{list}</ul>); list = [] } }
    lines.forEach((l, j) => {
      const m = l.match(/^\s*(?:[-*]|\d+[.)])\s+(.*)$/)
      if (m) { list.push(<li key={j}>{inline(m[1], `${i}-${j}`)}</li>); return }
      flush(`${i}-${j}`)
      if (l.trim()) out.push(<p key={`p${i}-${j}`} className="my-1">{inline(l, `${i}-${j}`)}</p>)
    })
    flush(`${i}-end`)
  })
  return <>{out}</>
}
