// src/engine/drawing.ts
import { Landmark3D } from './types';
import { POSE_CONNECTIONS } from './landmarks';

export interface DrawOptions {
  color?: string;
  lineWidth?: number;
  radius?: number;
  highlightJoints?: number[];
  highlightColor?: string;
}

/**
 * Отрисовка скелета на Canvas поверх видео
 */
export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark3D[],
  width: number,
  height: number,
  options: DrawOptions = {}
) {
  const {
    color = '#10b981',           // Зеленый по умолчанию
    lineWidth = 4,
    radius = 6,
    highlightJoints = [],
    highlightColor = '#ef4444'   // Красный для подсвечивания ошибок
  } = options;

  ctx.clearRect(0, 0, width, height);

  // 1. Отрисовка соединительных линий
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
    const p1 = landmarks[startIdx];
    const p2 = landmarks[endIdx];

    if (!p1 || !p2) continue;
    if ((p1.visibility ?? 1) < 0.5 || (p2.visibility ?? 1) < 0.5) continue;

    // Если одна из точек в списке ошибок — подсвечиваем ребро красным
    const isErrorEdge = highlightJoints.includes(startIdx) || highlightJoints.includes(endIdx);
    ctx.strokeStyle = isErrorEdge ? highlightColor : color;

    ctx.beginPath();
    ctx.moveTo(p1.x * width, p1.y * height);
    ctx.lineTo(p2.x * width, p2.y * height);
    ctx.stroke();
  }

  // 2. Отрисовка ключевых суставов (точек)
  for (let i = 0; i < landmarks.length; i++) {
    const p = landmarks[i];
    if (!p || (p.visibility ?? 1) < 0.5) continue;

    const isHighlighted = highlightJoints.includes(i);
    const x = p.x * width;
    const y = p.y * height;

    ctx.beginPath();
    ctx.arc(x, y, isHighlighted ? radius * 1.5 : radius, 0, 2 * Math.PI);
    ctx.fillStyle = isHighlighted ? highlightColor : '#ffffff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = isHighlighted ? '#ffffff' : color;
    ctx.stroke();
  }
}
