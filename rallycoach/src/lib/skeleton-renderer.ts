/**
 * Enhanced Skeleton Renderer
 *
 * Provides beautiful, athletic-styled skeleton visualizations with:
 * 1. Glowing ghost overlay with cyan color
 * 2. Motion path trajectories with color gradients
 * 3. Animated correction visualizations
 * 4. Professional sports analytics aesthetic
 */

import type { PoseLandmark } from './types';
import { POSE_CONNECTIONS, POSE_LANDMARKS } from './pose-utils';

// ============================================
// Color Palette - "Neon Athletic" Theme
// ============================================

export const SKELETON_COLORS = {
  // User skeleton colors based on form quality
  user: {
    excellent: '#22c55e', // Green
    good: '#eab308', // Yellow
    needsWork: '#f97316', // Orange
    poor: '#ef4444', // Red
  },
  // Ghost skeleton - electric cyan with glow
  ghost: {
    primary: '#00d4ff',
    glow: 'rgba(0, 212, 255, 0.4)',
    glowOuter: 'rgba(0, 212, 255, 0.15)',
  },
  // Motion trail colors
  trail: {
    start: '#ef4444', // Red (slow/bad)
    mid: '#f97316', // Orange
    end: '#22c55e', // Green (fast/good)
  },
  // Correction animation
  correction: {
    wrong: '#ef4444',
    right: '#22c55e',
    arrow: '#3b82f6',
  },
};

// ============================================
// Glow Effect Utilities
// ============================================

/**
 * Draw a glowing line between two points
 */
function drawGlowingLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  glowColor: string,
  lineWidth: number = 3
) {
  // Outer glow
  ctx.save();
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 15;
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = lineWidth + 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Inner glow
  ctx.shadowBlur = 8;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

/**
 * Draw a glowing joint point
 */
function drawGlowingJoint(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  glowColor: string
) {
  ctx.save();

  // Outer glow
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 12;
  ctx.fillStyle = glowColor;
  ctx.beginPath();
  ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
  ctx.fill();

  // Inner bright point
  ctx.shadowBlur = 6;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Center highlight
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ============================================
// User Skeleton Rendering
// ============================================

export interface RenderOptions {
  offsetX: number;
  offsetY: number;
  renderWidth: number;
  renderHeight: number;
}

/**
 * Draw the user's skeleton with form-based coloring
 */
export function drawUserSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: PoseLandmark[],
  formQuality: 'excellent' | 'good' | 'needsWork' | 'poor',
  options: RenderOptions
) {
  const { offsetX, offsetY, renderWidth, renderHeight } = options;
  const color = SKELETON_COLORS.user[formQuality];

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Draw connections
  for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
    const start = landmarks[startIdx];
    const end = landmarks[endIdx];
    if (start && end && start.visibility > 0.5 && end.visibility > 0.5) {
      ctx.beginPath();
      ctx.moveTo(offsetX + start.x * renderWidth, offsetY + start.y * renderHeight);
      ctx.lineTo(offsetX + end.x * renderWidth, offsetY + end.y * renderHeight);
      ctx.stroke();
    }
  }

  // Draw joints
  for (let i = 0; i < landmarks.length; i++) {
    const landmark = landmarks[i];
    if (landmark.visibility > 0.5) {
      const isKeyJoint = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].includes(i);
      const radius = isKeyJoint ? 5 : 3;

      ctx.beginPath();
      ctx.arc(
        offsetX + landmark.x * renderWidth,
        offsetY + landmark.y * renderHeight,
        radius,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }

  ctx.restore();
}

// ============================================
// Ghost Skeleton Rendering (Glowing Cyan)
// ============================================

/**
 * Draw the ghost "Best Rep" skeleton with beautiful glow effects
 */
export function drawGhostSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: PoseLandmark[],
  options: RenderOptions,
  pulsePhase: number = 0 // 0-1 for pulsing animation
) {
  const { offsetX, offsetY, renderWidth, renderHeight } = options;
  const { primary, glow, glowOuter } = SKELETON_COLORS.ghost;

  // Pulsing opacity for subtle animation
  const pulseOpacity = 0.7 + Math.sin(pulsePhase * Math.PI * 2) * 0.2;

  ctx.save();
  ctx.globalAlpha = pulseOpacity;

  // Draw outer glow halo around the entire skeleton
  ctx.shadowColor = glowOuter;
  ctx.shadowBlur = 25;

  // Draw connections with glow
  for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
    const start = landmarks[startIdx];
    const end = landmarks[endIdx];
    if (start && end && (start.visibility ?? 0) > 0.4 && (end.visibility ?? 0) > 0.4) {
      const x1 = offsetX + start.x * renderWidth;
      const y1 = offsetY + start.y * renderHeight;
      const x2 = offsetX + end.x * renderWidth;
      const y2 = offsetY + end.y * renderHeight;

      drawGlowingLine(ctx, x1, y1, x2, y2, primary, glow, 2.5);
    }
  }

  // Draw joints with glow
  for (let i = 0; i < landmarks.length; i++) {
    const landmark = landmarks[i];
    if ((landmark.visibility ?? 0) > 0.4) {
      const isKeyJoint = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].includes(i);
      const radius = isKeyJoint ? 4 : 2.5;

      drawGlowingJoint(
        ctx,
        offsetX + landmark.x * renderWidth,
        offsetY + landmark.y * renderHeight,
        radius,
        primary,
        glow
      );
    }
  }

  ctx.restore();
}

