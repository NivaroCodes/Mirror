// src/engine/detectors/LungeDetector.ts
import { Landmark3D, MotionResult } from '../types';
import { POSE_LANDMARKS } from '../landmarks';
import { calculateAngle, AngleSmoother } from '../geometry';

export class LungeDetector {
  private stage: 'UP' | 'DOWN' = 'UP';
  private minAngle = 180;
  private smoother = new AngleSmoother(0.35);
  private lastError: string | null = null;
  private errorTimestamp = 0;
  private hadOverstepError = false;

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
    this.hadOverstepError = false;
  }

  process(landmarks: Landmark3D[]): MotionResult {
    const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
    const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
    const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
    const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
    const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];

    if (!leftKnee || !rightKnee || !leftAnkle || !rightAnkle || !leftHip || !rightHip) {
      return {
        exercise: 'lunge',
        state: 'idle',
        repCount: this.repCount,
        perfectReps: this.perfectReps,
        totalErrors: this.totalErrors,
        isCorrect: true,
        feedback: 'Встаньте боком или под углом к камере'
      };
    }

    // Определяем переднюю ногу (ту, у которой колено более согнуто или лодыжка впереди)
    const leftAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightAngle = calculateAngle(rightHip, rightKnee, rightAnkle);

    const isLeftFront = leftAngle < rightAngle;
    const frontKnee = isLeftFront ? leftKnee : rightKnee;
    const frontAnkle = isLeftFront ? leftAnkle : rightAnkle;
    const frontHip = isLeftFront ? leftHip : rightHip;
    const frontKneeIdx = isLeftFront ? POSE_LANDMARKS.LEFT_KNEE : POSE_LANDMARKS.RIGHT_KNEE;

    const rawAngle = isLeftFront ? leftAngle : rightAngle;
    const kneeAngle = this.smoother.smooth(rawAngle);

    const progress = Math.min(100, Math.max(0, Math.round(((160 - kneeAngle) / (160 - 90)) * 100)));
    const highlightedJoints: number[] = [];

    // Ошибка: колено слишком острое / уходит далеко вперед за носок
    if (kneeAngle < 78 && this.stage === 'DOWN') {
      this.hadOverstepError = true;
      this.lastError = 'Колено уходит далеко вперед за носок! Сделай шаг шире';
      this.errorTimestamp = performance.now();
      highlightedJoints.push(frontKneeIdx);
    }

    if (this.lastError && performance.now() - this.errorTimestamp > 2500) {
      this.lastError = null;
    }

    let state: MotionResult['state'] = 'ready';

    if (kneeAngle < 140 && this.stage === 'UP') {
      this.stage = 'DOWN';
      this.minAngle = kneeAngle;
      this.hadOverstepError = false;
    }

    if (this.stage === 'DOWN') {
      state = 'moving';
      if (kneeAngle < this.minAngle) {
        this.minAngle = kneeAngle;
      }

      if (kneeAngle > 155) {
        this.repCount++;

        if (this.minAngle <= 100 && !this.hadOverstepError) {
          this.perfectReps++;
          this.lastError = null;
          state = 'rep_success';
        } else {
          this.totalErrors++;
          state = 'rep_error';
          highlightedJoints.push(frontKneeIdx);

          if (this.minAngle > 115) {
            this.lastError = 'Слишком мелкий выпад! Опусти заднее колено ближе к полу';
          } else if (this.hadOverstepError) {
            this.lastError = 'Повтор с ошибкой: острый угол в колене';
          }
          this.errorTimestamp = performance.now();
        }

        this.stage = 'UP';
        this.minAngle = 180;
      }
    }

    let feedback = 'Сделайте шаг вперед и опуститесь в выпад (угол 90°)';
    if (this.lastError) {
      feedback = this.lastError;
    } else if (this.stage === 'DOWN') {
      feedback = kneeAngle <= 95 ? 'Отличный выпад! Возвращайтесь назад' : 'Опуститесь чуть глубже...';
    } else if (state === 'rep_success') {
      feedback = 'Отличный выпад! Засчитано';
    }

    return {
      exercise: 'lunge',
      state,
      repCount: this.repCount,
      perfectReps: this.perfectReps,
      totalErrors: this.totalErrors,
      isCorrect: !this.lastError,
      error: this.lastError ?? undefined,
      feedback,
      highlightJoints: highlightedJoints.length > 0 ? highlightedJoints : (this.lastError ? [frontKneeIdx] : []),
      metrics: {
        currentAngle: kneeAngle,
        targetAngle: 90,
        progress
      }
    };
  }
}
