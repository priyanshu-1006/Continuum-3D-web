import { Box3, BoxGeometry, BufferAttribute, BufferGeometry, DoubleSide, Euler, FrontSide, Line3, Matrix4, Mesh, Ray, Vector3, type Object3D } from 'three';
import { CENTER, MeshBVH } from 'three-mesh-bvh';
import { EXPLORE_BLOCKS, EXPLORE_SPAWN, PORTCULLIS, QUEST_PROP_COLLIDERS } from './explore-world';
import type { WorldPoint } from './journey';

export const STAND_HEIGHT = 1.19;
export const CROUCH_HEIGHT = .76;
const RADIUS = .24;
const SKIN = .002;
const DOWN = new Vector3(0, -1, 0);
export type CollisionBlock = { position: WorldPoint; size: WorldPoint; rotation?: WorldPoint };
type WorldLimits = { x: number; minZ: number; maxZ: number };
const CASTLE_LIMITS = { x: 37, minZ: -43, maxZ: 39 };

export function createCastleCollision(castle: Object3D) {
  const [x, y, z] = PORTCULLIS.position;
  return createExploreCollision(
    [...EXPLORE_BLOCKS, ...QUEST_PROP_COLLIDERS],
    { position: [x, y + PORTCULLIS.size[1] / 2, z], size: PORTCULLIS.size },
    CASTLE_LIMITS,
    castle,
  );
}

/** Merge world-space positions as floats so any quantized GLB stays untouched. */
export function createExploreCollision(
  blocks: readonly CollisionBlock[], gate: CollisionBlock, limits: WorldLimits, scene?: Object3D,
) {
  const parts: { geometry: BufferGeometry; matrix: Matrix4 }[] = [];
  scene?.updateMatrixWorld(true);
  scene?.traverse(node => {
    if (node instanceof Mesh && node.geometry.getAttribute('position')) {
      parts.push({ geometry: node.geometry, matrix: node.matrixWorld });
    }
  });
  const procedural = blocks.map(block => {
    const transform = new Matrix4();
    if (block.rotation) transform.makeRotationFromEuler(new Euler(...block.rotation));
    transform.setPosition(...block.position);
    return { geometry: new BoxGeometry(...block.size), matrix: transform };
  });
  parts.push(...procedural);

  const vertexCount = parts.reduce((sum, part) => sum + part.geometry.getAttribute('position').count, 0);
  const indexCount = parts.reduce((sum, part) => sum + (part.geometry.index?.count ?? part.geometry.getAttribute('position').count), 0);
  const positions = new Float32Array(vertexCount * 3);
  const indices = new Uint32Array(indexCount);
  const point = new Vector3();
  let vertexOffset = 0;
  let indexOffset = 0;

  for (const { geometry, matrix } of parts) {
    const attribute = geometry.getAttribute('position');
    for (let index = 0; index < attribute.count; index++) {
      point.fromBufferAttribute(attribute, index).applyMatrix4(matrix);
      point.toArray(positions, (vertexOffset + index) * 3);
    }
    const count = geometry.index?.count ?? attribute.count;
    for (let index = 0; index < count; index++) {
      indices[indexOffset++] = vertexOffset + (geometry.index?.getX(index) ?? index);
    }
    vertexOffset += attribute.count;
  }

  procedural.forEach(part => part.geometry.dispose());
  const merged = new BufferGeometry();
  merged.setAttribute('position', new BufferAttribute(positions, 3));
  merged.setIndex(new BufferAttribute(indices, 1));
  return new CastleCollision(merged, gate, limits);
}

export class CastleCollision {
  private readonly bvh: MeshBVH;
  private readonly gateGeometry: BoxGeometry;
  private readonly gate: MeshBVH;
  gateClosed = true;
  private readonly ray = new Ray();
  private readonly segment = new Line3();
  private readonly bounds = new Box3();
  private readonly trianglePoint = new Vector3();
  private readonly capsulePoint = new Vector3();
  private readonly normal = new Vector3();

  constructor(private readonly geometry: BufferGeometry, gate: CollisionBlock, private readonly limits: WorldLimits) {
    this.bvh = new MeshBVH(geometry, { strategy: CENTER, maxLeafTris: 12 });
    this.gateGeometry = new BoxGeometry(...gate.size).translate(...gate.position);
    this.gate = new MeshBVH(this.gateGeometry);
  }

  dispose() { this.geometry.dispose(); this.gateGeometry.dispose(); }

  outOfBounds(feet: Vector3) {
    return feet.y < -7 || Math.abs(feet.x) > this.limits.x || feet.z < this.limits.minZ || feet.z > this.limits.maxZ;
  }

