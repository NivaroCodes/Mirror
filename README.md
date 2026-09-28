# Mirror — Motion Engine (CV & Kinematics)

Ядро компьютерного зрения и кинематического анализа движений для веб-приложения **Mirror**. 

Движок работает прямо в браузере через веб-камеру, вычисляет 33 анатомические точки тела, фильтрует шум тремора, анализирует углы суставов через конечные автоматы (State Machine) и реализует **Режим «Ошибка» (Error Mode)** с конкретными подсказками по исправлению техники.

---

## 🚀 Как фронтенду подключить Motion Engine

Вся внутренняя математика и MediaPipe скрыты за единой точкой входа — хуком `useMotionEngine` из `@/engine`.

### Пример использования в React-компоненте:

```tsx
import React, { useRef, useState } from 'react';
import { useMotionEngine, ExerciseType, MotionResult } from './engine';

export function WorkoutScreen() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [exercise, setExerciseType] = useState<ExerciseType>('squat');

  const {
    isReady,         // true, когда модель MediaPipe загружена
    isRunning,       // true, когда идет захват камеры и анализ
    result,          // Текущий объект MotionResult в реальном времени
    fps,             // Кадры в секунду
    start,           // Запустить камеру и анализ
    stop,            // Остановить камеру
    setExercise,     // Сменить упражнение ('squat' | 'lunge' | 'jumping_jack')
    resetStats       // Сбросить счетчики повторений
  } = useMotionEngine({
    videoRef,
    canvasRef,       // Опционально: автоматически рисует скелет с подсветкой ошибок
    initialExercise: 'squat',
    enableVoice: true // Озвучивать ли ошибки голосом (Web Speech API)
  });

  return (
    <div>
      {/* 1. Видео и Скелет */}
      <div style={{ position: 'relative' }}>
        <video ref={videoRef} playsInline muted style={{ transform: 'scaleX(-1)' }} />
        <canvas ref={canvasRef} width={1280} height={720} style={{ position: 'absolute', top: 0, left: 0, transform: 'scaleX(-1)' }} />
      </div>

      {/* 2. Кнопки управления */}
      {!isRunning ? (
        <button onClick={start} disabled={!isReady}>Начать тренировку</button>
      ) : (
        <button onClick={stop}>Завершить</button>
      )}

      {/* 3. Переключатель упражнений */}
      <button onClick={() => { setExerciseType('squat'); setExercise('squat'); }}>Приседания</button>
      <button onClick={() => { setExerciseType('lunge'); setExercise('lunge'); }}>Выпады</button>
      <button onClick={() => { setExerciseType('jumping_jack'); setExercise('jumping_jack'); }}>Джампинг Джеки</button>

      {/* 4. Отображение прогресса и ошибок */}
      <h2>Повторений: {result.repCount} (Идеальных: {result.perfectReps})</h2>

      {/* Баннер ошибки */}
      {result.error && (
        <div className="error-banner">
          ⚠️ <b>Ошибка формы:</b> {result.error}
        </div>
      )}

      {/* Подсказка или статус */}
      <p>{result.feedback}</p>
    </div>
  );
}
```

---

## 📦 Контракт данных `MotionResult`

На каждом кадре (30+ FPS) фронтенд получает строго типизированный объект:

```typescript
export interface MotionResult {
  exercise: 'squat' | 'lunge' | 'jumping_jack' | 'none';
  state: 'idle' | 'ready' | 'moving' | 'rep_success' | 'rep_error';
  repCount: number;          // Общее количество завершенных повторов
  perfectReps: number;       // Количество идеальных повторов без ошибок
  totalErrors: number;       // Количество повторений с зафиксированной ошибкой
  isCorrect: boolean;        // true, если в данный момент нет критической ошибки
  error?: string;            // Текст конкретной ошибки (если есть)
  feedback?: string;         // Человекочитаемая подсказка пользователю
  highlightJoints?: number[];// Индексы суставов для отрисовки красным цветом
  metrics?: {
    currentAngle?: number;   // Текущий угол (например, колена: 112°)
    targetAngle?: number;    // Целевой угол (например: 90°)
    progress?: number;       // Прогресс движения (0..100%)
  };
}
```

### Пример реального значения при ошибке недоседа:
```json
{
  "exercise": "squat",
  "state": "rep_error",
  "repCount": 5,
  "perfectReps": 4,
  "totalErrors": 1,
  "isCorrect": false,
  "error": "Слишком мелкий присед! Опусти таз ниже уровня колен",
  "feedback": "Слишком мелкий присед! Опусти таз ниже уровня колен",
  "highlightJoints": [25],
  "metrics": {
    "currentAngle": 118,
    "targetAngle": 90,
    "progress": 60
  }
}
```

---

## 🤸 Поддерживаемые упражнения и ошибки (Error Mode)

| Упражнение | Ключевая механика | Определяемые ошибки |
| :--- | :--- | :--- |
| **Squats** (Приседания) | Сгибание колена до угла $\le 100^\circ$ с прямой спиной | 1. **Недосед** ($>115^\circ$): «Опусти таз ниже колен».<br>2. **Наклон спины** ($<60^\circ$): «Держи спину прямее!».<br>3. **Завал колен внутрь (Valgus)**. |
| **Lunges** (Выпады) | Шаг вперед, переднее колено сгибается под $90^\circ$ | 1. **Колено ушло за носок** ($<78^\circ$): «Сделай шаг шире».<br>2. **Мелкий выпад** ($>115^\circ$): «Опусти заднее колено ближе к полу». |
| **Jumping Jacks** | Синхронный прыжок: руки над головой, ноги шире плеч | 1. **Низкие руки**: «Подними руки выше головы!».<br>2. **Узкий прыжок**: «Прыгай шире! Ноги шире плеч». |

---

## 🛠 Запуск проекта

```bash
# Установка зависимостей (один раз)
npm install

# Запуск dev-сервера
npm run dev

# Проверка сборки
npm run build
```
Все модели и WebAssembly упакованы локально в `/public` — приложение работает без интернета и VPN.
