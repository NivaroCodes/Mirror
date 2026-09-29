// src/workout/workoutTypes.ts
import { ExerciseType } from '../engine';

export type WorkoutExercise = Exclude<ExerciseType, 'none'>;

// Порядок упражнений в тренировке: «Следующее упражнение» идёт по этому списку
export const WORKOUT_PLAN: WorkoutExercise[] = ['squat', 'lunge', 'jumping_jack'];

export const EXERCISE_LABELS: Record<WorkoutExercise, string> = {
  squat: 'Приседания',
  lunge: 'Выпады',
  jumping_jack: 'Джампинг Джек'
};

export const EXERCISE_HINTS: Record<WorkoutExercise, string> = {
  squat: 'Встаньте боком к камере, чтобы было видно всё тело',
  lunge: 'Встаньте боком или под углом к камере',
  jumping_jack: 'Встаньте лицом к камере в полный рост'
};

// Итог одного подхода — снимок счётчиков Engine перед сменой упражнения
export interface ExerciseSet {
  exercise: WorkoutExercise;
  repCount: number;
  perfectReps: number;
  totalErrors: number;
}

export interface WorkoutTotals {
  repCount: number;
  perfectReps: number;
  totalErrors: number;
  formScore: number | null; // % идеальных повторов; null, если повторов не было
}

export function calculateTotals(sets: ExerciseSet[]): WorkoutTotals {
  const repCount = sets.reduce((sum, s) => sum + s.repCount, 0);
  const perfectReps = sets.reduce((sum, s) => sum + s.perfectReps, 0);
  const totalErrors = sets.reduce((sum, s) => sum + s.totalErrors, 0);
  return {
    repCount,
    perfectReps,
    totalErrors,
    formScore: repCount > 0 ? Math.round((perfectReps / repCount) * 100) : null
  };
}