  trace(origin: Vector3, direction: Vector3, distance: number, frontOnly = false, near = .004) {
    this.ray.set(origin, direction);
    const side = frontOnly ? FrontSide : DoubleSide;
    const terrain = this.bvh.raycastFirst(this.ray, side, near, distance);
    const gate = this.gateClosed && this.gate.raycastFirst(this.ray, side, near, terrain?.distance ?? distance);
    return gate || terrain || null;
  }

  floor(origin: Vector3, distance: number) {
    const hit = this.trace(origin, DOWN, distance, true);
    return hit?.face && hit.face.normal.y > .55 ? hit.point.y : null;
  }

  private prepareCapsule(feet: Vector3, height: number) {
    this.segment.start.set(feet.x, feet.y + RADIUS, feet.z);
    this.segment.end.set(feet.x, feet.y + height - RADIUS, feet.z);
    this.bounds.makeEmpty().expandByPoint(this.segment.start).expandByPoint(this.segment.end).expandByScalar(RADIUS + SKIN);
  }

  clear(feet: Vector3, height: number) {
    this.prepareCapsule(feet, height);
    return !this.shapecast({
      intersectsBounds: box => box.intersectsBox(this.bounds),
      intersectsTriangle: triangle => triangle.closestPointToSegment(this.segment, this.trianglePoint, this.capsulePoint) < RADIUS - SKIN,
    });
  }

  private shapecast(callbacks: Parameters<MeshBVH['shapecast']>[0]) {
    return this.bvh.shapecast(callbacks) || (this.gateClosed && this.gate.shapecast(callbacks));
  }

  /** Resolve contacts against the actual model and slide along the unblocked axis. */
  resolve(feet: Vector3, height: number, velocity: Vector3) {
    let floor = false;
    for (let pass = 0; pass < 3; pass++) {
      let corrected = false;
      this.prepareCapsule(feet, height);
      this.shapecast({
        intersectsBounds: box => box.intersectsBox(this.bounds),
        intersectsTriangle: triangle => {
          const distance = triangle.closestPointToSegment(this.segment, this.trianglePoint, this.capsulePoint);
          if (distance >= RADIUS) return false;
          this.normal.subVectors(this.capsulePoint, this.trianglePoint);
          if (this.normal.lengthSq() < 1e-12) {
            triangle.getNormal(this.normal);
            if (this.normal.dot(velocity) > 0) this.normal.negate();
          } else this.normal.normalize();
          if (this.normal.lengthSq() < 1e-12) return false;

          const penetration = RADIUS - distance + SKIN;
          this.segment.start.addScaledVector(this.normal, penetration);
          this.segment.end.addScaledVector(this.normal, penetration);
          const into = velocity.dot(this.normal);
          if (into < 0) velocity.addScaledVector(this.normal, -into);
          floor ||= this.normal.y > .58;
          corrected = true;
          return false;
        },
      });
      feet.copy(this.segment.start);
      feet.y -= RADIUS;
      if (!corrected) break;
    }
    return floor;
  }
}

type Vault = { from: Vector3; to: Vector3; lift: number; time: number };
export type Explorer = {
  feet: Vector3;
  velocity: Vector3;
  yaw: number;
  grounded: boolean;
  crouched: boolean;
  vault: Vault | null;
  jumpBuffer: number;
  groundGrace: number;
};

export function newExplorer(position: WorldPoint = EXPLORE_SPAWN, yaw = 0): Explorer {
  return {
    feet: new Vector3(...position), velocity: new Vector3(), yaw, grounded: false,
    crouched: false, vault: null, jumpBuffer: 0, groundGrace: 0,
  };
}

const smooth = (value: number) => value * value * (3 - 2 * value);
const VAULT_SECONDS = .44;
const JUMP_BUFFER = .13;
const GROUND_GRACE = .10;
const sample = new Vector3();
const probe = new Vector3();
const forward = new Vector3();

function vaultPose(vault: Vault, progress: number, result: Vector3) {
  const crossing = smooth(Math.max(0, Math.min(1, (progress - .25) / .5)));
  result.lerpVectors(vault.from, vault.to, crossing);
  if (progress < .25) result.y = vault.from.y + (vault.lift - vault.from.y) * smooth(progress / .25);
  else if (progress > .75) result.y = vault.lift + (vault.to.y - vault.lift) * smooth((progress - .75) / .25);
  else result.y = vault.lift;
  return result;
}

