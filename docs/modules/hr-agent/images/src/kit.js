// Vẽ mũi tên nối giữa các ô trong #canvas.
// link('a', 'b', { from: 'b', to: 't', dash: true, label: 'Có', color: '#...', fx: 0.5, tx: 0.5, mid: 0.5 })
//   from/to: cạnh xuất phát/kết thúc: t (trên), b (dưới), l (trái), r (phải)
//   fx/tx: vị trí dọc theo cạnh (0..1), mid: chỗ bẻ góc (0..1)
const K = {
  links: [],
  link(a, b, o = {}) { this.links.push([a, b, o]); },
  draw() {
    const cv = document.getElementById('canvas');
    const base = cv.getBoundingClientRect();
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'links');
    svg.setAttribute('width', cv.offsetWidth); svg.setAttribute('height', cv.offsetHeight);
    const defs = document.createElementNS(NS, 'defs'); svg.appendChild(defs);
    const markers = {};
    const marker = color => {
      if (markers[color]) return markers[color];
      const id = 'm' + Object.keys(markers).length;
      const m = document.createElementNS(NS, 'marker');
      m.setAttribute('id', id); m.setAttribute('viewBox', '0 0 10 10'); m.setAttribute('refX', '9'); m.setAttribute('refY', '5');
      m.setAttribute('markerWidth', '7'); m.setAttribute('markerHeight', '7'); m.setAttribute('orient', 'auto-start-reverse');
      m.innerHTML = `<path d="M0,0 L10,5 L0,10 z" fill="${color}"/>`;
      defs.appendChild(m); return (markers[color] = id);
    };
    const box = id => { const r = document.getElementById(id).getBoundingClientRect();
      return { l: r.left - base.left, t: r.top - base.top, r: r.right - base.left, b: r.bottom - base.top, w: r.width, h: r.height }; };
    const pt = (r, side, f = 0.5) => ({
      t: [r.l + r.w * f, r.t], b: [r.l + r.w * f, r.b], l: [r.l, r.t + r.h * f], r: [r.r, r.t + r.h * f] })[side];
    const rounded = (pts, rad = 9) => {
      let d = `M${pts[0][0]},${pts[0][1]}`;
      for (let i = 1; i < pts.length - 1; i++) {
        const [px, py] = pts[i - 1], [x, y] = pts[i], [nx, ny] = pts[i + 1];
        const d1 = Math.hypot(x - px, y - py), d2 = Math.hypot(nx - x, ny - y);
        const r = Math.min(rad, d1 / 2, d2 / 2);
        const ax = x - (x - px) / d1 * r, ay = y - (y - py) / d1 * r;
        const bx = x + (nx - x) / d2 * r, by = y + (ny - y) / d2 * r;
        d += ` L${ax},${ay} Q${x},${y} ${bx},${by}`;
      }
      const last = pts[pts.length - 1]; return d + ` L${last[0]},${last[1]}`;
    };
    const labels = [];
    this.links.forEach(([a, b, o]) => {
      const A = box(a), B = box(b);
      const from = o.from || 'b', to = o.to || 't';
      const P = pt(A, from, o.fx ?? 0.5), Q = pt(B, to, o.tx ?? 0.5);
      const vert = s => s === 't' || s === 'b';
      if (vert(from) && vert(to) && Math.abs(P[0] - Q[0]) < 6) Q[0] = P[0];          // nắn thẳng chỗ lệch nhỏ
      if (!vert(from) && !vert(to) && Math.abs(P[1] - Q[1]) < 6) Q[1] = P[1];
      let pts;
      if (from === to) {                     // vòng ra ngoài cùng một cạnh
        const out = o.out ?? 20;
        if (vert(from)) { const y = from === 'b' ? Math.max(P[1], Q[1]) + out : Math.min(P[1], Q[1]) - out; pts = [P, [P[0], y], [Q[0], y], Q]; }
        else { const x = from === 'r' ? Math.max(P[0], Q[0]) + out : Math.min(P[0], Q[0]) - out; pts = [P, [x, P[1]], [x, Q[1]], Q]; }
      } else if (vert(from) && vert(to)) {
        const my = P[1] + (Q[1] - P[1]) * (o.mid ?? 0.5);
        pts = Math.abs(P[0] - Q[0]) < 1 ? [P, Q] : [P, [P[0], my], [Q[0], my], Q];
      } else if (!vert(from) && !vert(to)) {
        const mx = P[0] + (Q[0] - P[0]) * (o.mid ?? 0.5);
        pts = Math.abs(P[1] - Q[1]) < 1 ? [P, Q] : [P, [mx, P[1]], [mx, Q[1]], Q];
      } else if (vert(from)) pts = [P, [P[0], Q[1]], Q];
      else pts = [P, [Q[0], P[1]], Q];
      const color = o.color || '#9AA5B8';
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', rounded(pts)); path.setAttribute('fill', 'none'); path.setAttribute('stroke', color);
      path.setAttribute('stroke-width', o.width || 1.8); path.setAttribute('stroke-linejoin', 'round');
      if (o.dash) path.setAttribute('stroke-dasharray', '6 4');
      if (!o.noArrow) path.setAttribute('marker-end', `url(#${marker(color)})`);
      svg.appendChild(path);
      if (o.label) {
        const i = Math.floor((pts.length - 1) / 2);
        const lx = o.lx ?? (pts[i][0] + pts[i + 1][0]) / 2, ly = o.ly ?? (pts[i][1] + pts[i + 1][1]) / 2;
        labels.push([lx + (o.dx || 0), ly + (o.dy || 0), o.label, color]);
      }
    });
    cv.insertBefore(svg, cv.firstChild);
    labels.forEach(([x, y, t, color]) => {
      const tx = document.createElementNS(NS, 'text');
      tx.setAttribute('x', x); tx.setAttribute('y', y); tx.setAttribute('text-anchor', 'middle');
      tx.setAttribute('dominant-baseline', 'central'); tx.setAttribute('font-size', '11.5'); tx.setAttribute('font-weight', '700');
      tx.setAttribute('fill', color === '#9AA5B8' ? '#4B5563' : color); tx.textContent = t;
      svg.appendChild(tx);
      const bb = tx.getBBox();
      const bg = document.createElementNS(NS, 'rect');
      bg.setAttribute('x', bb.x - 6); bg.setAttribute('y', bb.y - 2); bg.setAttribute('width', bb.width + 12); bg.setAttribute('height', bb.height + 4);
      bg.setAttribute('rx', 8); bg.setAttribute('fill', '#fff'); bg.setAttribute('stroke', '#E5E7EB');
      svg.insertBefore(bg, tx);
    });
    // nhãn nằm trên ô
    const top = svg.cloneNode(false); top.setAttribute('class', 'links'); top.style.zIndex = 4; top.style.pointerEvents = 'none';
    [...svg.querySelectorAll('rect[rx="8"], text')].forEach(n => top.appendChild(n));
    cv.appendChild(top);
    document.title = `${Math.ceil(cv.offsetWidth)}x${Math.ceil(cv.offsetHeight)}`;
  },
};
