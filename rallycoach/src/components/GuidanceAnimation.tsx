'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { PoseLandmark } from '@/lib/types';

// Interface matching page.tsx expectations
export interface GuidanceKeyframe {
  name: string;
  description: string;
  landmarks: PoseLandmark[] | null;
  targetLandmarks?: PoseLandmark[] | null;
  correction?: string;
}

interface GuidanceAnimationProps {
  keyframes: GuidanceKeyframe[];
  primaryIssue?: {
    code: string;
    title: string;
    severity: string;
    description?: string;
  } | null;
  width?: number;
  height?: number;
}

// Skeleton connection pairs for drawing
const POSE_CONNECTIONS = [
  // Torso
  [11, 12], [11, 23], [12, 24], [23, 24],
  // Left arm
  [11, 13], [13, 15],
  // Right arm
  [12, 14], [14, 16],
  // Left leg
  [23, 25], [25, 27],
  // Right leg
  [24, 26], [26, 28],
  // Wrists to hands
  [15, 17], [15, 19], [15, 21],
  [16, 18], [16, 20], [16, 22],
];

// Colors for different states
const COLORS = {
  current: { stroke: '#EF4444', fill: '#FEE2E2', joint: '#DC2626' }, // Red for current form
  target: { stroke: '#22C55E', fill: '#DCFCE7', joint: '#16A34A' }, // Green for target form
  transition: { stroke: '#3B82F6', fill: '#DBEAFE', joint: '#2563EB' }, // Blue for transition
};

