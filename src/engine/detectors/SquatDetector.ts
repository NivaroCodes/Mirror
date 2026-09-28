// src/engine/detectors/SquatDetector.ts
import { Landmark3D, MotionResult } from '../types';
import { POSE_LANDMARKS } from '../landmarks';
import { calculateAngle, AngleSmoother, calculateDistance } from '../geometry';

export class SquatDetector {
  private stage: 'UP' | 'DOWN' = 'UP';
  private minAngle = 180;
  private smoother = new AngleSmoother(0.35);
  private lastError: string | null = null;
  private errorTimestamp = 0;
  private hadBackErrorInCurrentRep = false;
  private hadValgusErrorInCurrentRep = false;

  public repCount = 0;
  public perfectReps = 0;
  public totalErrors = 0;

  reset() {
    this.stage = 'UP';
    this.minAngle = 180;
    this.smoother.reset();
    this.repCount = 0;
    this.perfectReps = 0;
    this.totalErrors = 0;
    this.lastError = null;
    this.hadBackErrorInCurrentRep = false;
    this.hadValgusErrorInCurrentRep = false;
  }

  process(landmarks: Landmark3D[]): MotionResult {
    // 1. Выбираем сторону тела с лучшей видимостью
    const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
    const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
    const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];

    const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
    const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
    const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
    const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];

    const leftVisibility = (leftKnee?.visibility ?? 0) + (leftHip?.visibility ?? 0);
    const rightVisibility = (rightKnee?.visibility ?? 0) + (rightHip?.visibility ?? 0);

    const isLeft = leftVisibility >= rightVisibility;
    const hip = isLeft ? leftHip : rightHip;
    const knee = isLeft ? leftKnee : rightKnee;
    const ankle = isLeft ? leftAnkle : rightAnkle;
    const shoulder = isLeft ? leftShoulder : rightShoulder;
    const activeKneeIdx = isLeft ? POSE_LANDMARKS.LEFT_KNEE : POSE_LANDMARKS.RIGHT_KNEE;
    const activeHipIdx = isLeft ? POSE_LANDMARKS.LEFT_HIP : POSE_LANDMARKS.RIGHT_HIP;

    if (!hip || !knee || !ankle || !shoulder || (knee.visibility ?? 0) < 0.5) {
      return {
        exercise: 'squat',
        state: 'idle',
        repCount: this.repCount,
        perfectReps: this.perfectReps,
        totalErrors: this.totalErrors,
        isCorrect: true,
        feedback: 'Встаньте в кадр в полный рост для начала приседаний'
      };
    }

    const rawKneeAngle = calculateAngle(hip, knee, ankle);
    const kneeAngle = this.smoother.smooth(rawKneeAngle);

    // Расчет прогресса глубины (от 160° до 90°)
    const progress = Math.min(100, Math.max(0, Math.round(((160 - kneeAngle) / (160 - 90)) * 100)));

    // 2. Проверка ошибок техники в реальном времени
    const backAngle = calculateAngle(shoulder, hip, knee);
    const highlightedJoints: number[] = [];

    // Ошибка: Сильный наклон спины (клев носом)
    if (backAngle < 60 && kneeAngle < 140) {
      this.hadBackErrorInCurrentRep = true;
      this.lastError = 'Держи спину прямее! Не наклоняй корпус вперед';
      this.errorTimestamp = performance.now();
      highlightedJoints.push(isLeft ? POSE_LANDMARKS.LEFT_SHOULDER : POSE_LANDMARKS.RIGHT_SHOULDER, activeHipIdx);
    }

    // Ошибка: Завал колен внутрь (Valgus) если обе ноги видны
    if (leftKnee && rightKnee && leftAnkle && rightAnkle && (leftKnee.visibility ?? 0) > 0.6 && (rightKnee.visibility ?? 0) > 0.6) {
      const kneesDist = calculateDistance(leftKnee, rightKnee);
      const anklesDist = calculateDistance(leftAnkle, rightAnkle);
      if (kneeAngle < 130 && kneesDist < anklesDist * 0.75) {
        this.hadValgusErrorInCurrentRep = true;
        this.lastError = 'Разводи колени наружу! Не своди их внутрь';
        this.errorTimestamp = performance.now();
        highlightedJoints.push(POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.RIGHT_KNEE);
      }
    }

    // Очистка старой ошибки через 2.5 секунды
    if (this.lastError && performance.now() - this.errorTimestamp > 2500) {
      this.lastError = null;
    }

    // 3. State Machine (UP -> DOWN -> UP)
    let state: MotionResult['state'] = 'ready';

    if (kneeAngle < 145 && this.stage === 'UP') {
      this.stage = 'DOWN';
      this.minAngle = kneeAngle;
      this.hadBackErrorInCurrentRep = false;
      this.hadValgusErrorInCurrentRep = false;
    }

    if (this.stage === 'DOWN') {
      state = 'moving';
      if (kneeAngle < this.minAngle) {
        this.minAngle = kneeAngle;
      }

      // Выход обратно в исходное положение стоя
      if (kneeAngle > 155) {
        this.repCount++;

        if (this.minAngle <= 102 && !this.hadBackErrorInCurrentRep && !this.hadValgusErrorInCurrentRep) {
          // ИДЕАЛЬНЫЙ ПОВТОР!
          this.perfectReps++;
          this.lastError = null;
          state = 'rep_success';
        } else {
          // ОШИБКА В ПОВТОРЕНИИ
          this.totalErrors++;
          state = 'rep_error';
          highlightedJoints.push(activeKneeIdx);

          if (this.minAngle > 115) {
            this.lastError = 'Слишком мелкий присед! Опусти таз ниже уровня колен';
          } else if (this.hadBackErrorInCurrentRep) {
            this.lastError = 'Повтор не засчитан: спина слишком наклонена вперед';
          } else if (this.hadValgusErrorInCurrentRep) {
            this.lastError = 'Повтор не засчитан: колени сведены внутрь';
          }
          this.errorTimestamp = performance.now();
        }

        // Сброс на исходную
        this.stage = 'UP';
        this.minAngle = 180;
      }
    }

    const isCurrentCorrect = !this.lastError && (this.minAngle <= 105 || this.stage === 'UP');

    let feedback = 'Опускайтесь в присед до параллели с полом';
    if (this.lastError) {
      feedback = this.lastError;
    } else if (this.stage === 'DOWN') {
      if (kneeAngle <= 95) {
        feedback = 'Отличная глубина! Поднимайтесь вверх';
      } else {
        feedback = 'Еще немного ниже...';
      }
    } else if (this.perfectReps > 0 && state === 'rep_success') {
      feedback = 'Идеальное повторение! Продолжайте';
    }

    return {
      exercise: 'squat',
      state,
      repCount: this.repCount,
      perfectReps: this.perfectReps,
      totalErrors: this.totalErrors,
      isCorrect: isCurrentCorrect,
      error: this.lastError ?? undefined,
      feedback,
      highlightJoints: highlightedJoints.length > 0 ? highlightedJoints : (this.lastError ? [activeKneeIdx] : []),
      metrics: {
        currentAngle: kneeAngle,
        targetAngle: 90,
        progress
      }
    };
  }
}
