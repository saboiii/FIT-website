import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import {
  sourceUnitForFile,
  extractPositions,
  computeMetricsFromObject,
} from '@/lib/quoting/threeGeometryAdapter'

describe('sourceUnitForFile', () => {
  it('maps glTF to metres and others to millimetres', () => {
    expect(sourceUnitForFile('model.glb')).toBe('m')
    expect(sourceUnitForFile('model.gltf')).toBe('m')
    expect(sourceUnitForFile('part.stl')).toBe('mm')
    expect(sourceUnitForFile('part.3mf')).toBe('mm')
    expect(sourceUnitForFile('part.obj')).toBe('mm')
  })
})

describe('extractPositions + computeMetricsFromObject', () => {
  it('measures a 10mm box mesh as 1 cm³', () => {
    const scene = new THREE.Scene()
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10))
    scene.add(mesh)
    const m = computeMetricsFromObject(scene, 'part.stl')
    expect(m.volumeCm3).toBeCloseTo(1, 3)
    expect(m.dimensionsCm.length).toBeCloseTo(1, 3)
    expect(m.watertight).toBe(true)
    expect(m.confidence).toBe('high')
  })

  it('accounts for the mesh world transform (scale)', () => {
    const scene = new THREE.Scene()
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10))
    mesh.scale.set(2, 1, 1) // doubles one axis → 20×10×10 mm = 2 cm³
    scene.add(mesh)
    const m = computeMetricsFromObject(scene, 'part.stl')
    expect(m.volumeCm3).toBeCloseTo(2, 3)
  })

  it('sums multiple meshes in the scene', () => {
    const scene = new THREE.Scene()
    const a = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10))
    const b = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10))
    b.position.set(50, 0, 0)
    scene.add(a, b)
    const positions = extractPositions(scene)
    expect(positions.length).toBe(2 * 36 * 3) // two boxes, 36 verts each, xyz
  })
})