export default function GuidanceAnimation({
  keyframes,
  primaryIssue,
  width = 280,
  height = 220,
}: GuidanceAnimationProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [animationPhase, setAnimationPhase] = useState<'current' | 'target' | 'transition'>('current');
  const [interpolation, setInterpolation] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  // Auto-cycle through keyframes
  useEffect(() => {
    if (keyframes.length === 0) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % keyframes.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [keyframes.length]);

  // Animation loop for smooth interpolation
  useEffect(() => {
    if (keyframes.length === 0) return;

    const activeKeyframe = keyframes[activeIndex];
    const hasTarget = activeKeyframe?.targetLandmarks && activeKeyframe.landmarks;

    if (!hasTarget) {
      setAnimationPhase('current');
      setInterpolation(0);
      return;
    }

    let startTime: number | null = null;
    const duration = 2000; // 2 seconds per cycle

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = (elapsed % duration) / duration;

      // Ping-pong animation: 0 -> 1 -> 0
      const pingPong = progress < 0.5
        ? progress * 2
        : 2 - progress * 2;

      setInterpolation(pingPong);
      setAnimationPhase(pingPong < 0.3 ? 'current' : pingPong > 0.7 ? 'target' : 'transition');

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [keyframes, activeIndex]);

  // Draw skeleton on canvas
  const drawSkeleton = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      landmarks: PoseLandmark[],
      colors: typeof COLORS.current,
      alpha: number = 1
    ) => {
      if (!landmarks || landmarks.length === 0) return;

      const padding = 20;
      const drawWidth = width - padding * 2;
      const drawHeight = height - padding * 2;

      ctx.globalAlpha = alpha;

      // Draw connections
      ctx.strokeStyle = colors.stroke;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';

      POSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
        const start = landmarks[startIdx];
        const end = landmarks[endIdx];
        if (!start || !end) return;
        if ((start.visibility || 0) < 0.3 || (end.visibility || 0) < 0.3) return;

        ctx.beginPath();
        ctx.moveTo(
          padding + start.x * drawWidth,
          padding + start.y * drawHeight
        );
        ctx.lineTo(
          padding + end.x * drawWidth,
          padding + end.y * drawHeight
        );
        ctx.stroke();
      });

      // Draw joints
      landmarks.forEach((landmark, idx) => {
        if ((landmark.visibility || 0) < 0.3) return;

        const x = padding + landmark.x * drawWidth;
        const y = padding + landmark.y * drawHeight;

        // Key joints are larger
        const isKeyJoint = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].includes(idx);
        const radius = isKeyJoint ? 5 : 3;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = colors.joint;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      ctx.globalAlpha = 1;
    },
    [width, height]
  );

  // Interpolate between two landmark sets
  const interpolateLandmarks = useCallback(
    (from: PoseLandmark[], to: PoseLandmark[], t: number): PoseLandmark[] => {
      return from.map((landmark, idx) => {
        const target = to[idx];
        if (!target) return landmark;

        return {
          x: landmark.x + (target.x - landmark.x) * t,
          y: landmark.y + (target.y - landmark.y) * t,
          z: landmark.z + (target.z - landmark.z) * t,
          visibility: Math.max(landmark.visibility || 0, target.visibility || 0),
        };
      });
    },
    []
  );

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Background
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#F8FAFC');
    gradient.addColorStop(1, '#F1F5F9');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const activeKeyframe = keyframes[activeIndex];
    if (!activeKeyframe) return;

    const { landmarks, targetLandmarks } = activeKeyframe;

    if (landmarks && targetLandmarks) {
      // Draw interpolated skeleton
      const interpolated = interpolateLandmarks(
        landmarks,
        targetLandmarks,
        interpolation
      );

      // Ghost of current form (faded)
      if (animationPhase !== 'current') {
        drawSkeleton(ctx, landmarks, COLORS.current, 0.2);
      }

      // Ghost of target form (faded)
      if (animationPhase !== 'target') {
        drawSkeleton(ctx, targetLandmarks, COLORS.target, 0.2);
      }

      // Main interpolated skeleton
      const mainColors = animationPhase === 'current'
        ? COLORS.current
        : animationPhase === 'target'
          ? COLORS.target
          : COLORS.transition;

      drawSkeleton(ctx, interpolated, mainColors, 1);

      // Draw arrows showing correction direction at key joints
      if (animationPhase === 'transition') {
        ctx.strokeStyle = '#3B82F680';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);

        const keyJoints = [13, 14, 15, 16, 25, 26]; // Elbows, wrists, knees
        const padding = 20;
        const drawWidth = width - padding * 2;
        const drawHeight = height - padding * 2;

        keyJoints.forEach((idx) => {
          const from = landmarks[idx];
          const to = targetLandmarks[idx];
          if (!from || !to) return;
          if ((from.visibility || 0) < 0.5) return;

          const startX = padding + from.x * drawWidth;
          const startY = padding + from.y * drawHeight;
          const endX = padding + to.x * drawWidth;
          const endY = padding + to.y * drawHeight;

          // Only draw if there's significant movement
          const dist = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
          if (dist < 5) return;

          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();

          // Arrowhead
          const angle = Math.atan2(endY - startY, endX - startX);
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - 8 * Math.cos(angle - Math.PI / 6),
            endY - 8 * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - 8 * Math.cos(angle + Math.PI / 6),
            endY - 8 * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
        });

        ctx.setLineDash([]);
      }
    } else if (landmarks) {
      // Only current landmarks, draw static
      drawSkeleton(ctx, landmarks, COLORS.current, 1);
    } else {
      // No landmarks, draw placeholder
      drawPlaceholder(ctx, width, height);
    }
  }, [keyframes, activeIndex, interpolation, animationPhase, width, height, drawSkeleton, interpolateLandmarks]);

  // Draw placeholder skeleton when no landmarks
  const drawPlaceholder = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const centerX = w / 2;
    const baseY = h * 0.2;

    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    // Head
    ctx.beginPath();
    ctx.arc(centerX, baseY, 12, 0, Math.PI * 2);
    ctx.stroke();

    // Spine
    ctx.beginPath();
    ctx.moveTo(centerX, baseY + 12);
    ctx.lineTo(centerX, baseY + 55);
    ctx.stroke();

    // Shoulders
    ctx.beginPath();
    ctx.moveTo(centerX - 25, baseY + 20);
    ctx.lineTo(centerX + 25, baseY + 20);
    ctx.stroke();

    // Arms
    ctx.beginPath();
    ctx.moveTo(centerX - 25, baseY + 20);
    ctx.lineTo(centerX - 40, baseY + 45);
    ctx.lineTo(centerX - 35, baseY + 70);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX + 25, baseY + 20);
    ctx.lineTo(centerX + 40, baseY + 45);
    ctx.lineTo(centerX + 35, baseY + 70);
    ctx.stroke();

    // Hips
    ctx.beginPath();
    ctx.moveTo(centerX - 15, baseY + 55);
    ctx.lineTo(centerX + 15, baseY + 55);
    ctx.stroke();

    // Legs
    ctx.beginPath();
    ctx.moveTo(centerX - 15, baseY + 55);
    ctx.lineTo(centerX - 20, baseY + 90);
    ctx.lineTo(centerX - 20, baseY + 120);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX + 15, baseY + 55);
    ctx.lineTo(centerX + 20, baseY + 90);
    ctx.lineTo(centerX + 20, baseY + 120);
    ctx.stroke();

    // Text
    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Analyzing form...', centerX, h - 15);
  };

  if (keyframes.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-slate-100 rounded-xl"
        style={{ width, height: height + 80 }}
      >
        <div className="text-slate-400 text-sm">No guidance available</div>
        <div className="text-slate-300 text-xs mt-1">Complete analysis first</div>
      </div>
    );
  }

  const activeKeyframe = keyframes[activeIndex];

  return (
    <div className="flex flex-col gap-3" style={{ width }}>
      {/* Issue header */}
      {primaryIssue && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-medium text-red-800 truncate">
            {primaryIssue.title}
          </span>
        </div>
      )}

      {/* Canvas with animation */}
      <div
        className="relative rounded-xl overflow-hidden border border-slate-200"
        style={{ width, height }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full h-full"
        />

        {/* Legend overlay */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-white/90 rounded text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: COLORS.current.joint }}
            />
            <span className="text-slate-600">Current</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-white/90 rounded text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: COLORS.target.joint }}
            />
            <span className="text-slate-600">Target</span>
          </div>
        </div>

        {/* Phase indicator */}
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-white/90 rounded text-xs font-medium">
          {activeKeyframe?.name || 'Form Analysis'}
        </div>
      </div>

      {/* Correction text */}
      {activeKeyframe?.correction && (
        <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 font-medium flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {activeKeyframe.correction}
          </p>
        </div>
      )}

      {/* Keyframe selector */}
      {keyframes.length > 1 && (
        <div className="flex justify-center gap-2">
          {keyframes.map((kf, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                activeIndex === index
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {kf.name}
            </button>
          ))}
        </div>
      )}

      {/* Description */}
      {activeKeyframe?.description && (
        <p className="text-xs text-slate-500 text-center px-2">
          {activeKeyframe.description}
        </p>
      )}
    </div>
  );
}
