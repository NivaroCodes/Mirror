# Motion Engine Integration Guide (for Frontend)

Этот модуль отвечает за захват веб-камеры, инференс MediaPipe Pose, векторный анализ суставов, стейт-машины упражнений и детекцию ошибок (Error Mode).

Фронтендеру **не требуется** знать внутреннее устройство MediaPipe или формулы углов. Вся работа происходит через единственный React-хук `useMotionEngine`.

---

## 1. Точка входа и импорты

```tsx
import { useMotionEngine, ExerciseType, MotionResult } from './engine';
// или если в проекте настроен alias '@':
// import { useMotionEngine, ExerciseType, MotionResult } from '@/engine';
```

Экспортируемые типы и функции:
- `useMotionEngine` — основной хук.
- `ExerciseType` — `'squat' | 'lunge' | 'jumping_jack' | 'none'`.
- `MotionResult` — тип реактивного объекта состояния тренировки.

---

## 2. Создание Refs

В компоненте создаются два стандартных React-рефа:

```tsx
const videoRef = useRef<HTMLVideoElement | null>(null);
const canvasRef = useRef<HTMLCanvasElement | null>(null);
```

В разметке JSX:
```tsx
<div style={{ position: 'relative', width: '100%', aspectRatio: '16/9' }}>
  {/* Камера (зеркалим по горизонтали) */}
  <video
    ref={videoRef}
    playsInline
    muted
    style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scaleX(-1)' }}
  />

  {/* Холст для скелета (накладывается поверх видео) */}
  <canvas
    ref={canvasRef}
    width={1280}
    height={720}
    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', transform: 'scaleX(-1)', pointerEvents: 'none' }}
  />
</div>
```

---

## 3. Вызов хука `useMotionEngine`

### Входные параметры:
| Параметр | Тип | По умолчанию | Описание |
| :--- | :--- | :--- | :--- |
| `videoRef` | `RefObject<HTMLVideoElement>` | *обязательный* | Ссылка на `<video>` |
| `canvasRef` | `RefObject<HTMLCanvasElement>` | `undefined` | Ссылка на `<canvas>` (если передан, скелет и подсветка ошибок рисуются автоматически) |
| `initialExercise`| `ExerciseType` | `'squat'` | Стартовое упражнение (`'squat'` \| `'lunge'` \| `'jumping_jack'`) |
| `enableVoice` | `boolean` | `true` | Озвучивать ли ошибки голосом через Web Speech API |
| `enableOverlay`| `boolean` | `true` | Включить/выключить отрисовку скелета |

### Что возвращает хук:
| Возвращаемое поле / метод | Тип | Описание |
| :--- | :--- | :--- |
| `isReady` | `boolean` | `true`, когда MediaPipe загружен и готов к старту |
| `isRunning` | `boolean` | `true`, когда камера активна и кадры обрабатываются |
| `result` | `MotionResult` | **Главный реактивный объект** с данными тренировки |
| `fps` | `number` | Реальный FPS детекции (30+ FPS) |
| `initError` | `string \| null` | Ошибка загрузки (если есть) |
| `start()` | `() => Promise<void>` | Запустить камеру и анализ |
| `stop()` | `() => void` | Остановить камеру |
| `setExercise(ex)` | `(ex: ExerciseType) => void` | Переключить упражнение |
| `resetStats()` | `() => void` | Сбросить счётчики повторений |
| `setVoiceEnabled(val)` | `(enabled: boolean) => void` | Вкл/выкл озвучку ошибок |

---

## 4. Контракт `MotionResult`

На каждом кадре фронтенд получает объект следующего вида:

```typescript
export interface MotionResult {
  exercise: ExerciseType;     // 'squat' | 'lunge' | 'jumping_jack' | 'none'
  state: MotionState;         // 'idle' | 'ready' | 'moving' | 'rep_success' | 'rep_error'
  repCount: number;           // Общее количество засчитанных повторений
  perfectReps: number;        // Количество чистых повторений без ошибок
  totalErrors: number;        // Количество повторений с ошибками
  isCorrect: boolean;         // true, если в данный момент форма корректна
  error?: string;             // Текст конкретной ошибки (Error Mode)
  feedback?: string;          // Человекочитаемая подсказка пользователю
  highlightJoints?: number[]; // Индексы точек тела, где допущена ошибка (для красной подсветки)
  metrics?: {
    currentAngle?: number;    // Текущий угол сустава (например, колена)
    targetAngle?: number;     // Целевой угол (например, 90°)
    progress?: number;        // Прогресс движения от 0 до 100%
  };
}
```

---

## 5. Переключение упражнений

```tsx
// Достаточно вызвать метод:
setExercise('squat');        // Приседания
setExercise('lunge');        // Выпады
setExercise('jumping_jack'); // Джампинг Джеки
```
Движок сам переключает стейт-машину, сбрасывает временные флаги ошибок и начинает анализ нового движения.
