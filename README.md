# Mirror

> **Your webcam becomes your personal fitness coach.**

**Mirror** is a browser-based computer vision fitness application that uses a regular webcam to recognize body movements in real time, count repetitions, analyze exercise technique, and provide specific feedback when an exercise is performed incorrectly.

No controllers.
No keyboard.
No mouse.
Just your camera and your movement.

### Live Demo

**https://mirror-six-snowy.vercel.app** — camera access is required.

---

## The Problem

When people train at home without a coach, they often cannot tell whether they are performing an exercise correctly.

A video can show what a correct squat or lunge should look like, but it cannot analyze the person's actual movement. As a result, users may:

- perform exercises with incorrect technique;
- repeat the same mistake without noticing it;
- count incorrect repetitions as completed repetitions;
- have no immediate feedback on how to improve their form.

---

## Our Solution

The user simply opens the web application, allows camera access, and starts exercising.

Mirror:

1. Detects the user's body pose in real time.
2. Extracts body landmarks from the camera stream.
3. Analyzes joint geometry and movement patterns.
4. Tracks the phases of the current exercise.
5. Counts repetitions using custom movement logic.
6. Evaluates exercise technique.
7. Detects specific form errors.
8. Gives an actionable correction.
9. Shows the final workout result.

### The core interaction

```text
User movement
      ↓
Webcam
      ↓
Pose detection
      ↓
Body landmarks
      ↓
Motion Engine
      ↓
Exercise + technique analysis
      ↓
Correct repetition / Form error
      ↓
Real-time feedback
      ↓
Workout result
```

---

## Key Feature — Error Mode

The main twist of the challenge is not only recognizing a movement, but recognizing when the movement is incorrect and explaining how to fix it.

Mirror does not simply say *"Movement not recognized."* Instead, the Motion Engine analyzes the movement and produces a specific correction:

```text
FORM ERROR
Слишком мелкий присед! Опусти таз ниже уровня колен
```

The joints involved in the error are highlighted in red on the body skeleton, and the error can also be spoken aloud (Web Speech API).

This creates a complete feedback loop:

```text
Movement → Analysis → Error detected → Specific feedback → User corrects movement → Correct repetition
```

---

## Supported Exercises

| Exercise | Recognition | Technique analysis |
| :--- | :--- | :--- |
| **Squat** | UP → DOWN → UP state machine | Depth, torso position, knee alignment |
| **Lunge** | UP → DOWN → UP state machine (front leg) | Depth and front knee angle |
| **Jumping Jack** | CLOSED → OPEN → CLOSED state machine | Arm height and leg separation |

### Squat

The Motion Engine analyzes knee angle (depth), torso angle relative to the hip, and knee alignment (valgus — knees caving inward).

Detected errors:

- «Слишком мелкий присед! Опусти таз ниже уровня колен»
- «Держи спину прямее! Не наклоняй корпус вперед»
- «Разводи колени наружу! Не своди их внутрь»

### Lunge

The system identifies the front leg and analyzes its knee angle and the depth of the lower position.

Detected errors:

- «Колено уходит далеко вперед за носок! Сделай шаг шире»
- «Слишком мелкий выпад! Опусти заднее колено ближе к полу»

### Jumping Jack

The system analyzes arm elevation relative to the shoulders and the distance between the feet relative to shoulder width.

Detected errors:

- «Подними руки выше головы при прыжке!»
- «Прыгай шире! Расставь ноги шире плеч»

---

## Technical Architecture

Mirror runs entirely in the browser.

```text
┌─────────────────────────────┐
│        Webcam Stream        │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│  MediaPipe Pose Landmarker  │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│       Body Landmarks        │
│          33 points          │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│     Geometry Processing     │
│  Joint angles + proportions │
│        EMA filtering        │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│       Motion Detectors      │
│  SquatDetector              │
│  LungeDetector              │
│  JumpingJackDetector        │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│        MotionResult         │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│          React UI           │
│ Counter / Skeleton / Error  │
│ Feedback / Progress / Result│
└─────────────────────────────┘
```

---

## Motion Engine

The core computer vision logic is implemented in a dedicated Motion Engine (`src/engine/`).

The frontend does not need to know how MediaPipe or the mathematical analysis works. It uses a single React hook, `useMotionEngine`, and consumes a unified `MotionResult` object on every frame:

```json
{
  "exercise": "squat",
  "state": "rep_error",
  "repCount": 4,
  "perfectReps": 3,
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

This separation keeps the UI independent from the internal computer vision implementation. The integration guide for frontend developers is in [`src/engine/README.md`](src/engine/README.md).

---

## Custom Motion Recognition

MediaPipe is used only for pose estimation. The actual exercise interpretation — phases, repetitions and technique errors — is implemented by our own motion logic.

### Joint geometry

Angles between three body landmarks are calculated to evaluate body position (e.g. hip → knee → ankle for the knee angle):

```text
Point A
   \
    \
     Point B   ← angle vertex
    /
   /