// ============================================
// Motion Path / Trajectory Visualization
// ============================================

export interface MotionPoint {
  x: number;
  y: number;
  timestamp: number;
  quality: number; // 0-1, used for color gradient
}

/**
 * Draw a motion path with color gradient (red -> orange -> green)
 */
export function drawMotionPath(
  ctx: CanvasRenderingContext2D,
  points: MotionPoint[],
  options: RenderOptions,
  jointName: string = ''
) {
  if (points.length < 2) return;

  const { offsetX, offsetY, renderWidth, renderHeight } = options;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Draw the path with gradient coloring based on quality
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    const x1 = offsetX + prev.x * renderWidth;
    const y1 = offsetY + prev.y * renderHeight;
    const x2 = offsetX + curr.x * renderWidth;
    const y2 = offsetY + curr.y * renderHeight;

    // Create gradient for this segment
    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    const startColor = getQualityColor(prev.quality);
    const endColor = getQualityColor(curr.quality);
    gradient.addColorStop(0, startColor);
    gradient.addColorStop(1, endColor);

    // Draw glowing line segment
    ctx.shadowColor = endColor;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Draw points along the path
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const x = offsetX + point.x * renderWidth;
    const y = offsetY + point.y * renderHeight;
    const color = getQualityColor(point.quality);

    // Vary size based on position in path (smaller = older)
    const ageRatio = i / points.length;
    const radius = 2 + ageRatio * 3;

    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw arrow at the end showing direction
  if (points.length >= 2) {
    const last = points[points.length - 1];
    const prev = points[points.length - 2];
    const x = offsetX + last.x * renderWidth;
    const y = offsetY + last.y * renderHeight;
    const angle = Math.atan2(
      (last.y - prev.y) * renderHeight,
      (last.x - prev.x) * renderWidth
    );

    drawArrowhead(ctx, x, y, angle, 10, getQualityColor(last.quality));
  }

  ctx.restore();
}

/**
 * Get color based on quality score (0-1)
 */
function getQualityColor(quality: number): string {
  const { start, mid, end } = SKELETON_COLORS.trail;

  if (quality < 0.5) {
    // Interpolate from red to orange
    const t = quality * 2;
    return interpolateColor(start, mid, t);
  } else {
    // Interpolate from orange to green
    const t = (quality - 0.5) * 2;
    return interpolateColor(mid, end, t);
  }
}

/**
 * Simple color interpolation
 */
function interpolateColor(color1: string, color2: string, t: number): string {
  // Parse hex colors
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);
  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Draw an arrowhead
 */
