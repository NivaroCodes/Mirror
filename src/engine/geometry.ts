// src/engine/geometry.ts
import { Landmark3D } from './types';

/**
 * Вычисляет угол между тремя точками в градусах (0..180).
 * Точка B является вершиной угла (например, колено между бедром и лодыжкой).
 */
export function calculateAngle(a: Landmark3D, b: Landmark3D, c: Landmark3D): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) {
    angle = 360.0 - angle;
  }
  return Math.round(angle);
}

/**
 * Вычисляет 2D Евклидово расстояние между двумя точками
 */
export function calculateDistance(a: Landmark3D, b: Landmark3D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Сглаживание угла (Exponential Moving Average) для устранения тремора камеры
 */
export class AngleSmoother {
  private lastAngle: number | null = null;
  private alpha: number;

  constructor(alpha = 0.35) {
    this.alpha = alpha;
  }

  smooth(newAngle: number): number {
    if (this.lastAngle === null) {
      this.lastAngle = newAngle;
      return newAngle;
    }
    this.lastAngle = this.alpha * newAngle + (1 - this.alpha) * this.lastAngle;
    return Math.round(this.lastAngle);
  }

  reset() {
    this.lastAngle = null;
  }
}
