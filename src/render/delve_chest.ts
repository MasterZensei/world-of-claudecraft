// Delve finale reliquary chest — KayKit-style procedural mesh (always readable in
// dungeon lighting). An optional Meshy GLB is used only when it passes validation
// (sane bounds + usable albedo).

import * as THREE from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { loadGltf } from './assets/loader';
import { registerPreload } from './assets/preload';
import { GFX, surfaceMat } from './gfx';

const CHEST_URL = 'models/dungeon/treasure_chest_open.glb';
/** Human-scale treasure chest (~chest-high beside a 2.6u player). */
const TARGET_HEIGHT = 2.5;
/** Face the boss dais (north, away from the entrance) so the opened lid greets
 * players as they approach rather than turning its back on them. */
const CHEST_YAW = 0;
const MAX_GLB_DIM = 2.75;

/** Runtime tints when the baked GLB albedo is too dark or planar-UV streaky. */
const CHEST_LOCKED_STONE = 0x8a8580;
const CHEST_OPEN_STONE = 0x8a7050;
const CHEST_OPEN_GOLD = 0xc9a040;

let gltf: GLTF | null = null;
let gltfRejected = false;
const preparedLocked = new Map<boolean, THREE.Group>();

if (typeof window !== 'undefined') {
  registerPreload(
    loadGltf(CHEST_URL)
      .then((g) => {
        if (validateGltfRoot(g.scene)) gltf = g;
        else gltfRejected = true;
      })
      .catch(() => { gltfRejected = true; }),
  );
}

function validateGltfRoot(root: THREE.Object3D): boolean {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(maxDim) || maxDim < 0.08 || maxDim > MAX_GLB_DIM) return false;
  let meshCount = 0;
  let hasUsableAlbedo = false;
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    meshCount++;
    mesh.geometry?.computeBoundingBox();
    const bb = mesh.geometry?.boundingBox;
    if (bb) {
      const ms = bb.getSize(new THREE.Vector3());
      if (Math.max(ms.x, ms.y, ms.z) > MAX_GLB_DIM) return;
    }
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      const std = mat as THREE.MeshStandardMaterial;
      if (std.map) {
        hasUsableAlbedo = true;
        continue;
      }
      const metalness = std.metalness ?? 0;
      if (metalness > 0.2) continue;
      if (std.color) {
        const hsl = { h: 0, s: 0, l: 0 };
        std.color.getHSL(hsl);
        if (hsl.l >= 0.18) hasUsableAlbedo = true;
      }
    }
  });
  return meshCount > 0 && hasUsableAlbedo;
}

function isGoldTrim(src: THREE.MeshStandardMaterial): boolean {
  const name = (src.name ?? '').toLowerCase();
  if (name.includes('gold') || name.includes('metal') || name.includes('trim') || name.includes('lock')) return true;
  const color = src.color;
  if (!color) return false;
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  return hsl.s > 0.28 && hsl.l > 0.3 && hsl.h > 0.06 && hsl.h < 0.19;
}

function convertMaterial(src: THREE.Material, locked: boolean): THREE.Material {
  const s = src as THREE.MeshStandardMaterial;
  const gold = isGoldTrim(s);
  const hasMap = !!s.map;
  const tint = gold
    ? (locked ? 0xb89430 : CHEST_OPEN_GOLD)
    : (locked ? CHEST_LOCKED_STONE : CHEST_OPEN_STONE);
  return surfaceMat({
    // Keep baked albedo when present — locked used to drop map and read flat black.
    color: hasMap ? 0xffffff : tint,
    map: s.map ?? undefined,
    normalMap: s.normalMap ?? undefined,
    roughness: gold ? 0.75 : (locked ? 0.9 : 0.84),
    metalness: 0,
    emissive: gold ? (locked ? 0x1a1000 : 0x332200) : 0x000000,
    emissiveIntensity: gold ? (locked ? 0.1 : 0.12) : 0,
    flatShading: !GFX.standardMaterials,
  });
}

function normalizeRoot(root: THREE.Object3D): number {
  root.rotation.set(0, 0, 0);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const scale = TARGET_HEIGHT / maxDim;
  root.scale.setScalar(scale);
  root.updateMatrixWorld(true);
  box.setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box.min.y;
  root.updateMatrixWorld(true);
  box.setFromObject(root);
  return box.max.y;
}

function buildProceduralChestMesh(locked: boolean): THREE.Group {
  const group = new THREE.Group();
  const wood = locked ? 0x8a8580 : 0x8a7050;
  const trim = locked ? 0x7a7568 : 0xc9a040;
  const lidWood = locked ? 0x989088 : 0x9a8060;

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.92, 0.52, 0.68),
    surfaceMat({ color: wood, roughness: 0.9, flatShading: !GFX.standardMaterials }),
  );
  body.position.y = 0.26;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const lid = new THREE.Mesh(
    new THREE.BoxGeometry(0.96, 0.22, 0.72),
    surfaceMat({ color: lidWood, roughness: 0.88, flatShading: !GFX.standardMaterials }),
  );
  lid.position.set(0, 0.58, locked ? 0 : -0.06);
  lid.rotation.x = locked ? 0 : -0.42;
  lid.castShadow = true;
  group.add(lid);

  for (const y of [0.14, 0.42]) {
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(0.98, 0.06, 0.74),
      surfaceMat({ color: trim, roughness: 0.75, flatShading: !GFX.standardMaterials }),
    );
    band.position.y = y;
    band.castShadow = true;
    group.add(band);
  }

  const lock = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.18, 0.06),
    surfaceMat({
      color: locked ? 0x8a8078 : 0xffd060,
      roughness: 0.55,
      emissive: locked ? 0 : 0x332200,
      emissiveIntensity: locked ? 0 : 0.25,
      flatShading: !GFX.standardMaterials,
    }),
  );
  lock.position.set(0, 0.48, 0.38);
  lock.castShadow = true;
  group.add(lock);

  if (!locked) {
    const coin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.03, 10),
      surfaceMat({ color: 0xffd060, roughness: 0.45, emissive: 0x443300, emissiveIntensity: 0.35, flatShading: !GFX.standardMaterials }),
    );
    coin.position.set(0.08, 0.72, 0.04);
    coin.rotation.x = 0.25;
    coin.castShadow = true;
    group.add(coin);
  }

  group.rotation.y = CHEST_YAW;
  return group;
}

const ENABLE_MESHY_CHEST_GLB = true;

function prepareChest(locked: boolean): THREE.Group | null {
  if (!ENABLE_MESHY_CHEST_GLB) return null;
  const cached = preparedLocked.get(locked);
  if (cached) return cached;
  if (!gltf || gltfRejected) return null;
  const root = gltf.scene.clone(true);
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const src = mesh.material;
    if (Array.isArray(src)) {
      mesh.material = src.map((m) => convertMaterial(m, locked));
    } else {
      mesh.material = convertMaterial(src as THREE.Material, locked);
    }
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
  normalizeRoot(root);
  root.rotation.y = CHEST_YAW;
  preparedLocked.set(locked, root);
  return root;
}

export function buildDelveChestMesh(locked: boolean): { group: THREE.Group; height: number } {
  const group = new THREE.Group();
  const template = prepareChest(locked);
  if (template) {
    group.add(template.clone(true));
  } else {
    const chest = buildProceduralChestMesh(locked);
    chest.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(chest);
    const rawH = box.getSize(new THREE.Vector3()).y;
    if (rawH > 0.001) chest.scale.setScalar(TARGET_HEIGHT / rawH);
    group.add(chest);
  }
  return { group, height: TARGET_HEIGHT };
}