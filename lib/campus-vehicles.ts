import { Box3, MathUtils, Matrix4, Vector3 } from 'three';
import { CAMPUS_BOUNDS } from './campus-world';
import { STAND_HEIGHT, type CastleCollision } from './explore-physics';
import type { WorldPoint } from './journey';

export const CAMPUS_VEHICLES = {
  car: { spawn: [-1.35, .02, -11.9] as WorldPoint, width: 1.68, height: 1.42, length: 3.84 },
  rickshaw: { spawn: [1.7, .02, -15.85] as WorldPoint, width: 1.31, height: 1.82, length: 2.68 },
};
export const AUTO_GATE_STOP = -3.62;
export type VehicleKind = keyof typeof CAMPUS_VEHICLES;
export type CampusVehicleMode = 'walking' | VehicleKind;
export type VehiclePose = { kind: VehicleKind; position: Vector3; yaw: number; speed: number };

export function newVehicle(kind: VehicleKind): VehiclePose {
  return { kind, position: new Vector3(...CAMPUS_VEHICLES[kind].spawn), yaw: 0, speed: 0 };
}

const box = new Box3();
const transform = new Matrix4();
const bounds = new Box3();
const otherBounds = new Box3();
const rayOrigin = new Vector3();
const rayDirection = new Vector3();
const candidate = new Vector3();

function setVehicleBox(target: Box3, kind: VehicleKind, padding = 0) {
  const { width, height, length } = CAMPUS_VEHICLES[kind];
  target.min.set(-width / 2 - padding, .047, -length / 2 - padding);
  target.max.set(width / 2 + padding, height, length / 2 + padding);
}

function setTransform(position: Vector3, yaw: number) {
  return transform.makeRotationY(yaw).setPosition(position);
}

function canOccupy(vehicle: VehiclePose, position: Vector3, yaw: number, other: VehiclePose, world: CastleCollision) {
  setVehicleBox(box, vehicle.kind);
  setTransform(position, yaw);
  bounds.copy(box).applyMatrix4(transform);
  if (bounds.min.x < CAMPUS_BOUNDS.minX || bounds.max.x > CAMPUS_BOUNDS.maxX
    || bounds.min.z < CAMPUS_BOUNDS.minZ || bounds.max.z > CAMPUS_BOUNDS.maxZ) return false;
  if (world.overlapsBox(box, transform)) return false;
  setVehicleBox(otherBounds, other.kind);
  otherBounds.applyMatrix4(setTransform(other.position, other.yaw));
  return !bounds.intersectsBox(otherBounds);
}

export function distanceToVehicle(point: Vector3, vehicle: VehiclePose, padding = 0) {
  const { width, length } = CAMPUS_VEHICLES[vehicle.kind];
  const dx = point.x - vehicle.position.x;
  const dz = point.z - vehicle.position.z;
  const cosine = Math.cos(vehicle.yaw);
  const sine = Math.sin(vehicle.yaw);
  const side = Math.abs(dx * cosine - dz * sine) - width / 2 - padding;
  const forward = Math.abs(dx * sine + dz * cosine) - length / 2 - padding;
  return Math.hypot(Math.max(0, side), Math.max(0, forward));
}

export function touchesVehicle(feet: Vector3, vehicle: VehiclePose) {
  return feet.y < vehicle.position.y + CAMPUS_VEHICLES[vehicle.kind].height
    && distanceToVehicle(feet, vehicle, .23) === 0;
}

export function driveCar(
  car: VehiclePose, other: VehiclePose, world: CastleCollision,
  throttle: number, steer: number, brake: boolean, elapsed: number,
) {
  const desired = throttle * (throttle >= 0 ? 8 : 3.7);
  const steps = Math.max(1, Math.ceil(elapsed / .012));
  const dt = elapsed / steps;
  for (let i = 0; i < steps; i++) {
    car.speed = MathUtils.damp(car.speed, brake ? 0 : desired, brake ? 15 : throttle ? 3.9 : 3.3, dt);
    if (Math.abs(car.speed) < .055 && (brake || !throttle)) { car.speed = 0; return; }
    const turn = -steer * Math.sign(car.speed) * Math.min(Math.abs(car.speed) * .74, 2.08) * dt;
    const yaw = car.yaw + turn;
    candidate.copy(car.position);
    candidate.x += Math.sin(yaw) * car.speed * dt;
    candidate.z += Math.cos(yaw) * car.speed * dt;
    if (!canOccupy(car, candidate, yaw, other, world)) {
      car.speed = 0;
      return;
    }
    car.yaw = yaw;
    car.position.copy(candidate);
  }
}

export function rideRickshaw(
  auto: VehiclePose, other: VehiclePose, world: CastleCollision, destination: number, elapsed: number,
) {
  const remaining = destination - auto.position.z;
  const direction = Math.sign(remaining);
  const yaw = direction < 0 ? Math.PI : 0;
  const speed = Math.min(4.4, Math.max(.65, Math.abs(remaining) * 2.25));
  candidate.copy(auto.position);
  candidate.z += direction * Math.min(Math.abs(remaining), speed * elapsed);
  if (!canOccupy(auto, candidate, yaw, other, world)) return 'blocked';
  auto.yaw = yaw;
  auto.position.copy(candidate);
  return Math.abs(destination - auto.position.z) < .015 ? 'arrived' : 'moving';
}

export function findVehicleExit(vehicle: VehiclePose, other: VehiclePose, world: CastleCollision): WorldPoint | null {
  const { width, length } = CAMPUS_VEHICLES[vehicle.kind];
  const side = width / 2 + .61;
  const end = length / 2 + .56;
  const sine = Math.sin(vehicle.yaw);
  const cosine = Math.cos(vehicle.yaw);
  for (const [x, z] of [[-side, 0], [side, 0], [-side, -.58], [side, -.58], [0, -end], [0, end]]) {
    candidate.set(vehicle.position.x + x * cosine + z * sine, vehicle.position.y + 1, vehicle.position.z - x * sine + z * cosine);
    const floor = world.floor(candidate, 1.4);
    if (floor === null) continue;
    candidate.y = floor + .015;
    if (world.outOfBounds(candidate) || touchesVehicle(candidate, other) || !world.clear(candidate, STAND_HEIGHT)) continue;
    rayOrigin.copy(vehicle.position);
    rayOrigin.y += .7;
    rayDirection.subVectors(candidate, rayOrigin);
    rayDirection.y = 0;
    const distance = rayDirection.length();
    if (!world.trace(rayOrigin, rayDirection.normalize(), distance - .09)) {
      return [candidate.x, candidate.y, candidate.z];
    }
  }
  return null;
}
