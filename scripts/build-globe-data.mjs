// Precomputes the globe's land dots + coastline outlines into a compact binary
// so the browser never fetches the 2.7MB Natural Earth GeoJSON nor rasterizes it.
//
// Replicates, offline, the algorithms previously run in the browser by
// components/originkit/ui/globe-variant-3.tsx:
//   - dot grid loop  (baseStep = mapDensityUiToSpacing(density) * 0.08)
//   - isOnLand       (2048x1024 equirectangular raster, pixel > 128)
//   - outline rings  (outer ring per polygon, simplifyRing(detail))
//
// Output: public/globe/land.bin
//   uint32 dotCount
//   int16[dotCount*2]        lat*100, lng*100
//   uint32 ringCount
//   per ring: uint32 pointCount, int16[pointCount*2]  lat*100, lng*100
//
// Usage: node scripts/build-globe-data.mjs [--density 7] [--detail 5]

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");
const cacheDir = join(here, ".cache");
const srcPath = join(cacheDir, "ne_50m_land.json");
const outPath = join(repoRoot, "public", "globe", "land.bin");

const args = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : dflt;
};
const DENSITY = arg("density", 7);
const DETAIL = arg("detail", 5);

// --- mapping helpers, copied verbatim from globe-variant-3.tsx ---
const mapLinear = (v, a, b, c, d) => c + ((v - a) / (b - a)) * (d - c);
const mapDensityUiToSpacing = (ui) =>
  mapLinear(Math.max(1, Math.min(10, ui)), 1, 10, 24, 8);
const mapDetailToStepSize = (ui) =>
  mapLinear(Math.max(1, Math.min(10, ui)), 1, 10, 10, 1);

if (!existsSync(srcPath)) {
  mkdirSync(cacheDir, { recursive: true });
  const url =
    "https://raw.githubusercontent.com/martynafford/natural-earth-geojson/refs/heads/master/50m/physical/ne_50m_land.json";
  console.log(`downloading ${url} ...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  writeFileSync(srcPath, Buffer.from(await res.arrayBuffer()));
}

const land = JSON.parse(readFileSync(srcPath, "utf8"));

// --- rasterize land into a 2048x1024 equirectangular mask (scanline, even-odd) ---
const W = 2048;
const H = 1024;
const mask = new Uint8Array(W * H);
const px = (lng) => ((lng + 180) / 360) * W;
const py = (lat) => ((90 - lat) / 180) * H;

const fillRing = (ring) => {
  const pts = ring.map(([lng, lat]) => [px(lng), py(lat)]);
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [, y] of pts) {
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const y0 = Math.max(0, Math.floor(minY));
  const y1 = Math.min(H - 1, Math.ceil(maxY));
  for (let y = y0; y <= y1; y++) {
    const yc = y + 0.5;
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[(i + 1) % pts.length];
      if (ay <= yc && by > yc) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
      else if (by <= yc && ay > yc)
        xs.push(bx + ((yc - by) / (ay - by)) * (ax - bx));
    }
    if (xs.length < 2) continue;
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const s = Math.max(0, Math.round(xs[k]));
      const e = Math.min(W - 1, Math.round(xs[k + 1]) - 1);
      for (let x = s; x <= e; x++) mask[y * W + x] = 1;
    }
  }
};

for (const feature of land.features) {
  const g = feature.geometry;
  if (!g || !g.coordinates) continue;
  const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  for (const poly of polys) for (const ring of poly) fillRing(ring);
}

const isOnLand = (lng, lat) => {
  const x = Math.round(((lng + 180) / 360) * W) % W;
  const y = Math.max(0, Math.min(H - 1, Math.round(((90 - lat) / 180) * H)));
  return mask[y * W + x] === 1;
};

// --- dot grid, identical loop to the runtime component ---
const dotSpacing = mapDensityUiToSpacing(DENSITY);
const baseStep = dotSpacing * 0.08;
const dots = [];
for (let lat = -90; lat <= 90; lat += baseStep) {
  const cosLat = Math.cos((Math.abs(lat) * Math.PI) / 180);
  const lngStep = cosLat > 0.01 ? baseStep / Math.max(0.3, cosLat) : 360;
  for (let lng = -180; lng < 180; lng += lngStep) {
    if (isOnLand(lng, lat)) dots.push(lat, lng);
  }
}
const dotCount = dots.length / 2;

// --- outline rings, identical selection + simplification to the runtime ---
const simplifyRing = (ring) => {
  if (ring.length < 2 || DETAIL >= 10) return ring;
  const stepSize = Math.max(1, Math.floor(mapDetailToStepSize(DETAIL)));
  const out = [ring[0]];
  for (let i = stepSize; i < ring.length - 1; i += stepSize)
    out.push(ring[Math.min(i, ring.length - 1)]);
  const last = ring[ring.length - 1];
  const first = ring[0];
  const closed =
    Math.abs(last[0] - first[0]) < 1e-4 && Math.abs(last[1] - first[1]) < 1e-4;
  if (!closed) out.push(last);
  return out.length >= 2 ? out : ring;
};

const isJunk = (feature) => {
  const t = (feature.properties?.featurecla || feature.properties?.type || "").toLowerCase();
  const n = (feature.properties?.name || "").toLowerCase();
  return ["graticule", "grid", "line"].some(
    (k) => t.includes(k) || n.includes(k)
  );
};

const rings = [];
for (const feature of land.features) {
  if (isJunk(feature)) continue;
  const g = feature.geometry;
  if (!g || !g.coordinates) continue;
  const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  for (const poly of polys) {
    const ring = poly[0];
    if (!ring || ring.length < 2) continue;
    const simp = simplifyRing(ring);
    // close the ring, matching the runtime behaviour
    const a = simp[0];
    const b = simp[simp.length - 1];
    const closed =
      Math.abs(a[0] - b[0]) < 1e-4 && Math.abs(a[1] - b[1]) < 1e-4;
    rings.push(closed ? simp : [...simp, a]);
  }
}

// --- serialize ---
const q = (v) => Math.max(-32768, Math.min(32767, Math.round(v * 100)));
let ringPointTotal = 0;
for (const r of rings) ringPointTotal += r.length;

const bytes =
  4 + dotCount * 4 + 4 + rings.length * 4 + ringPointTotal * 4;
const buf = Buffer.alloc(bytes);
let o = 0;
buf.writeUInt32LE(dotCount, o); o += 4;
for (let i = 0; i < dots.length; i += 2) {
  buf.writeInt16LE(q(dots[i]), o); o += 2;     // lat
  buf.writeInt16LE(q(dots[i + 1]), o); o += 2; // lng
}
buf.writeUInt32LE(rings.length, o); o += 4;
for (const r of rings) {
  buf.writeUInt32LE(r.length, o); o += 4;
  for (const [lng, lat] of r) {
    buf.writeInt16LE(q(lat), o); o += 2;
    buf.writeInt16LE(q(lng), o); o += 2;
  }
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, buf);
console.log(`wrote ${outPath}`);
console.log(`  dots          : ${dotCount.toLocaleString()}`);
console.log(`  outline rings : ${rings.length} (${ringPointTotal.toLocaleString()} pts)`);
console.log(`  size          : ${(bytes / 1024).toFixed(1)} KB`);
