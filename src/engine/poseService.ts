// src/engine/poseService.ts
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { Landmark3D } from './types';

export class PoseService {
  private landmarker: PoseLandmarker | null = null;
  private isRunning = false;
  private videoElement: HTMLVideoElement | null = null;
  private onLandmarksCallback: ((landmarks: Landmark3D[] | null) => void) | null = null;
  private animationFrameId: number | null = null;

  /**
   * Инициализация модели MediaPipe PoseLandmarker
   */
  async initialize(wasmUrl = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(wasmUrl);
    this.landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
  }

  /**
   * Подключение веб-камеры и запуск цикла детекции
   */
  async startWebcam(
    videoElement: HTMLVideoElement, 
    onLandmarks: (landmarks: Landmark3D[] | null) => void
  ): Promise<MediaStream> {
    this.videoElement = videoElement;
    this.onLandmarksCallback = onLandmarks;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      },
      audio: false
    });

    videoElement.srcObject = stream;
    await new Promise<void>((resolve) => {
      videoElement.onloadedmetadata = () => {
        videoElement.play();
        resolve();
      };
    });

    this.isRunning = true;
    this.startDetectionLoop();

    return stream;
  }

  /**
   * Цикл обработки кадров
   */
  private startDetectionLoop() {
    let lastVideoTime = -1;

    const render = () => {
      if (!this.isRunning || !this.videoElement || !this.landmarker) return;

      if (this.videoElement.currentTime !== lastVideoTime && this.videoElement.readyState >= 2) {
        lastVideoTime = this.videoElement.currentTime;
        const startTimeMs = performance.now();
        const result = this.landmarker.detectForVideo(this.videoElement, startTimeMs);

        if (result.landmarks && result.landmarks.length > 0) {
          this.onLandmarksCallback?.(result.landmarks[0] as Landmark3D[]);
        } else {
          this.onLandmarksCallback?.(null);
        }
      }

      this.animationFrameId = requestAnimationFrame(render);
    };

    this.animationFrameId = requestAnimationFrame(render);
  }

  /**
   * Остановка камеры и цикла
   */
  stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.videoElement && this.videoElement.srcObject) {
      const stream = this.videoElement.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      this.videoElement.srcObject = null;
    }
  }
}

export const poseService = new PoseService();
