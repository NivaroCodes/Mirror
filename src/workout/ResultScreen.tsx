// src/workout/ResultScreen.tsx
import React from 'react';
import { ExerciseSet, EXERCISE_LABELS, calculateTotals } from './workoutTypes';

interface ResultScreenProps {
  sets: ExerciseSet[];
  onRestart: () => void;
}

export function ResultScreen({ sets, onRestart }: ResultScreenProps) {
  const totals = calculateTotals(sets);

  return (
    <div className="screen screen--center">
      <div className="card result-card">
        <h1>Тренировка завершена</h1>

        <div className="stats-grid">
          <div className="stat">
            <div className="stat__label">Всего повторов</div>
            <div className="stat__value">{totals.repCount}</div>
          </div>
          <div className="stat">
            <div className="stat__label">Идеальные</div>
            <div className="stat__value stat__value--good">{totals.perfectReps}</div>
          </div>
          <div className="stat">
            <div className="stat__label">С ошибками</div>
            <div className="stat__value stat__value--bad">{totals.totalErrors}</div>
          </div>
          <div className="stat">
            <div className="stat__label">Form Score</div>
            <div className="stat__value">{totals.formScore === null ? '—' : `${totals.formScore}%`}</div>
          </div>
        </div>

        <h2>Выполненные упражнения</h2>
        {sets.length === 0 ? (
          <p className="muted">Ни одного повтора не засчитано.</p>
        ) : (
          <table className="sets-table">
            <thead>
              <tr>
                <th>Упражнение</th>
                <th>Повторы</th>
                <th>Идеальные</th>
                <th>Ошибки</th>
              </tr>
            </thead>
            <tbody>
              {sets.map((s, i) => (
                <tr key={i}>
                  <td>{EXERCISE_LABELS[s.exercise]}</td>
                  <td>{s.repCount}</td>
                  <td>{s.perfectReps}</td>
                  <td>{s.totalErrors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <button className="btn btn--primary btn--large" onClick={onRestart}>
          Новая тренировка
        </button>
      </div>
    </div>
  );
}
