// src/engine/detectors/JumpingJackDetector.ts
import { Landmark3D, MotionResult } from '../types';
import { POSE_LANDMARKS } from '../landmarks';
import { calculateDistance } from '../geometry';

export class JumpingJackDetector {
  private stage: 'CLOSED' | 'OPEN' = 'CLOSED';
  private maxHandHeight = 1.0; // Y-координата (0 - вверху, 1 - внизу)
  private maxFootSpread = 0;
  private lastError: string | null = null;
  private errorTimestamp = 0;

  public repCount = 0;
  public perfectReps = 0;
  public totalErrors = 0;

  reset() {
    this.stage = 'CLOSED';
    this.maxHandHeight = 1.0;
    this.maxFootSpread = 0;
    this.repCount = 0;
    this.perfectReps = 0;
    this.totalErrors = 0;
    this.lastError = null;
  }

  process(landmarks: Landmark3D[]): MotionResult {
    const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST];
    const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST];
    const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
    const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
    const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];

    if (!leftWrist || !rightWrist || !leftShoulder || !rightShoulder || !leftAnkle || !rightAnkle) {
      return {
        exercise: 'jumping_jack',
        state: 'idle',
        repCount: this.repCount,
        perfectReps: this.perfectReps,
        totalErrors: this.totalErrors,
        isCorrect: true,
        feedback: 'Встаньте в полный рост лицом к камере'
      };
    }

    const shoulderWidth = calculateDistance(leftShoulder, rightShoulder);
    const ankleDistance = calculateDistance(leftAnkle, rightAnkle);
    
    // Относительная ширина постановки ног (кратна ширине плеч)
    const legSpreadRatio = shoulderWidth > 0 ? (ankleDistance / shoulderWidth) : 1;

    // Высота рук: Y-координата запястий относительно плеч (в MediaPipe Y=0 вверху, Y=1 внизу)
    const avgWristY = (leftWrist.y + rightWrist.y) / 2;
    const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const isHandsAboveShoulders = avgWristY < avgShoulderY;
    const isHandsAboveHead = avgWristY < avgShoulderY - 0.15;

    const highlightedJoints: number[] = [];

    // Очистка ошибки по таймауту
    if (this.lastError && performance.now() - this.errorTimestamp > 2500) {
      this.lastError = null;
    }

    let state: MotionResult['state'] = 'ready';

    // 1. Переход в раскрытое состояние (OPEN)
    if (legSpreadRatio > 1.25 || isHandsAboveShoulders) {
      if (this.stage === 'CLOSED') {
        this.stage = 'OPEN';
        this.maxFootSpread = legSpreadRatio;
        this.maxHandHeight = avgWristY;
      }
      state = 'moving';

      if (legSpreadRatio > this.maxFootSpread) this.maxFootSpread = legSpreadRatio;
      if (avgWristY < this.maxHandHeight) this.maxHandHeight = avgWristY;
    }

    // 2. Возврат в исходное положение (CLOSED) - ноги вместе, руки внизу
    if (this.stage === 'OPEN' && legSpreadRatio < 1.05 && avgWristY > avgShoulderY) {
      this.repCount++;

      const isArmsHighEnough = this.maxHandHeight < avgShoulderY - 0.12;
      const isLegsWideEnough = this.maxFootSpread >= 1.35;

      if (isArmsHighEnough && isLegsWideEnough) {
        this.perfectReps++;
        this.lastError = null;
        state = 'rep_success';
      } else {
        this.totalErrors++;
        state = 'rep_error';

        if (!isArmsHighEnough) {
          this.lastError = 'Подними руки выше головы при прыжке!';
          highlightedJoints.push(POSE_LANDMARKS.LEFT_WRIST, POSE_LANDMARKS.RIGHT_WRIST);
        } else if (!isLegsWideEnough) {
          this.lastError = 'Прыгай шире! Расставь ноги шире плеч';
          highlightedJoints.push(POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.RIGHT_ANKLE);
        }
        this.errorTimestamp = performance.now();
      }

      this.stage = 'CLOSED';
      this.maxFootSpread = 0;
      this.maxHandHeight = 1.0;
    }

    // Прогресс раскрытия (от 1.0 до 1.5 ширины плеч)
    const progress = Math.min(100, Math.max(0, Math.round(((legSpreadRatio - 0.9) / 0.6) * 100)));

    let feedback = 'Прыжок: ноги врозь, руки вверх над головой';
    if (this.lastError) {
      feedback = this.lastError;
    } else if (this.stage === 'OPEN') {
      feedback = isHandsAboveHead ? 'Отлично! Возвращайтесь в центр' : 'Тяни руки выше над головой!';
    } else if (state === 'rep_success') {
      feedback = 'Отличный прыжок! Продолжайте';
    }

    return {
      exercise: 'jumping_jack',
      state,
      repCount: this.repCount,
      perfectReps: this.perfectReps,
      totalErrors: this.totalErrors,
      isCorrect: !this.lastError,
      error: this.lastError ?? undefined,
      feedback,
      highlightJoints: highlightedJoints.length > 0 ? highlightedJoints : (this.lastError ? [POSE_LANDMARKS.LEFT_WRIST, POSE_LANDMARKS.RIGHT_WRIST] : []),
      metrics: {
        progress
      }
    };
  }
}
