// src/workout/WorkoutScreen.tsx
import React, { useRef, useState } from 'react';
import { useMotionEngine, MotionResult } from '../engine';
import {
  ExerciseSet,
  WorkoutExercise,
  WORKOUT_PLAN,
  EXERCISE_LABELS,
  EXERCISE_HINTS
} from './workoutTypes';

interface WorkoutScreenProps {
  onComplete: (sets: ExerciseSet[]) => void;
}

type FormStatus = { label: string; tone: 'idle' | 'ready' | 'good' | 'error' };

// Статус строится только из данных Engine — своих ошибок UI не придумывает
function getFormStatus(result: MotionResult, isRunning: boolean): FormStatus {
  if (!isRunning) return { label: 'Камера выключена', tone: 'idle' };
  if (result.error || result.state === 'rep_error') return { label: 'Error', tone: 'error' };
  if (result.state === 'idle' || result.state === 'ready') return { label: 'Ready', tone: 'ready' };
  return { label: 'Good form', tone: 'good' };
}

export function WorkoutScreen({ onComplete }: WorkoutScreenProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [exercise, setExerciseState] = useState<WorkoutExercise>(WORKOUT_PLAN[0]);
  const [completedSets, setCompletedSets] = useState<ExerciseSet[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // initialExercise и enableVoice передаются константами: при их изменении Engine
  // переинициализируется и гасит камеру. Упражнение меняем только через setExercise().
  const { isReady, isRunning, result, initError, start, stop, setExercise, resetStats } = useMotionEngine({
    videoRef,
    canvasRef,
    initialExercise: WORKOUT_PLAN[0],
    enableVoice: true
  });

  const handleStart = async () => {
    if (isStarting || isRunning) return;
    setIsStarting(true);
    setCameraError(null);
    try {
      await start();
      // Подгоняем холст под реальное разрешение камеры, чтобы скелет совпадал с видео
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.videoWidth > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
    } catch (err: any) {
      setCameraError(
        err?.name === 'NotAllowedError'
          ? 'Нет доступа к камере. Разрешите доступ в настройках браузера.'
          : err?.message || 'Не удалось запустить камеру'
      );
    } finally {
      setIsStarting(false);
    }
  };

  // Engine обнуляет счётчики при смене упражнения, поэтому сначала сохраняем подход
  const withCurrentSet = (): ExerciseSet[] => {
    if (result.repCount === 0) return completedSets;
    return [
      ...completedSets,
      {
        exercise,
        repCount: result.repCount,
        perfectReps: result.perfectReps,
        totalErrors: result.totalErrors
      }
    ];
  };

  const switchExercise = (next: WorkoutExercise) => {
    if (next === exercise) return;
    setCompletedSets(withCurrentSet());
    setExerciseState(next);
    setExercise(next);
  };

  const handleFinish = () => {
    const sets = withCurrentSet();
    stop();
    onComplete(sets);
  };

  const planIndex = WORKOUT_PLAN.indexOf(exercise);
  const isLastExercise = planIndex === WORKOUT_PLAN.length - 1;

  const handleNext = () => {
    if (isLastExercise) handleFinish();
    else switchExercise(WORKOUT_PLAN[planIndex + 1]);
  };

  const status = getFormStatus(result, isRunning);
  const progress = result.metrics?.progress;
  const engineError = initError ?? cameraError;

  return (
    <div className="screen workout">
      <header className="workout__header">
        <div>
          <div className="muted small">
            Упражнение {planIndex + 1} из {WORKOUT_PLAN.length}
          </div>
          <h1 className="workout__title">{EXERCISE_LABELS[exercise]}</h1>
        </div>

        <div className="exercise-tabs">
          {WORKOUT_PLAN.map((ex) => (
            <button
              key={ex}
              className={`btn ${ex === exercise ? 'btn--active' : ''}`}
              onClick={() => switchExercise(ex)}
            >
              {EXERCISE_LABELS[ex]}
            </button>
          ))}
        </div>
      </header>

      <div className="workout__body">
        {/* Камера + скелет (скелет рисует Engine в canvasRef) */}
        <div className="camera">
          <video ref={videoRef} className="camera__layer" playsInline muted />
          <canvas ref={canvasRef} className="camera__layer camera__overlay" width={1280} height={720} />

          {!isRunning && (
            <div className="camera__placeholder">
              {engineError ? (
                <p className="text-bad">{engineError}</p>
              ) : !isReady ? (
                <p>Загрузка модели распознавания позы…</p>
              ) : (
                <>
                  <p>Нажмите «Start workout» и разрешите доступ к камере</p>
                  <p className="muted small">{EXERCISE_HINTS[exercise]}</p>
                </>
              )}
            </div>
          )}

          {/* Error Mode: текст ошибки берётся из Engine как есть */}
          {isRunning && result.error && (
            <div className="error-card" role="alert">
              <div className="error-card__title">FORM ERROR</div>
              <div className="error-card__text">{result.error}</div>
            </div>
          )}
        </div>

        <aside className="panel">
          <div className={`status status--${status.tone}`}>{status.label}</div>
          {isRunning && result.feedback && <p className="feedback">{result.feedback}</p>}

          <div className="stats-grid">
            <div className="stat">
              <div className="stat__label">Повторы</div>
              <div className="stat__value">{result.repCount}</div>
            </div>
            <div className="stat">
              <div className="stat__label">Идеальные</div>
              <div className="stat__value stat__value--good">{result.perfectReps}</div>
            </div>
            <div className="stat">
              <div className="stat__label">Ошибки</div>
              <div className="stat__value stat__value--bad">{result.totalErrors}</div>
            </div>
          </div>

          <div className="progress">
            <div className="progress__head">
              <span>Прогресс движения</span>
              <span>{progress ?? 0}%</span>
            </div>
            <div className="progress__track">
              <div
                className={`progress__fill ${result.error ? 'progress__fill--bad' : ''}`}
                style={{ width: `${progress ?? 0}%` }}
              />
            </div>
          </div>

          <div className="controls">
            {isRunning ? (
              <button className="btn btn--danger" onClick={stop}>
                Stop workout
              </button>
            ) : (
              <button
                className="btn btn--primary"
                onClick={handleStart}
                disabled={!isReady || isStarting || !!initError}
              >
                {isStarting ? 'Запуск камеры…' : 'Start workout'}
              </button>
            )}
            <button className="btn" onClick={resetStats}>
              Reset
            </button>
          </div>

          <div className="controls">
            <button className="btn btn--primary" onClick={handleNext}>
              {isLastExercise ? 'Завершить тренировку' : `Далее: ${EXERCISE_LABELS[WORKOUT_PLAN[planIndex + 1]]}`}
            </button>
            {!isLastExercise && (
              <button className="btn" onClick={handleFinish}>
                Завершить
              </button>
            )}
          </div>

          {completedSets.length > 0 && (
            <div className="done-sets">
              <div className="muted small">Выполнено:</div>
              {completedSets.map((s, i) => (
                <div key={i} className="small">
                  {EXERCISE_LABELS[s.exercise]} — {s.repCount} повт. ({s.perfectReps} идеальных)
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
