// src/engine/motionEngine.ts
import { ExerciseType, Landmark3D, MotionResult } from './types';
import { SquatDetector } from './detectors/SquatDetector';
import { LungeDetector } from './detectors/LungeDetector';
import { JumpingJackDetector } from './detectors/JumpingJackDetector';

export class MotionEngine {
  private currentExercise: ExerciseType = 'squat';
  private squatDetector = new SquatDetector();
  private lungeDetector = new LungeDetector();
  private jumpingJackDetector = new JumpingJackDetector();
  private lastSpokenError: string | null = null;
  private voiceEnabled = true;

  setExercise(exercise: ExerciseType) {
    this.currentExercise = exercise;
    this.lastSpokenError = null;
    this.resetStats();
  }

  getExercise(): ExerciseType {
    return this.currentExercise;
  }

  setVoiceEnabled(enabled: boolean) {
    this.voiceEnabled = enabled;
  }

  isVoiceEnabled(): boolean {
    return this.voiceEnabled;
  }

  resetStats() {
    this.squatDetector.reset();
    this.lungeDetector.reset();
    this.jumpingJackDetector.reset();
    this.lastSpokenError = null;
  }

  /**
   * Главный цикл обработки кадра
   */
  process(landmarks: Landmark3D[] | null): MotionResult {
    if (!landmarks || landmarks.length === 0) {
      return {
        exercise: this.currentExercise,
        state: 'idle',
        repCount: this.getActiveDetector().repCount,
        perfectReps: this.getActiveDetector().perfectReps,
        totalErrors: this.getActiveDetector().totalErrors,
        isCorrect: true,
        feedback: 'Встаньте перед камерой, чтобы вас было видно целиком'
      };
    }

    let result: MotionResult;

    switch (this.currentExercise) {
      case 'squat':
        result = this.squatDetector.process(landmarks);
        break;
      case 'lunge':
        result = this.lungeDetector.process(landmarks);
        break;
      case 'jumping_jack':
        result = this.jumpingJackDetector.process(landmarks);
        break;
      default:
        result = {
          exercise: 'none',
          state: 'idle',
          repCount: 0,
          perfectReps: 0,
          totalErrors: 0,
          isCorrect: true
        };
    }

    // Голосовая подсказка при новой ошибке (Error Mode Voice Assistant)
    if (this.voiceEnabled && result.error && result.error !== this.lastSpokenError) {
      this.lastSpokenError = result.error;
      this.speak(result.error);
    } else if (!result.error) {
      this.lastSpokenError = null;
    }

    return result;
  }

  private getActiveDetector() {
    switch (this.currentExercise) {
      case 'squat': return this.squatDetector;
      case 'lunge': return this.lungeDetector;
      case 'jumping_jack': return this.jumpingJackDetector;
      default: return this.squatDetector;
    }
  }

  private speak(text: string) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ru-RU';
        utterance.rate = 1.15;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('Speech synthesis error:', e);
      }
    }
  }
}

export const motionEngine = new MotionEngine();
