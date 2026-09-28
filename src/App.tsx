// src/App.tsx
import React, { useRef, useState } from 'react';
import { useMotionEngine, ExerciseType } from './engine';

export default function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [currentExercise, setCurrentExercise] = useState<ExerciseType>('squat');
  const [voiceOn, setVoiceOn] = useState(true);

  // Подключение единого хука Motion Engine
  const {
    isReady,
    isRunning,
    fps,
    result,
    initError,
    start,
    stop,
    setExercise,
    resetStats,
    setVoiceEnabled
  } = useMotionEngine({
    videoRef,
    canvasRef,
    initialExercise: currentExercise,
    enableVoice: voiceOn,
    enableOverlay: true
  });

  const handleSelectExercise = (ex: ExerciseType) => {
    setCurrentExercise(ex);
    setExercise(ex);
  };

  const handleToggleVoice = () => {
    const next = !voiceOn;
    setVoiceOn(next);
    setVoiceEnabled(next);
  };

  const getStateBadgeColor = () => {
    switch (result.state) {
      case 'rep_success': return { bg: '#22c55e22', text: '#22c55e', border: '#22c55e55', label: '✓ ПОВТОР ЗАСЧИТАН' };
      case 'rep_error': return { bg: '#ef444422', text: '#ef4444', border: '#ef444455', label: '⚠️ ОШИБКА ФОРМЫ' };
      case 'moving': return { bg: '#3b82f622', text: '#3b82f6', border: '#3b82f655', label: '● ДВИЖЕНИЕ' };
      case 'ready': return { bg: '#eab30822', text: '#eab308', border: '#eab30855', label: '○ ГОТОВ' };
      default: return { bg: '#64748b22', text: '#94a3b8', border: '#47556955', label: 'ОЖИДАНИЕ' };
    }
  };

  const badge = getStateBadgeColor();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '16px', boxSizing: 'border-box', backgroundColor: '#090d16', color: '#e2e8f0', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Верхняя панель */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '12px', marginBottom: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', color: '#38bdf8' }}>Mirror — Motion Engine Integration Workbench</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
            Тест единой точки входа: <code>useMotionEngine()</code> → <code>MotionResult</code>
          </p>
        </div>

        {/* Статусы и кнопки */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {initError ? (
            <span style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '12px', backgroundColor: '#ef444422', color: '#ef4444', border: '1px solid #ef444455' }}>
              ⚠️ {initError}
            </span>
          ) : (
            <span style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '12px', backgroundColor: isReady ? '#22c55e22' : '#eab30822', color: isReady ? '#22c55e' : '#eab308', border: `1px solid ${isReady ? '#22c55e44' : '#eab30844'}` }}>
              {isReady ? '✓ Engine готов' : '⏳ Инициализация...'}
            </span>
          )}

          <span style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '12px', backgroundColor: isRunning ? '#3b82f622' : '#64748b22', color: isRunning ? '#3b82f6' : '#94a3b8', border: '1px solid #334155' }}>
            {isRunning ? `FPS: ${fps}` : 'Камера OFF'}
          </span>

          <button
            onClick={handleToggleVoice}
            style={{ background: voiceOn ? '#1e293b' : '#334155', color: voiceOn ? '#38bdf8' : '#94a3b8', border: '1px solid #334155', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
            title="Озвучка ошибок голосом (Web Speech API)"
          >
            {voiceOn ? '🔊 Голос ON' : '🔇 Голос OFF'}
          </button>

          {isRunning ? (
            <button onClick={stop} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
              Остановить камеру
            </button>
          ) : (
            <button
              onClick={() => start().catch(alert)}
              disabled={!isReady}
              style={{ background: !isReady ? '#475569' : '#0284c7', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: !isReady ? 'not-allowed' : 'pointer', fontWeight: 600 }}
            >
              Включить камеру
            </button>
          )}
        </div>
      </header>

      {/* Переключатель упражнений */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: '#94a3b8', marginRight: '4px' }}>Упражнение:</span>
        {(['squat', 'lunge', 'jumping_jack'] as ExerciseType[]).map((ex) => (
          <button
            key={ex}
            onClick={() => handleSelectExercise(ex)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: currentExercise === ex ? '2px solid #38bdf8' : '1px solid #334155',
              background: currentExercise === ex ? '#0369a1' : '#1e293b',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: currentExercise === ex ? 600 : 400,
              fontSize: '13px'
            }}
          >
            {ex === 'squat' && '🏋️ Приседания (Squats)'}
            {ex === 'lunge' && '🏃 Выпады (Lunges)'}
            {ex === 'jumping_jack' && '⭐ Джампинг Джеки'}
          </button>
        ))}

        <button
          onClick={resetStats}
          style={{ marginLeft: 'auto', background: '#334155', color: '#cbd5e1', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
        >
          Сбросить счетчики
        </button>
      </div>

      {/* Основная рабочая область */}
      <div style={{ display: 'flex', flex: 1, gap: '16px', minHeight: 0 }}>
        {/* Левая колонка: Камера + Скелет + HUD Ошибок */}
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

          {!isRunning && (
            <div style={{ position: 'absolute', textAlign: 'center', color: '#64748b' }}>
              <p style={{ fontSize: '16px', margin: '0 0 6px 0' }}>Камера не запущена</p>
              <p style={{ fontSize: '13px', margin: 0, color: '#475569' }}>Нажмите «Включить камеру» в правом верхнем углу</p>
            </div>
          )}

          {/* Плашка ошибки (Error Mode HUD) */}
          {isRunning && result.error && (
            <div style={{ position: 'absolute', top: '16px', left: '16px', right: '16px', background: 'rgba(239, 68, 68, 0.9)', backdropFilter: 'blur(8px)', color: '#fff', padding: '12px 18px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.5)', zIndex: 10 }}>
              <span style={{ fontSize: '20px' }}>⚠️</span>
              <div>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, fontWeight: 700 }}>Ошибка техники:</div>
                <div style={{ fontSize: '15px', fontWeight: 600 }}>{result.error}</div>
              </div>
            </div>
          )}

          {/* Текущий статус внизу экрана камеры */}
          {isRunning && (
            <div style={{ position: 'absolute', bottom: '16px', left: '16px', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', padding: '10px 16px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '6px', background: badge.bg, color: badge.text, border: `1px solid ${badge.border}`, fontWeight: 700 }}>
                {badge.label}
              </span>
              <span style={{ fontSize: '13px', color: '#f1f5f9' }}>{result.feedback}</span>
            </div>
          )}
        </div>

        {/* Правая колонка: Счетчики, Метрики и Контракт */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
          {/* Счетчики повторений */}
          <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #1e293b' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Всего повторов</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#f8fafc' }}>{result.repCount}</div>
              </div>
              <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#22c55e' }}>Идеальные</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#22c55e' }}>{result.perfectReps}</div>
              </div>
              <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#ef4444' }}>С ошибками</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#ef4444' }}>{result.totalErrors}</div>
              </div>
            </div>

            {/* Прогресс-бар глубины */}
            {result.metrics?.progress !== undefined && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', color: '#94a3b8' }}>
                  <span>Глубина / Раскрытие</span>
                  <span>{result.metrics.progress}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${result.metrics.progress}%`, height: '100%', background: result.isCorrect ? '#22c55e' : '#ef4444', transition: 'width 0.1s ease' }} />
                </div>
              </div>
            )}
          </div>

          {/* Живой MotionResult контракт для фронтендера */}
          <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #1e293b', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <h2 style={{ fontSize: '14px', margin: '0 0 6px 0', color: '#f1f5f9' }}>
              📦 Реальный <code>MotionResult</code> (для UI)
            </h2>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 8px 0' }}>
              Этот объект генерируется движком на каждом кадре:
            </p>
            <pre style={{ flex: 1, margin: 0, padding: '10px', background: '#020617', borderRadius: '8px', color: '#a5f3fc', fontSize: '11px', overflow: 'auto', border: '1px solid #1e293b' }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
