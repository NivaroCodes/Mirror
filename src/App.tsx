// src/App.tsx
import React, { useState } from 'react';
import EngineWorkbench from './EngineWorkbench';
import { StartScreen } from './workout/StartScreen';
import { WorkoutScreen } from './workout/WorkoutScreen';
import { ResultScreen } from './workout/ResultScreen';
import { ExerciseSet } from './workout/workoutTypes';
import './workout/workout.css';

type Screen = 'start' | 'workout' | 'result';

function WorkoutFlow() {
  const [screen, setScreen] = useState<Screen>('start');
  const [sets, setSets] = useState<ExerciseSet[]>([]);

  if (screen === 'workout') {
    return (
      <WorkoutScreen
        onComplete={(completed) => {
          setSets(completed);
          setScreen('result');
        }}
      />
    );
  }

  if (screen === 'result') {
    return <ResultScreen sets={sets} onRestart={() => setScreen('start')} />;
  }

  return <StartScreen onStart={() => setScreen('workout')} />;
}

// Отладочный стенд Engine доступен по адресу /?workbench
const isWorkbench = new URLSearchParams(window.location.search).has('workbench');

export default function App() {
  return isWorkbench ? <EngineWorkbench /> : <WorkoutFlow />;
}
