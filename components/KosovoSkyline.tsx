export default function KosovoSkyline() {
  const libraryCubes = [
    { x: 160, y: 430, w: 44, h: 170, d: 2 },
    { x: 208, y: 410, w: 48, h: 190, d: 3 },
    { x: 260, y: 450, w: 40, h: 150, d: 1 },
    { x: 304, y: 390, w: 52, h: 210, d: 3 },
    { x: 360, y: 420, w: 42, h: 180, d: 2 },
    { x: 406, y: 370, w: 50, h: 230, d: 3 },
    { x: 460, y: 440, w: 38, h: 160, d: 1 },
  ]

  const modernTowers = [
    { x: 0, y: 340, w: 120, h: 260, rows: 5, cols: 3, mobile: false },
    { x: 910, y: 330, w: 90, h: 270, rows: 5, cols: 2, mobile: true },
    { x: 1010, y: 360, w: 80, h: 240, rows: 4, cols: 2, mobile: true },
    { x: 1110, y: 310, w: 100, h: 290, rows: 6, cols: 3, mobile: false },
    { x: 1460, y: 350, w: 85, h: 250, rows: 5, cols: 2, mobile: true },
    { x: 1560, y: 320, w: 110, h: 280, rows: 5, cols: 3, mobile: false },
    { x: 1800, y: 340, w: 120, h: 260, rows: 5, cols: 3, mobile: false },
  ]

  const bazaarRoofs = [
    { x: 540, w: 70, h: 45 },
    { x: 610, w: 55, h: 38 },
    { x: 670, w: 80, h: 50 },
    { x: 900, w: 60, h: 40 },
    { x: 1240, w: 75, h: 48 },
    { x: 1320, w: 60, h: 40 },
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
    const padX = t.w / (t.cols + 1)
    const padY = t.h / (t.rows + 1)
    for (let r = 1; r <= t.rows; r++) {
      for (let c = 1; c <= t.cols; c++) {
        windows.push({
          x: t.x + padX * c - 3,
          y: t.y + padY * r - 4,
          w: 5,
          h: 7,
          delay: `${(Math.random() * 4).toFixed(2)}s`,
          mobile: t.mobile,
        })
      }
    }
  })

  libraryCubes.slice(0, 5).forEach((c, i) => {
    windows.push({
      x: c.x + c.w / 2 - 4,
      y: c.y + 24 + (i % 2) * 28,
      w: 6,
      h: 8,
      delay: `${(Math.random() * 4).toFixed(2)}s`,
      mobile: true,
    })
  })

  const mountainLayer = (offset = 0) => (
    <g transform={`translate(${offset},0)`} fill="#2E4699" opacity="0.4">
      <path d="M0,600 L0,380 Q180,260 360,350 T720,300 T1080,340 T1440,290 T1920,360 L1920,600 Z" />
      <path d="M0,600 L0,420 Q220,340 440,400 T880,360 T1320,400 T1920,340 L1920,600 Z" opacity="0.7" />
      <path d="M0,600 L0,460 Q300,400 600,450 T1200,420 T1920,460 L1920,600 Z" opacity="0.6" />
    </g>
  )

  const midgroundLayer = (offset = 0) => (
    <g transform={`translate(${offset},0)`} fill="#16296B" opacity="0.7">
      <rect x="0" y="360" width="140" height="240" />
      <rect x="1780" y="360" width="140" height="240" />

      <path d="M140,600 Q260,330 360,330 Q460,330 540,600 Z" />
      <path d="M260,330 L260,300 L280,300 L280,315 L300,315 L300,295 L320,295 L320,315 L340,315 L340,300 L360,300 L360,330 Z" />

      <rect x="470" y="420" width="90" height="180" />
      <path d="M470,420 Q515,360 560,420 Z" />
      <rect x="570" y="300" width="10" height="300" />

      {bazaarRoofs.map((r, i) => (
        <path key={i} d={`M${r.x},600 L${r.x + r.w / 2},${600 - r.h} L${r.x + r.w},600 Z`} />
      ))}

      <rect x="780" y="380" width="80" height="220" />
      <g transform="translate(820,380)">
        <rect x="-3" y="-70" width="6" height="70" />
        <g className="kosovo-crane">
          <line x1="0" y1="-66" x2="80" y2="-90" stroke="#16296B" strokeWidth="5" />
          <line x1="0" y1="-66" x2="-22" y2="-50" stroke="#16296B" strokeWidth="4" />
        </g>
      </g>

      <rect x="980" y="400" width="70" height="200" />
      <path d="M1150,600 L1150,430 L1200,400 L1250,430 L1250,600 Z" />
      <rect x="1400" y="390" width="60" height="210" />
      <rect x="1680" y="410" width="70" height="190" />
    </g>
  )

  const foregroundLayer = (offset = 0) => (
    <g transform={`translate(${offset},0)`} fill="#0A153A">
      <rect x="0" y="340" width="120" height="260" />
      <rect x="1800" y="340" width="120" height="260" />

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

      <rect x="500" y="300" width="50" height="300" />
      <path d="M490,300 L525,250 L560,300 Z" />
      <line x1="525" y1="250" x2="525" y2="225" stroke="#0A153A" strokeWidth="4" />
      <line x1="515" y1="235" x2="535" y2="235" stroke="#0A153A" strokeWidth="4" />
      <rect x="560" y="380" width="95" height="220" />
      <path d="M555,380 L607.5,330 L660,380 Z" />

      <rect x="685" y="280" width="35" height="320" />
      <path d="M680,280 L702.5,230 L725,280 Z" />
      <circle cx="702.5" cy="330" r="9" fill="#1B4FFF" opacity="0.6" />

      <rect x="750" y="400" width="110" height="200" />
      <path d="M750,400 Q805,320 860,400 Z" />
      <rect x="875" y="240" width="12" height="360" />
      <circle cx="881" cy="230" r="9" />

      <rect x="910" y="330" width="90" height="270" />
      <rect x="1010" y="360" width="80" height="240" />
      <rect x="1110" y="310" width="100" height="290" />

      <g transform="translate(1330,565)">
        <rect x="0" y="0" width="12" height="30" />
        <rect x="16" y="5" width="10" height="25" />
        <rect x="30" y="0" width="12" height="30" />
        <rect x="46" y="8" width="12" height="22" />
        <rect x="62" y="0" width="12" height="30" />
        <rect x="78" y="5" width="10" height="25" />
        <rect x="92" y="0" width="12" height="30" />
      </g>

      <rect x="1460" y="350" width="85" height="250" />
      <rect x="1560" y="320" width="110" height="280" />

      <g fill="#FFD98A" opacity="0.65">
        {windows.map((w, i) => (
          <rect
            key={i}
            x={w.x}
            y={w.y}
            width={w.w}
            height={w.h}
            rx="1"
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

      <g className="kosovo-layer kosovo-layer-fg">
        {foregroundLayer()}
        {foregroundLayer(1920)}
      </g>

      <g className="kosovo-birds" fill="none" stroke="#0A153A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M0,0 L12,8 L24,0" className="kosovo-bird kosovo-bird-1" />
        <path d="M0,0 L10,7 L20,0" className="kosovo-bird kosovo-bird-2" />
      </g>
    </svg>
  )
}
