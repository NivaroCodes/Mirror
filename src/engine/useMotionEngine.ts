// src/engine/useMotionEngine.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { ExerciseType, MotionResult, Landmark3D } from './types';
import { poseService } from './poseService';
import { motionEngine } from './motionEngine';
import { drawSkeleton } from './drawing';

export interface UseMotionEngineOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  initialExercise?: ExerciseType;
  enableVoice?: boolean;
  enableOverlay?: boolean;
  onResult?: (result: MotionResult) => void;
}

export interface UseMotionEngineReturn {
  isReady: boolean;
  isRunning: boolean;
  fps: number;
  result: MotionResult;
  initError: string | null;
  start: () => Promise<void>;
  stop: () => void;
  setExercise: (exercise: ExerciseType) => void;
  resetStats: () => void;
  setVoiceEnabled: (enabled: boolean) => void;
}

/**
 * Единый React-хук для подключения Motion Engine к любому React-компоненту.
 * Фронтендеру не нужно знать ничего о MediaPipe или координатах.
 */
export function useMotionEngine(options: UseMotionEngineOptions): UseMotionEngineReturn {
  const {
    videoRef,
    canvasRef,
    initialExercise = 'squat',
    enableVoice = true,
    enableOverlay = true,
    onResult
  } = options;

  const [isReady, setIsReady] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [fps, setFps] = useState(0);
  const [initError, setInitError] = useState<string | null>(null);

  const [result, setResult] = useState<MotionResult>({
    exercise: initialExercise,
    state: 'idle',
    repCount: 0,
    perfectReps: 0,
    totalErrors: 0,
    isCorrect: true,
    feedback: 'Ожидание запуска камеры...'
  });

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  // Инициализация MediaPipe при монтировании
  useEffect(() => {
    let isMounted = true;
    motionEngine.setExercise(initialExercise);
    motionEngine.setVoiceEnabled(enableVoice);

    poseService.initialize()
      .then(() => {
        if (isMounted) {
          setIsReady(true);
          setInitError(null);
        }
      })
      .catch((err) => {
        console.error('[useMotionEngine] Ошибка инициализации:', err);
        if (isMounted) {
          setInitError(err?.message || 'Не удалось загрузить модуль позы');
        }
      });

    return () => {
      isMounted = false;
      poseService.stop();
    };
  }, [initialExercise, enableVoice]);

  // Запуск камеры и анализа движений
  const start = useCallback(async () => {
    if (!videoRef.current) {
      throw new Error('Video элемент не примонтирован');
    }

    try {
      await poseService.startWebcam(videoRef.current, (landmarks: Landmark3D[] | null) => {
        // Подсчет FPS
        frameCountRef.current++;
        const now = performance.now();
        if (now - lastTimeRef.current >= 1000) {
          setFps(frameCountRef.current);
          frameCountRef.current = 0;
          lastTimeRef.current = now;
        }

        // 1. Прогон кадра через детекторы Motion Engine
        const currentResult = motionEngine.process(landmarks);
        setResult(currentResult);
        onResultRef.current?.(currentResult);

        // 2. Отрисовка скелета на Canvas
        if (enableOverlay && canvasRef?.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            if (landmarks && landmarks.length > 0) {
              drawSkeleton(ctx, landmarks, canvas.width, canvas.height, {
                color: currentResult.isCorrect ? '#22c55e' : '#eab308',
                highlightJoints: currentResult.highlightJoints,
                highlightColor: '#ef4444'
              });
            } else {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
          }
        }
      });

      setIsRunning(true);
    } catch (err: any) {
      console.error('[useMotionEngine] Ошибка доступа к камере:', err);
      throw err;
    }
  }, [videoRef, canvasRef, enableOverlay]);

  // Остановка камеры
  const stop = useCallback(() => {
    poseService.stop();
    setIsRunning(false);
    if (canvasRef?.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [canvasRef]);

  // Смена упражнения
  const setExercise = useCallback((exercise: ExerciseType) => {
    motionEngine.setExercise(exercise);
    setResult({
      exercise,
      state: 'idle',
      repCount: 0,
      perfectReps: 0,
      totalErrors: 0,
      isCorrect: true,
      feedback: 'Упражнение изменено. Примите исходное положение.'
    });
  }, []);

  // Сброс статистики
  const resetStats = useCallback(() => {
    motionEngine.resetStats();
    setResult(prev => ({
      ...prev,
      repCount: 0,
      perfectReps: 0,
      totalErrors: 0,
      error: undefined
    }));
  }, []);

  const setVoiceEnabled = useCallback((enabled: boolean) => {
    motionEngine.setVoiceEnabled(enabled);
  }, []);

  return {
    isReady,
    isRunning,
    fps,
    result,
    initError,
    start,
    stop,
    setExercise,
    resetStats,
    setVoiceEnabled
  };
}