Point C
```

### State machines

Each exercise has its own movement state machine:

```text
Squat / Lunge:   UP → DOWN → UP → REP
Jumping Jack:    CLOSED → OPEN → CLOSED → REP
```

This allows Mirror to distinguish movement phases instead of simply reacting to individual camera frames.

### Noise filtering

Joint angles are smoothed with an exponential moving average (EMA) to reduce camera tracking jitter.

---

## Technology Stack

- **Frontend:** React, TypeScript, Vite
- **Computer Vision:** MediaPipe Pose Landmarker (`@mediapipe/tasks-vision`)
- **Browser APIs:** `getUserMedia` (webcam access), Web Speech API (voice feedback)
- **Deployment:** Vercel

---

## Why No Backend?

The complete motion-processing pipeline runs directly in the browser:

```text
Webcam → MediaPipe → Motion Engine → React UI
```

This makes the application fast, simple to deploy, independent of a server, and suitable for real-time interaction. The video never leaves the user's device.

The MediaPipe model and WASM runtime are included locally in the project, so the computer vision pipeline does not depend on an external CDN.

---

## Project Structure

```text
Mirror/
├── public/
│   ├── models/
│   │   └── pose_landmarker_lite.task
│   └── wasm/                        # MediaPipe WASM runtime
├── src/
│   ├── engine/                      # Motion Engine (CV + kinematics)
│   │   ├── detectors/
│   │   │   ├── SquatDetector.ts
│   │   │   ├── LungeDetector.ts
│   │   │   └── JumpingJackDetector.ts
│   │   ├── geometry.ts
│   │   ├── landmarks.ts
│   │   ├── poseService.ts
│   │   ├── motionEngine.ts
│   │   ├── drawing.ts
│   │   ├── useMotionEngine.ts
│   │   ├── types.ts
│   │   ├── index.ts
│   │   └── README.md                # Integration guide
│   ├── workout/                     # Workout UI
│   │   ├── StartScreen.tsx
│   │   ├── WorkoutScreen.tsx
│   │   ├── ResultScreen.tsx
│   │   ├── workoutTypes.ts
│   │   └── workout.css
│   ├── EngineWorkbench.tsx          # Debug view: /?workbench
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── vite.config.ts
└── README.md
```

---

## Getting Started

**Requirements:** Node.js, npm, a device with a webcam, a modern browser with camera access.

```bash
git clone https://github.com/NivaroCodes/Mirror.git
cd Mirror
npm install
npm run dev
```

Open the local URL shown by Vite and allow camera access when prompted.

### Production Build

```bash
npm run build
```

The production output is generated in `dist/`.

---

## How to Use

1. Open Mirror.
2. Start a workout.
3. Allow access to your webcam.
4. Stand in front of the camera so your whole body is visible.
5. Follow the movement and watch your skeleton and live feedback.
6. Correct mistakes when Mirror detects them.
7. Move on to the next exercise (or switch exercises at any time).
8. Complete the workout and review your results.

### Complete Workout Flow

```text
Start → Camera Permission → Squat → Lunge → Jumping Jack → Workout Complete → Results
```

The result screen shows total repetitions, perfect repetitions, detected errors, form score and a per-exercise breakdown.

---

## Challenge Requirements

Mirror was built for the ADMIT Hackathon — **“Motion: Camera Instead of Joystick”** case.

| Requirement | Mirror implementation |
| :--- | :--- |
| Real-time webcam recognition | MediaPipe Pose Landmarker |
| Browser-based | Entire core pipeline runs in the browser |
| 3+ movements | Squat, Lunge, Jumping Jack |
| User feedback | Skeleton, counter, progress and feedback |
| Complete scenario | Start → Workout → Complete → Results |
| Error Mode | Specific technique errors and corrections |
| Custom recognition logic | Custom geometry + state machines |
| Visual feedback | Skeleton with highlighted error joints |
| Voice feedback | Web Speech API |

---

## Error Mode Implementation

Error Mode is implemented inside the Motion Engine rather than the UI. Each detector evaluates movement-specific conditions and returns a structured result:

```text
Detector
   ↓
Technique violation
   ↓
MotionResult
   ├── error
   ├── feedback
   ├── isCorrect
   └── highlightJoints
```

The frontend renders this information as is — the UI does not contain exercise-specific computer vision rules.

---

## Design Principles

1. **Real-time interaction** — the user receives feedback while performing the movement, not after the workout.
2. **Actionable feedback** — the system explains what needs to be corrected, rather than simply reporting that the movement failed.
3. **Custom movement logic** — MediaPipe provides body landmarks; Mirror's Motion Engine determines how those landmarks represent exercise movements.
4. **Simple user experience** — no account, installation, controller or additional hardware is required.
5. **Complete scenario** — one complete experience rather than a collection of disconnected CV demonstrations.

---

## Team

**Team:** Offbeat
**Project:** Mirror

Built for ADMIT Hackathon 2026 — Motion: Camera Instead of Joystick.

## License

This project was created for the ADMIT Hackathon.