function findVault(player: Explorer, world: CastleCollision) {
  forward.set(Math.sin(player.yaw), 0, Math.cos(player.yaw));
  probe.copy(player.feet);
  probe.y += .31;
  const ledge = world.trace(probe, forward, .96, false, .08);
  if (!ledge?.face || Math.abs(ledge.face.normal.y) > .35) return null;

  probe.copy(player.feet).addScaledVector(forward, ledge.distance + .32);
  probe.y += 1.05;
  const top = world.floor(probe, .92);
  if (top === null || top - player.feet.y < .16 || top - player.feet.y > .84) return null;

  for (const extra of [.42, .78, 1.04]) {
    probe.copy(player.feet).addScaledVector(forward, ledge.distance + extra);
    probe.y += 1.05;
    const landing = world.floor(probe, 1.32);
    if (landing === null) continue;
    const vault = {
      from: player.feet.clone(),
      to: new Vector3(probe.x, landing + SKIN * 2, probe.z),
      lift: Math.max(top, landing) + .12,
      time: 0,
    };
    let clear = true;
    for (let index = 0; index <= 20; index++) {
      if (!world.clear(vaultPose(vault, index / 20, sample), STAND_HEIGHT)) { clear = false; break; }
    }
    if (clear) return vault;
  }
  return null;
}

export function canVault(player: Explorer, world: CastleCollision) {
  return player.grounded && !player.crouched && !player.vault && findVault(player, world) !== null;
}

export type ExploreMotion = { direction: Vector3; crouch: boolean; jump: boolean; vault: boolean; sprint?: boolean };
export type ExploreFeedback = 'vaulted' | 'vault-blocked' | 'jump-blocked' | 'returned';

export function advanceExplorer(
  player: Explorer, world: CastleCollision, motion: ExploreMotion, elapsed: number,
  respawn: WorldPoint = EXPLORE_SPAWN, respawnYaw = 0,
): ExploreFeedback | null {
  const dt = Math.min(elapsed, .055);
  if (player.vault) {
    player.vault.time += dt;
    const progress = Math.min(1, player.vault.time / VAULT_SECONDS);
    vaultPose(player.vault, progress, player.feet);
    if (progress === 1) { player.vault = null; player.grounded = true; player.groundGrace = GROUND_GRACE; }
    return null;
  }

  if (motion.direction.lengthSq() > .001) player.yaw = Math.atan2(motion.direction.x, motion.direction.z);
  player.crouched = motion.crouch || (player.crouched && !world.clear(player.feet, STAND_HEIGHT));
  const height = player.crouched ? CROUCH_HEIGHT : STAND_HEIGHT;
  let feedback: ExploreFeedback | null = null;
  if (motion.jump) player.jumpBuffer = JUMP_BUFFER;
  if (player.crouched && player.jumpBuffer > 0) {
    player.jumpBuffer = 0;
    feedback = 'jump-blocked';
  }
  if (motion.vault) {
    const vault = player.grounded && !player.crouched ? findVault(player, world) : null;
    if (vault) {
      player.vault = vault;
      player.grounded = false;
      player.jumpBuffer = 0;
      player.groundGrace = 0;
      player.velocity.set(0, 0, 0);
      return 'vaulted';
    }
    feedback = 'vault-blocked';
  }
  const steps = Math.max(1, Math.ceil(dt / .012));
  const step = dt / steps;
  const speed = player.crouched ? 1.44 : motion.sprint ? 4.55 : 3.4;
  for (let index = 0; index < steps; index++) {
    if (player.jumpBuffer > 0 && (player.grounded || player.groundGrace > 0)) {
      player.velocity.y = 4.65;
      player.grounded = false;
      player.jumpBuffer = 0;
      player.groundGrace = 0;
    }
    player.jumpBuffer = Math.max(0, player.jumpBuffer - step);
    const damping = 1 - Math.exp(-step * (player.grounded ? 21 : 10));
    player.velocity.x += (motion.direction.x * speed - player.velocity.x) * damping;
    player.velocity.z += (motion.direction.z * speed - player.velocity.z) * damping;
    if (motion.direction.lengthSq() < .001 && Math.hypot(player.velocity.x, player.velocity.z) < .012) {
      player.velocity.x = 0;
      player.velocity.z = 0;
    }
    player.velocity.y = Math.max(-11, player.velocity.y - 11.8 * step);
    player.feet.addScaledVector(player.velocity, step);
    const floor = world.resolve(player.feet, height, player.velocity);
    player.grounded = floor;
    if (!floor && player.velocity.y <= 0) {
      probe.copy(player.feet);
      probe.y += .045;
      const support = world.floor(probe, .081);
      if (support !== null && Math.abs(support - player.feet.y) < .04) {
        player.feet.y = support + SKIN * 2;
        player.velocity.y = 0;
        player.grounded = true;
      }
    }
    player.groundGrace = player.grounded ? GROUND_GRACE : Math.max(0, player.groundGrace - step);
  }

  if (world.outOfBounds(player.feet)) {
    Object.assign(player, newExplorer(respawn, respawnYaw));
    return 'returned';
  }
  return feedback;
}
