// src/App.tsx
import React, { useEffect, useRef, useState } from 'react';
import { poseService } from './engine/poseService';
import { drawSkeleton } from './engine/drawing';
import { Landmark3D, MotionResult } from './engine/types';
import { POSE_LANDMARKS } from './engine/landmarks';
import { calculateAngle, AngleSmoother } from './engine/geometry';

export default function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isModelLoading, setIsModelLoading] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [landmarksCount, setLandmarksCount] = useState(0);
  const [fps, setFps] = useState(0);
  const [currentKneeAngle, setCurrentKneeAngle] = useState<number | null>(null);

  // Демонстрационный MotionResult для проверки контракта
  const [motionResult, setMotionResult] = useState<MotionResult>({
    exercise: 'squat',
    state: 'idle',
    repCount: 0,
    isCorrect: true,
    feedback: 'Встаньте перед камерой в полный рост'
  });

  const kneeSmoother = useRef(new AngleSmoother(0.35));
  const lastTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);

  // 1. Инициализация MediaPipe Pose
  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        console.log('Инициализация MediaPipe PoseLandmarker...');
        await poseService.initialize();
        if (mounted) {
          setIsModelLoading(false);
          console.log('MediaPipe PoseLandmarker готов к работе!');
        }
      } catch (err) {
        console.error('Ошибка загрузки MediaPipe:', err);
      }
    }
    init();

    return () => {
      mounted = false;
      poseService.stop();
    };
  }, []);

  // 2. Запуск камеры
  const handleStartCamera = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      await poseService.startWebcam(videoRef.current, (landmarks: Landmark3D[] | null) => {
        // Подсчет FPS
        frameCountRef.current++;
        const now = performance.now();
        if (now - lastTimeRef.current >= 1000) {
          setFps(frameCountRef.current);
          frameCountRef.current = 0;
          lastTimeRef.current = now;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (!landmarks || landmarks.length === 0) {
          setLandmarksCount(0);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          setCurrentKneeAngle(null);
          setMotionResult(prev => ({
            ...prev,
            state: 'idle',
            feedback: 'Человек не обнаружен. Отойдите назад, чтобы тело было видно.'
          }));
          return;
        }

        setLandmarksCount(landmarks.length);

        // Расчет тестового угла колена (левая нога: 23, 25, 27)
        const hip = landmarks[POSE_LANDMARKS.LEFT_HIP];
        const knee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
        const ankle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];

        let angle: number | null = null;
        let isAngleValid = false;

        if (hip && knee && ankle && (hip.visibility ?? 0) > 0.5 && (knee.visibility ?? 0) > 0.5) {
          const raw = calculateAngle(hip, knee, ankle);
          angle = kneeSmoother.current.smooth(raw);
          setCurrentKneeAngle(angle);
          isAngleValid = true;
        }

        // Отрисовка скелета на Canvas
        drawSkeleton(ctx, landmarks, canvas.width, canvas.height, {
          color: '#22c55e',
          highlightJoints: isAngleValid && angle && angle < 100 ? [POSE_LANDMARKS.LEFT_KNEE] : [],
          highlightColor: '#3b82f6'
        });

        // Обновление MotionResult для UI
        setMotionResult(prev => ({
          exercise: 'squat',
          state: isAngleValid ? (angle! < 100 ? 'moving' : 'ready') : 'idle',
          repCount: prev.repCount,
          isCorrect: true,
          feedback: isAngleValid 
            ? `Угол колена: ${angle}° (Цель: 90°)` 
            : 'Встаньте боком или прямо для точного замера',
          metrics: {
            currentAngle: angle ?? undefined,
            targetAngle: 90
          }
        }));
      });

      setIsCameraActive(true);
    } catch (err) {
      console.error('Ошибка доступа к камере:', err);
      alert('Не удалось получить доступ к веб-камере. Проверьте разрешения браузера.');
    }
  };

  const handleStopCamera = () => {
    poseService.stop();
    setIsCameraActive(false);
    setLandmarksCount(0);
    setCurrentKneeAngle(null);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '16px', boxSizing: 'border-box', backgroundColor: '#090d16', color: '#e2e8f0', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '12px', marginBottom: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', color: '#38bdf8' }}>Mirror — CV Motion Engine Workbench</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
            Проверка связки: <b>Webcam → MediaPipe Pose → Landmarks → MotionResult</b>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '12px', backgroundColor: isModelLoading ? '#eab30822' : '#22c55e22', color: isModelLoading ? '#eab308' : '#22c55e', border: `1px solid ${isModelLoading ? '#eab30844' : '#22c55e44'}` }}>
            {isModelLoading ? '⏳ Загрузка MediaPipe...' : '✓ MediaPipe готов'}
          </span>
          <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '12px', backgroundColor: isCameraActive ? '#3b82f622' : '#64748b22', color: isCameraActive ? '#3b82f6' : '#94a3b8', border: '1px solid #334155' }}>
            {isCameraActive ? `FPS: ${fps}` : 'Камера выключена'}
          </span>
          {isCameraActive ? (
            <button onClick={handleStopCamera} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
              Остановить
            </button>
          ) : (
            <button onClick={handleStartCamera} disabled={isModelLoading} style={{ background: isModelLoading ? '#475569' : '#0284c7', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: isModelLoading ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
              Включить камеру
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace */}
      <div style={{ display: 'flex', flex: 1, gap: '16px', minHeight: 0 }}>
        {/* Left: Camera & Canvas */}
        <div style={{ flex: 2, position: 'relative', background: '#000', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #1e293b' }}>
          <video
            ref={videoRef}
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scaleX(-1)' }}
          />
          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', transform: 'scaleX(-1)', pointerEvents: 'none' }}
          />

          {!isCameraActive && (
            <div style={{ position: 'absolute', textAlign: 'center', color: '#64748b' }}>
              <p style={{ fontSize: '16px', margin: 0 }}>Нажмите «Включить камеру» для проверки детекции тела</p>
            </div>
          )}

          {isCameraActive && (
            <div style={{ position: 'absolute', bottom: '16px', left: '16px', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', padding: '8px 14px', borderRadius: '8px', border: '1px solid #334155', fontSize: '13px' }}>
              Точек обнаружено: <b>{landmarksCount} / 33</b> {landmarksCount === 33 ? '🟢' : '⚪'}
            </div>
          )}
        </div>

        {/* Right: Contract & Metrics Inspection */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Card: Live Metrics */}
          <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #1e293b' }}>
            <h2 style={{ fontSize: '15px', margin: '0 0 12px 0', color: '#f1f5f9' }}>📊 Живые показатели суставов</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: '#1e293b', padding: '10px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Угол колена (Левое)</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: currentKneeAngle && currentKneeAngle < 100 ? '#22c55e' : '#38bdf8' }}>
                  {currentKneeAngle !== null ? `${currentKneeAngle}°` : '—'}
                </div>
              </div>
              <div style={{ background: '#1e293b', padding: '10px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Целевая глубина</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e2e8f0' }}>≤ 90°</div>
              </div>
            </div>
          </div>

          {/* Card: Contract MotionResult Output */}
          <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #1e293b', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '15px', margin: '0 0 8px 0', color: '#f1f5f9' }}>
              📦 Выходной контракт <code style={{ color: '#38bdf8' }}>MotionResult</code>
            </h2>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 10px 0' }}>
              Именно этот объект передается в React UI для отображения фидбека:
            </p>
            <pre style={{ flex: 1, margin: 0, padding: '12px', background: '#020617', borderRadius: '8px', color: '#a5f3fc', fontSize: '12px', overflow: 'auto', border: '1px solid #1e293b' }}>
              {JSON.stringify(motionResult, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
