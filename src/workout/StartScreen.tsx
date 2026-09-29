// src/workout/StartScreen.tsx
import React from 'react';
import { WORKOUT_PLAN, EXERCISE_LABELS } from './workoutTypes';

interface StartScreenProps {
  onStart: () => void;
}

export function StartScreen({ onStart }: StartScreenProps) {
  return (
    <div className="screen screen--center">
      <div className="card start-card">
        <h1>Mirror</h1>
        <p className="muted">AI-тренер: камера следит за техникой и считает повторения.</p>

        <h2>Тренировка</h2>
        <ol className="plan-list">
          {WORKOUT_PLAN.map((ex) => (
            <li key={ex}>{EXERCISE_LABELS[ex]}</li>
          ))}
        </ol>

        <p className="muted small">
          Понадобится доступ к камере. Отойдите так, чтобы в кадр попадало всё тело.
        </p>

        <button className="btn btn--primary btn--large" onClick={onStart}>
          Начать тренировку
        </button>
      </div>
    </div>
  );
}
