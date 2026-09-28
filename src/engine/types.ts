// src/engine/types.ts

export type ExerciseType = 'squat' | 'lunge' | 'jumping_jack' | 'none';

export type MotionState = 
  | 'idle'         // Ожидание человека в кадре
  | 'ready'        // Человек в исходной позиции
  | 'moving'       // Фаза движения (вниз/вверх)
  | 'rep_success'  // Повтор засчитан идеально
  | 'rep_error';   // Повтор с ошибкой или текущая ошибка техники

/**
 * Единый контракт между CV-движком и React UI.
 * Фронтенд работает ИСКЛЮЧИТЕЛЬНО с этим объектом.
 */
export interface MotionResult {
  exercise: ExerciseType;
  state: MotionState;
  repCount: number;
  isCorrect: boolean;
  error?: string;          // Конкретное описание ошибки (для Error Mode)
  feedback?: string;       // Подбадривание / статус ("Отлично", "Опусти таз ниже")
  metrics?: {
    currentAngle?: number; // Текущий ключевой угол (например, 115°)
    targetAngle?: number;  // Целевой угол (например, 90°)
    progress?: number;     // 0..100% выполнения текущей фазы
  };
}

export interface Landmark3D {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}
