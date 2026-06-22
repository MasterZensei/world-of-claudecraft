// One-off Meshy treasure chest: weld + simplify (~1200 tris) + hand-painted
// albedo + meshopt. Run from repo root:
//   node scripts/assets/optimize_treasure_chest.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import {
  dedup, meshopt, normals, prune, simplify, textureCompress, weld,
} from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const SRC = path.join(PUBLIC_DIR, 'models/dungeon/treasure_chest_open.glb');
const BACKUP = path.join(ROOT, 'tmp/treasure_chest_open_raw.glb');
const OUT = SRC;
const TARGET_TRIS = 1200;
const SIMPLIFY_ERROR = 0.08;
const MAX_TEX = 512;

function countTris(doc) {
  let tris = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const idx = prim.getIndices();
      tris += (idx ? idx.getCount() : prim.getAttribute('POSITION').getCount()) / 3;
    }
  }
  return Math.round(tris);
}

/** Low-frequency hand-painted atlas — weathered stone body + gold trim bands. */
async function makeChestAlbedo() {
  const size = MAX_TEX;
  const svg = `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="stone" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7a6a58"/>
      <stop offset="45%" stop-color="#6a5a48"/>
      <stop offset="100%" stop-color="#5a4a3a"/>
    </linearGradient>
    <linearGradient id="stoneDark" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#6a5a48"/>
      <stop offset="100%" stop-color="#4a3a2a"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#b88830"/>
      <stop offset="50%" stop-color="#e8c050"/>
      <stop offset="100%" stop-color="#a87828"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#stone)"/>
  <rect width="100%" height="100%" fill="url(#stoneDark)" opacity="0.35"/>
  <rect y="12%" width="100%" height="11%" fill="url(#gold)" opacity="0.98"/>
  <rect y="58%" width="100%" height="9%" fill="url(#gold)" opacity="0.95"/>
  <rect y="74%" width="100%" height="16%" fill="#9a7848" opacity="0.7"/>
  <rect x="38%" y="30%" width="24%" height="22%" fill="url(#gold)" opacity="0.88"/>
  <circle cx="72%" cy="42%" r="8%" fill="#f0d060" opacity="0.8"/>
  <circle cx="28%" cy="48%" r="6%" fill="#d4a840" opacity="0.72"/>
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** Box-project UVs so trim bands wrap the chest instead of XY-planar streaks. */
function assignBoxUVs(doc) {
  const buffer = doc.getRoot().listBuffers()[0] ?? doc.createBuffer();
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      if (!pos) continue;
      const norm = prim.getAttribute('NORMAL');
      const count = pos.getCount();
      const uvs = new Float32Array(count * 2);
      const el = [0, 0, 0];
      const nl = [0, 0, 0];
      let minX = Infinity; let maxX = -Infinity;
      let minY = Infinity; let maxY = -Infinity;
      let minZ = Infinity; let maxZ = -Infinity;
      for (let i = 0; i < count; i++) {
        pos.getElement(i, el);
        minX = Math.min(minX, el[0]); maxX = Math.max(maxX, el[0]);
        minY = Math.min(minY, el[1]); maxY = Math.max(maxY, el[1]);
        minZ = Math.min(minZ, el[2]); maxZ = Math.max(maxZ, el[2]);
      }
      const sx = maxX - minX || 1;
      const sy = maxY - minY || 1;
      const sz = maxZ - minZ || 1;
      for (let i = 0; i < count; i++) {
        pos.getElement(i, el);
        if (norm) norm.getElement(i, nl);
        const ax = norm ? Math.abs(nl[0]) : 0;
        const ay = norm ? Math.abs(nl[1]) : 1;
        const az = norm ? Math.abs(nl[2]) : 0;
        let u;
        let v;
        if (ay >= ax && ay >= az) {
          u = (el[0] - minX) / sx;
          v = (el[2] - minZ) / sz;
        } else if (ax >= az) {
          u = (el[2] - minZ) / sz;
          v = (el[1] - minY) / sy;
        } else {
          u = (el[0] - minX) / sx;
          v = (el[1] - minY) / sy;
        }
        uvs[i * 2] = u;
        uvs[i * 2 + 1] = v;
      }
      prim.setAttribute('TEXCOORD_0', doc.createAccessor()
        .setArray(uvs)
        .setType('VEC2')
        .setBuffer(buffer));
    }
  }
}

async function assignChestMaterial(doc, albedoPng) {
  const root = doc.getRoot();
  const tex = doc.createTexture('chest_albedo').setImage(albedoPng).setMimeType('image/png');
  const mat = doc.createMaterial('chest')
    .setBaseColorTexture(tex)
    .setBaseColorFactor([1, 1, 1, 1])
    .setMetallicFactor(0)
    .setRoughnessFactor(0.88);
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      prim.setMaterial(mat);
    }
  }
}

async function main() {
  if (!fs.existsSync(BACKUP) && !fs.existsSync(SRC)) {
    console.error(`missing source: ${SRC}`);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(BACKUP), { recursive: true });
  if (!fs.existsSync(BACKUP)) fs.copyFileSync(SRC, BACKUP);

  const beforeBytes = fs.statSync(BACKUP).size;

  await MeshoptEncoder.ready;
  await MeshoptDecoder.ready;
  await MeshoptSimplifier.ready;
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'meshopt.encoder': MeshoptEncoder,
      'meshopt.decoder': MeshoptDecoder,
    });

  const doc = await io.read(BACKUP);
  const beforeTris = countTris(doc);
  const ratio = Math.min(1, TARGET_TRIS / Math.max(beforeTris, 1));

  await doc.transform(
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio, error: SIMPLIFY_ERROR }),
    normals({ overwrite: true }),
    prune(),
    dedup(),
  );

  assignBoxUVs(doc);
  await assignChestMaterial(doc, await makeChestAlbedo());

  await doc.transform(
    textureCompress({
      encoder: sharp, targetFormat: 'webp', resize: [MAX_TEX, MAX_TEX],
    }),
    meshopt({ encoder: MeshoptEncoder, level: 'high' }),
  );

  const afterTris = countTris(doc);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  await io.write(OUT, doc);
  const afterBytes = fs.statSync(OUT).size;

  console.log('=== treasure_chest_open.glb ===');
  console.log(`  tris:  ${beforeTris.toLocaleString()} -> ${afterTris.toLocaleString()} (target ~${TARGET_TRIS})`);
  console.log(`  size:  ${(beforeBytes / 1024).toFixed(1)} KB -> ${(afterBytes / 1024).toFixed(1)} KB`);
  console.log(`  raw backup: ${BACKUP}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
