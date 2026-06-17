import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildDelveChestMesh } from '../src/render/delve_chest';

describe('delve chest mesh', () => {
  it('builds a human-scale chest with visible materials (not metal-black)', () => {
    const locked = buildDelveChestMesh(true);
    const open = buildDelveChestMesh(false);
    expect(locked.height).toBeCloseTo(2.5, 2);
    expect(open.height).toBeCloseTo(2.5, 2);

    for (const { group, label } of [{ group: locked.group, label: 'locked' }, { group: open.group, label: 'open' }]) {
      group.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(group);
      const size = box.getSize(new THREE.Vector3());
      expect(Math.max(size.x, size.y, size.z), label).toBeLessThan(4.0);
      expect(Math.max(size.x, size.y, size.z), label).toBeGreaterThan(1.8);

      let meshCount = 0;
      group.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        meshCount++;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        expect(mat.metalness ?? 0, label).toBeLessThanOrEqual(0.05);
        expect(Math.max(mat.color.r, mat.color.g, mat.color.b), label).toBeGreaterThan(0.18);
      });
      expect(meshCount, label).toBeGreaterThan(0);
    }
  });
});