function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  size: number,
  color: string
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-size, -size / 2);
  ctx.lineTo(-size, size / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ============================================
// Correction Animation Helpers
// ============================================

/**
 * TASK 3: Draw skeleton transitioning from wrong to correct form
 * ENHANCED with dramatic visual feedback
 */
export function drawCorrectionSkeleton(
  ctx: CanvasRenderingContext2D,
  wrongLandmarks: PoseLandmark[],
  correctLandmarks: PoseLandmark[],
  interpolation: number, // 0 = wrong, 1 = correct
  affectedJoints: number[],
  options: RenderOptions
) {
  const { offsetX, offsetY, renderWidth, renderHeight } = options;
  const { wrong, right, arrow } = SKELETON_COLORS.correction;

  // Interpolate between wrong and correct poses with easing
  const easedInterpolation = 0.5 - Math.cos(interpolation * Math.PI) / 2;

  const currentLandmarks = wrongLandmarks.map((wl, i) => {
    const cl = correctLandmarks[i];
    if (!wl || !cl) return wl;
    return {
      x: wl.x + (cl.x - wl.x) * easedInterpolation,
      y: wl.y + (cl.y - wl.y) * easedInterpolation,
      z: wl.z + (cl.z - wl.z) * easedInterpolation,
      visibility: Math.max(wl.visibility, cl.visibility),
    };
  });

  // Current color based on interpolation
  const currentColor = interpolateColor(wrong, right, easedInterpolation);

  ctx.save();

  // TASK 3: Draw semi-transparent "wrong" ghost that fades as we transition
  const wrongAlpha = Math.max(0, 1 - easedInterpolation * 1.5) * 0.5;
  if (wrongAlpha > 0.05) {
    ctx.globalAlpha = wrongAlpha;
    ctx.strokeStyle = wrong;
    ctx.lineWidth = 4;
    ctx.setLineDash([6, 4]);
    ctx.shadowColor = wrong;
    ctx.shadowBlur = 8;

    for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
      const start = wrongLandmarks[startIdx];
      const end = wrongLandmarks[endIdx];
      if (start && end && start.visibility > 0.3 && end.visibility > 0.3) {
        ctx.beginPath();
        ctx.moveTo(offsetX + start.x * renderWidth, offsetY + start.y * renderHeight);
        ctx.lineTo(offsetX + end.x * renderWidth, offsetY + end.y * renderHeight);
        ctx.stroke();
      }
    }

    // Draw "WRONG" label on wrong skeleton
    ctx.shadowBlur = 0;
    ctx.setLineDash([]);
    ctx.fillStyle = wrong;
    ctx.font = 'bold 10px system-ui';
    ctx.textAlign = 'center';
    const centerWrongX = offsetX + wrongLandmarks[POSE_LANDMARKS.RIGHT_SHOULDER]?.x * renderWidth || offsetX + renderWidth / 2;
    const centerWrongY = offsetY + (wrongLandmarks[POSE_LANDMARKS.RIGHT_SHOULDER]?.y || 0.3) * renderHeight - 15;
    ctx.fillText('✗ CURRENT', centerWrongX, centerWrongY);

    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  // TASK 3: Draw semi-transparent "correct" ghost that appears as we transition
  const correctAlpha = Math.max(0, easedInterpolation - 0.2) * 0.4;
  if (correctAlpha > 0.05 && easedInterpolation < 0.95) {
    ctx.globalAlpha = correctAlpha;
    ctx.strokeStyle = right;
    ctx.lineWidth = 4;
    ctx.setLineDash([6, 4]);
    ctx.shadowColor = right;
    ctx.shadowBlur = 12;

    for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
      const start = correctLandmarks[startIdx];
      const end = correctLandmarks[endIdx];
      if (start && end && start.visibility > 0.3 && end.visibility > 0.3) {
        ctx.beginPath();
        ctx.moveTo(offsetX + start.x * renderWidth, offsetY + start.y * renderHeight);
        ctx.lineTo(offsetX + end.x * renderWidth, offsetY + end.y * renderHeight);
        ctx.stroke();
      }
    }

    // Draw "TARGET" label on correct skeleton
    ctx.shadowBlur = 0;
    ctx.setLineDash([]);
    ctx.fillStyle = right;
    ctx.font = 'bold 10px system-ui';
    ctx.textAlign = 'center';
    const centerCorrectX = offsetX + correctLandmarks[POSE_LANDMARKS.RIGHT_SHOULDER]?.x * renderWidth || offsetX + renderWidth / 2;
    const centerCorrectY = offsetY + (correctLandmarks[POSE_LANDMARKS.RIGHT_SHOULDER]?.y || 0.3) * renderHeight - 15;
    ctx.fillText('✓ TARGET', centerCorrectX, centerCorrectY);

    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  // Draw main interpolated skeleton with glow
  ctx.shadowColor = currentColor;
  ctx.shadowBlur = 6;
  ctx.strokeStyle = currentColor;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';

  for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
    const start = currentLandmarks[startIdx];
    const end = currentLandmarks[endIdx];
    if (start && end && start.visibility > 0.3 && end.visibility > 0.3) {
      ctx.beginPath();
      ctx.moveTo(offsetX + start.x * renderWidth, offsetY + start.y * renderHeight);
      ctx.lineTo(offsetX + end.x * renderWidth, offsetY + end.y * renderHeight);
      ctx.stroke();
    }
  }

  ctx.shadowBlur = 0;

  // TASK 3: Draw joints with DRAMATIC highlighting for affected ones
  for (let i = 0; i < currentLandmarks.length; i++) {
    const landmark = currentLandmarks[i];
    if (!landmark || landmark.visibility < 0.3) continue;

    const isAffected = affectedJoints.includes(i);
    const x = offsetX + landmark.x * renderWidth;
    const y = offsetY + landmark.y * renderHeight;

    if (isAffected) {
      // TASK 3: DRAMATIC pulsing highlight for affected joints
      const time = Date.now() / 200;
      const pulseSize = 10 + Math.sin(time) * 5; // Larger pulse (was 6 + 3)

      // Outer glow ring
      ctx.shadowColor = arrow;
      ctx.shadowBlur = 20;
      ctx.strokeStyle = arrow;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, pulseSize + 4, 0, Math.PI * 2);
      ctx.stroke();

      // Filled center with glow
      ctx.shadowBlur = 15;
      ctx.fillStyle = arrow;
      ctx.beginPath();
      ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // White highlight center
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = currentColor;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // TASK 3: Draw ANIMATED correction arrows for affected joints
  // Arrows are visible throughout the animation, pulsing
  const arrowPhase = (Date.now() / 500) % 1; // 0.5 second cycle
  const arrowAlpha = 0.4 + Math.sin(arrowPhase * Math.PI * 2) * 0.4;

  ctx.globalAlpha = arrowAlpha;
  ctx.strokeStyle = arrow;
  ctx.lineWidth = 3;

  for (const jointIdx of affectedJoints) {
    const wrongPos = wrongLandmarks[jointIdx];
    const correctPos = correctLandmarks[jointIdx];
    if (!wrongPos || !correctPos) continue;
    if (wrongPos.visibility < 0.3 || correctPos.visibility < 0.3) continue;

    const x1 = offsetX + wrongPos.x * renderWidth;
    const y1 = offsetY + wrongPos.y * renderHeight;
    const x2 = offsetX + correctPos.x * renderWidth;
    const y2 = offsetY + correctPos.y * renderHeight;

    // Only draw if there's significant movement
    const dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    if (dist > 8) {
      // TASK 3: Draw curved arrow path
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      // Perpendicular offset for curve
      const perpX = -(y2 - y1) * 0.2;
      const perpY = (x2 - x1) * 0.2;
      const ctrlX = midX + perpX;
      const ctrlY = midY + perpY;

      ctx.shadowColor = arrow;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(ctrlX, ctrlY, x2, y2);
      ctx.stroke();

      // Draw arrowhead at current interpolated position along the path
      const t = 0.7 + arrowPhase * 0.3; // Arrow moves along path
      const arrowX = (1-t)*(1-t)*x1 + 2*(1-t)*t*ctrlX + t*t*x2;
      const arrowY = (1-t)*(1-t)*y1 + 2*(1-t)*t*ctrlY + t*t*y2;

      // Calculate tangent angle at this point
      const dx = 2*(1-t)*(ctrlX-x1) + 2*t*(x2-ctrlX);
      const dy = 2*(1-t)*(ctrlY-y1) + 2*t*(y2-ctrlY);
      const angle = Math.atan2(dy, dx);

      ctx.shadowBlur = 0;
      drawArrowhead(ctx, arrowX, arrowY, angle, 12, arrow);
    }
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

// ============================================
// Subject Selection Indicator
// ============================================

/**
 * Draw a selection ring around a skeleton to indicate it's the locked subject
 */
export function drawSelectionIndicator(
  ctx: CanvasRenderingContext2D,
  landmarks: PoseLandmark[],
  options: RenderOptions,
  isSelected: boolean,
  isSelectionMode: boolean
) {
  const { offsetX, offsetY, renderWidth, renderHeight } = options;

  // Calculate bounding box
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  const keyIndices = [11, 12, 23, 24, 25, 26, 27, 28]; // Shoulders, hips, knees, ankles

  for (const idx of keyIndices) {
    const lm = landmarks[idx];
    if (lm && (lm.visibility ?? 0) > 0.3) {
      minX = Math.min(minX, lm.x);
      minY = Math.min(minY, lm.y);
      maxX = Math.max(maxX, lm.x);
      maxY = Math.max(maxY, lm.y);
    }
  }

  if (maxX <= minX || maxY <= minY) return;

  // Add padding
  const padding = 0.03;
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(1, maxX + padding);
  maxY = Math.min(1, maxY + padding);

  const x = offsetX + minX * renderWidth;
  const y = offsetY + minY * renderHeight;
  const w = (maxX - minX) * renderWidth;
  const h = (maxY - minY) * renderHeight;

  ctx.save();

  if (isSelected) {
    // Draw selected indicator - bright cyan ring with glow
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 15;
    ctx.setLineDash([8, 4]);

    // Animated dash offset
    const time = Date.now() / 100;
    ctx.lineDashOffset = time % 24;

    // Draw rounded rectangle
    const radius = 8;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.stroke();

    // Draw "LOCKED" label
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#00d4ff';
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('✓ LOCKED', x + w / 2, y - 6);
  } else if (isSelectionMode) {
    // Draw hover indicator - subtle outline to show clickable
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);

    const radius = 6;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.stroke();

    // Draw "CLICK TO SELECT" hint
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Click to select', x + w / 2, y - 4);
  }

  ctx.restore();
}

// ============================================
// Trajectory Extraction from Pose History
// ============================================

/**
 * Extract motion trajectory for a specific joint from pose history
 */
export function extractJointTrajectory(
  poseHistory: (PoseLandmark[] | null)[],
  jointIndex: number,
  startFrame: number,
  endFrame: number,
  metricsHistory?: any[]
): MotionPoint[] {
  const points: MotionPoint[] = [];

  for (let i = startFrame; i <= endFrame && i < poseHistory.length; i++) {
    const pose = poseHistory[i];
    if (!pose) continue;

    const landmark = pose[jointIndex];
    if (!landmark || (landmark.visibility ?? 0) < 0.4) continue;

    // Calculate quality based on visibility and metrics if available
    let quality = landmark.visibility ?? 0.5;
    if (metricsHistory && metricsHistory[i]) {
      // Could factor in form quality here
      quality = Math.min(1, quality * 1.2);
    }

    points.push({
      x: landmark.x,
      y: landmark.y,
      timestamp: i / 10, // Assuming 10fps
      quality,
    });
  }

  return points;
}

/**
 * Extract racket hand trajectory (right wrist) with velocity-based coloring
 */
export function extractRacketTrajectory(
  poseHistory: (PoseLandmark[] | null)[],
  startFrame: number,
  endFrame: number
): MotionPoint[] {
  const rawPoints = extractJointTrajectory(
    poseHistory,
    POSE_LANDMARKS.RIGHT_WRIST,
    startFrame,
    endFrame
  );

  // Calculate velocity for each point and use it for quality coloring
  for (let i = 1; i < rawPoints.length; i++) {
    const prev = rawPoints[i - 1];
    const curr = rawPoints[i];
    const dt = curr.timestamp - prev.timestamp;
    if (dt > 0) {
      const velocity = Math.sqrt(
        Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
      ) / dt;
      // Normalize velocity to 0-1 (assuming max velocity ~2.0)
      curr.quality = Math.min(1, velocity / 2.0);
    }
  }

  return rawPoints;
}
