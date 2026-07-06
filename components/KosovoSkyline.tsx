export default function KosovoSkyline() {
  const libraryCubes = [
    { x: 155, y: 430, w: 42, h: 170, d: 2 },
    { x: 203, y: 405, w: 46, h: 195, d: 3 },
    { x: 255, y: 450, w: 38, h: 150, d: 1 },
    { x: 299, y: 385, w: 50, h: 215, d: 3 },
    { x: 355, y: 420, w: 40, h: 180, d: 2 },
    { x: 401, y: 365, w: 48, h: 235, d: 3 },
    { x: 455, y: 440, w: 36, h: 160, d: 1 },
    { x: 495, y: 470, w: 34, h: 130, d: 2 },
  ]

  const modernTowers = [
    { x: 0, y: 350, w: 115, h: 250, rows: 8, cols: 5, mobile: false, tank: false },
    { x: 905, y: 335, w: 72, h: 265, rows: 9, cols: 3, mobile: true, tank: true },
    { x: 995, y: 370, w: 98, h: 230, rows: 7, cols: 5, mobile: true, tank: false },
    { x: 1115, y: 310, w: 88, h: 290, rows: 10, cols: 4, mobile: false, tank: true },
    { x: 1465, y: 350, w: 78, h: 250, rows: 8, cols: 3, mobile: true, tank: false },
    { x: 1565, y: 320, w: 105, h: 280, rows: 9, cols: 5, mobile: false, tank: true },
    { x: 1805, y: 350, w: 115, h: 250, rows: 8, cols: 5, mobile: false, tank: false },
  ]

  const bazaarRoofs = [
    { x: 535, w: 72, h: 48 },
    { x: 608, w: 58, h: 40 },
    { x: 668, w: 82, h: 52 },
    { x: 895, w: 62, h: 42 },
    { x: 1235, w: 78, h: 50 },
    { x: 1318, w: 62, h: 42 },
  ]

  const stars = [
    { cx: 180, cy: 70, r: 1.4 },
    { cx: 420, cy: 45, r: 1.8 },
    { cx: 700, cy: 90, r: 1.2 },
    { cx: 980, cy: 55, r: 1.6 },
    { cx: 1260, cy: 80, r: 1.3 },
    { cx: 1520, cy: 40, r: 1.7 },
    { cx: 1740, cy: 95, r: 1.2 },
  ]

  const windows: { x: number; y: number; w: number; h: number; delay: string; mobile?: boolean }[] = []

  modernTowers.forEach((t) => {
    const marginX = 7
    const marginY = 12
    const stepX = (t.w - marginX * 2) / (t.cols - 1)
    const stepY = (t.h - marginY * 2) / (t.rows - 1)
    for (let r = 0; r < t.rows; r++) {
      for (let c = 0; c < t.cols; c++) {
        windows.push({
          x: t.x + marginX + stepX * c - 1.5,
          y: t.y + marginY + stepY * r - 2.5,
          w: 3,
          h: 5,
          delay: `${(Math.random() * 4).toFixed(2)}s`,
          mobile: t.mobile,
        })
      }
    }
  })

  libraryCubes.forEach((c, i) => {
    windows.push({
      x: c.x + 8,
      y: c.y + 22,
      w: 3,
      h: 4,
      delay: `${(Math.random() * 4).toFixed(2)}s`,
      mobile: true,
    })
    if (i % 2 === 0) {
      windows.push({
        x: c.x + c.w - 11,
        y: c.y + 48,
        w: 3,
        h: 4,
        delay: `${(Math.random() * 4).toFixed(2)}s`,
        mobile: true,
      })
    }
  })

  const mountainLayer = (offset = 0) => (
    <g transform={`translate(${offset},0)`} fill="#6B5B95" opacity="0.25">
      <path d="M0,600 L0,380 Q180,260 360,350 T720,300 T1080,340 T1440,290 T1920,360 L1920,600 Z" />
      <path d="M0,600 L0,420 Q220,340 440,400 T880,360 T1320,400 T1920,340 L1920,600 Z" opacity="0.7" />
      <path d="M0,600 L0,460 Q300,400 600,450 T1200,420 T1920,460 L1920,600 Z" opacity="0.6" />
    </g>
  )

  const midgroundLayer = (offset = 0) => (
    <g transform={`translate(${offset},0)`} fill="#16296B" opacity="0.7">
      <rect x="0" y="365" width="135" height="235" />
      <rect x="1785" y="365" width="135" height="235" />

      <path d="M135,600 Q255,335 355,335 Q455,335 545,600 Z" />
      <path d="M255,335 L255,305 L275,305 L275,320 L295,320 L295,300 L315,300 L315,320 L335,320 L335,305 L355,305 L355,335 Z" />

      <rect x="465" y="425" width="92" height="175" />
      <path d="M465,425 Q511,365 557,425 Z" />
      <rect x="567" y="305" width="10" height="295" />

      {bazaarRoofs.map((r, i) => (
        <path key={i} d={`M${r.x},600 L${r.x + r.w / 2},${600 - r.h} L${r.x + r.w},600 Z`} />
      ))}

      <rect x="775" y="385" width="82" height="215" />
      <g transform="translate(816,385)">
        <rect x="-3" y="-68" width="6" height="68" />
        <g className="kosovo-crane">
          <line x1="0" y1="-66" x2="80" y2="-90" stroke="#16296B" strokeWidth="5" />
          <line x1="0" y1="-66" x2="-22" y2="-50" stroke="#16296B" strokeWidth="4" />
        </g>
      </g>

      <rect x="975" y="405" width="72" height="195" />
      <path d="M1145,600 L1145,435 L1195,405 L1245,435 L1245,600 Z" />
      <rect x="1395" y="395" width="62" height="205" />
      <rect x="1675" y="415" width="72" height="185" />
    </g>
  )

  const foregroundLayer = (offset = 0) => (
    <g transform={`translate(${offset},0)`} fill="#081333">
      <rect x="0" y="350" width="115" height="250" />
      <rect x="1805" y="350" width="115" height="250" />

      <g>
        {libraryCubes.map((c, i) => (
          <g key={i}>
            <rect x={c.x} y={c.y} width={c.w} height={c.h} />
            {Array.from({ length: c.d }).map((_, d) => (
              <circle key={d} cx={c.x + (c.w * (d + 1)) / (c.d + 1)} cy={c.y - 2} r={3} />
            ))}
          </g>
        ))}
      </g>

      <rect x="495" y="300" width="52" height="300" />
      <path d="M485,300 L521,248 L557,300 Z" />
      <line x1="521" y1="248" x2="521" y2="222" stroke="#081333" strokeWidth="4" />
      <line x1="511" y1="233" x2="531" y2="233" stroke="#081333" strokeWidth="4" />
      <rect x="557" y="380" width="98" height="220" />
      <path d="M552,380 L606,328 L660,380 Z" />

      <rect x="682" y="280" width="36" height="320" />
      <path d="M677,280 L700,228 L723,280 Z" />
      <circle cx="700" cy="330" r="9" fill="#1B4FFF" opacity="0.6" />

      <rect x="748" y="400" width="112" height="200" />
      <path d="M748,400 Q804,318 860,400 Z" />
      <rect x="876" y="240" width="12" height="360" />
      <circle cx="882" cy="230" r="9" />

      {modernTowers.slice(1, 4).map((t, i) => (
        <g key={i}>
          <rect x={t.x} y={t.y} width={t.w} height={t.h} />
          {t.tank && (
            <>
              <rect x={t.x + t.w / 2 - 7} y={t.y - 10} width="14" height="10" rx="2" />
              <circle cx={t.x + t.w / 2} cy={t.y - 12} r="5" />
            </>
          )}
        </g>
      ))}

      <g transform="translate(1325,565)">
        <rect x="0" y="0" width="12" height="30" />
        <rect x="16" y="5" width="10" height="25" />
        <rect x="30" y="0" width="12" height="30" />
        <rect x="46" y="8" width="12" height="22" />
        <rect x="62" y="0" width="12" height="30" />
        <rect x="78" y="5" width="10" height="25" />
        <rect x="92" y="0" width="12" height="30" />
      </g>

      <rect x="1465" y="350" width="78" height="250" />
      {modernTowers[5].tank && (
        <>
          <rect x={modernTowers[5].x + modernTowers[5].w / 2 - 7} y={modernTowers[5].y - 10} width="14" height="10" rx="2" />
          <circle cx={modernTowers[5].x + modernTowers[5].w / 2} cy={modernTowers[5].y - 12} r="5" />
        </>
      )}
      <rect x="1565" y="320" width="105" height="280" />

      <g fill="#FFD98A" opacity="0.65">
        {windows.map((w, i) => (
          <rect
            key={i}
            x={w.x}
            y={w.y}
            width={w.w}
            height={w.h}
            rx="0.5"
            className={`kosovo-window ${w.mobile ? '' : 'hidden sm:block'}`}
            style={{ animationDelay: w.delay }}
          />
        ))}
      </g>
    </g>
  )

  return (
    <svg
      viewBox="0 0 1920 600"
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-0 w-full h-full"
      aria-label="Horizonti i Kosovës"
      role="img"
    >
      <defs>
        <linearGradient id="kosovoSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0F1D4D" />
          <stop offset="40%" stopColor="#1B4FFF" />
          <stop offset="75%" stopColor="#6D8DFF" />
          <stop offset="100%" stopColor="#FFF4E0" />
        </linearGradient>
        <linearGradient id="horizonGlow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF9A3C" stopOpacity="0" />
          <stop offset="50%" stopColor="#FF9A3C" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FF9A3C" stopOpacity="0" />
        </linearGradient>
        <filter id="kosovoBlur">
          <feGaussianBlur stdDeviation="18" />
        </filter>
      </defs>

      <rect width="1920" height="600" fill="url(#kosovoSky)" />

      <g className="kosovo-stars">
        {stars.map((s, i) => (
          <circle
            key={i}
            cx={s.cx}
            cy={s.cy}
            r={s.r}
            fill="#ffffff"
            className="kosovo-star"
            style={{ animationDelay: `${i * 0.7}s` }}
          />
        ))}
      </g>

      <g className="kosovo-clouds" opacity="0.32" filter="url(#kosovoBlur)">
        <ellipse cx="280" cy="110" rx="180" ry="34" fill="#ffffff" className="kosovo-cloud kosovo-cloud-1" />
        <ellipse cx="1000" cy="170" rx="240" ry="42" fill="#ffffff" className="kosovo-cloud kosovo-cloud-2" />
        <ellipse cx="1660" cy="90" rx="160" ry="30" fill="#ffffff" className="kosovo-cloud kosovo-cloud-3" />
      </g>

      <g className="kosovo-layer kosovo-layer-bg hidden sm:block">
        {mountainLayer()}
        {mountainLayer(1920)}
      </g>

      <g className="kosovo-layer kosovo-layer-mg">
        {midgroundLayer()}
        {midgroundLayer(1920)}
      </g>

      {/* Warm horizon glow */}
      <rect x="-200" y="520" width="2320" height="140" fill="url(#horizonGlow)" opacity="0.7" pointerEvents="none" />

      <g className="kosovo-layer kosovo-layer-fg">
        {foregroundLayer()}
        {foregroundLayer(1920)}
      </g>

      <g className="kosovo-birds" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.75">
        <path d="M0,0 L12,8 L24,0" className="kosovo-bird kosovo-bird-1" />
        <path d="M0,0 L10,7 L20,0" className="kosovo-bird kosovo-bird-2" />
      </g>
    </svg>
  )
}
