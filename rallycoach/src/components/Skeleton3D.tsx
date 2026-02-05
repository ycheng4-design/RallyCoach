'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ============================================
// 3D Skeleton Animation Component
// ============================================

// 3D landmark positions for different drill phases
interface Landmark3D {
  x: number;
  y: number;
  z: number;
}

interface PhaseKeyframes {
  name: string;
  landmarks: Landmark3D[];
}

// Bone connection indices
const BONE_CONNECTIONS = [
  // Head
  [0, 1], // nose to neck
  // Torso
  [1, 2], [1, 3], // neck to shoulders
  [2, 3], // shoulder to shoulder
  [2, 4], [3, 5], // shoulders to hips
  [4, 5], // hip to hip
  // Left arm
  [2, 6], [6, 8], [8, 10], // shoulder -> elbow -> wrist -> fingers
  // Right arm
  [3, 7], [7, 9], [9, 11], // shoulder -> elbow -> wrist -> fingers
  // Left leg
  [4, 12], [12, 14], [14, 16], // hip -> knee -> ankle -> toe
  // Right leg
  [5, 13], [13, 15], [15, 17], // hip -> knee -> ankle -> toe
];

// Landmark indices
const LANDMARK_NAMES = [
  'nose', 'neck',
  'left_shoulder', 'right_shoulder',
  'left_hip', 'right_hip',
  'left_elbow', 'right_elbow',
  'left_wrist', 'right_wrist',
  'left_fingers', 'right_fingers',
  'left_knee', 'right_knee',
  'left_ankle', 'right_ankle',
  'left_toe', 'right_toe',
];

// Default drill keyframe data
const DRILL_KEYFRAMES: Record<string, PhaseKeyframes[]> = {
  smash: [
    {
      name: 'Setup',
      landmarks: [
        { x: 0, y: 1.7, z: 0 }, // nose
        { x: 0, y: 1.5, z: 0 }, // neck
        { x: -0.2, y: 1.4, z: 0 }, // left_shoulder
        { x: 0.2, y: 1.4, z: 0 }, // right_shoulder
        { x: -0.15, y: 1.0, z: 0 }, // left_hip
        { x: 0.15, y: 1.0, z: 0 }, // right_hip
        { x: -0.3, y: 1.2, z: 0.1 }, // left_elbow
        { x: 0.4, y: 1.6, z: -0.2 }, // right_elbow (raised)
        { x: -0.35, y: 1.0, z: 0.1 }, // left_wrist
        { x: 0.5, y: 1.8, z: -0.3 }, // right_wrist (racket back)
        { x: -0.4, y: 0.9, z: 0.1 }, // left_fingers
        { x: 0.55, y: 1.9, z: -0.35 }, // right_fingers (racket)
        { x: -0.15, y: 0.5, z: 0.05 }, // left_knee
        { x: 0.2, y: 0.5, z: -0.05 }, // right_knee
        { x: -0.15, y: 0.05, z: 0.1 }, // left_ankle
        { x: 0.25, y: 0.05, z: -0.1 }, // right_ankle
        { x: -0.2, y: 0, z: 0.15 }, // left_toe
        { x: 0.3, y: 0, z: -0.15 }, // right_toe
      ],
    },
    {
      name: 'Load',
      landmarks: [
        { x: 0, y: 1.65, z: 0.1 }, // nose (leaning back)
        { x: 0, y: 1.45, z: 0.1 }, // neck
        { x: -0.25, y: 1.35, z: 0.1 }, // left_shoulder (rotated)
        { x: 0.25, y: 1.45, z: 0 }, // right_shoulder
        { x: -0.15, y: 0.95, z: 0.05 }, // left_hip
        { x: 0.15, y: 1.0, z: -0.05 }, // right_hip
        { x: -0.35, y: 1.15, z: 0.15 }, // left_elbow
        { x: 0.35, y: 1.75, z: -0.35 }, // right_elbow (cocked)
        { x: -0.4, y: 0.95, z: 0.15 }, // left_wrist
        { x: 0.3, y: 1.9, z: -0.45 }, // right_wrist (max backswing)
        { x: -0.45, y: 0.85, z: 0.15 }, // left_fingers
        { x: 0.25, y: 2.0, z: -0.5 }, // right_fingers (racket back)
        { x: -0.2, y: 0.45, z: 0.1 }, // left_knee (bent)
        { x: 0.25, y: 0.55, z: -0.1 }, // right_knee
        { x: -0.2, y: 0.05, z: 0.15 }, // left_ankle
        { x: 0.3, y: 0.05, z: -0.15 }, // right_ankle
        { x: -0.25, y: 0, z: 0.2 }, // left_toe
        { x: 0.35, y: 0, z: -0.2 }, // right_toe
      ],
    },
    {
      name: 'Strike',
      landmarks: [
        { x: 0.05, y: 1.7, z: -0.1 }, // nose (forward)
        { x: 0.05, y: 1.5, z: -0.05 }, // neck
        { x: -0.15, y: 1.4, z: -0.1 }, // left_shoulder (rotated forward)
        { x: 0.25, y: 1.4, z: 0.1 }, // right_shoulder
        { x: -0.1, y: 1.0, z: -0.05 }, // left_hip
        { x: 0.15, y: 1.0, z: 0.05 }, // right_hip
        { x: -0.25, y: 1.2, z: -0.05 }, // left_elbow
        { x: 0.5, y: 1.6, z: 0.2 }, // right_elbow (extended)
        { x: -0.3, y: 1.0, z: 0 }, // left_wrist
        { x: 0.7, y: 1.75, z: 0.3 }, // right_wrist (contact point)
        { x: -0.35, y: 0.9, z: 0 }, // left_fingers
        { x: 0.8, y: 1.8, z: 0.35 }, // right_fingers (racket at contact)
        { x: -0.15, y: 0.55, z: 0 }, // left_knee (straightening)
        { x: 0.2, y: 0.5, z: 0.05 }, // right_knee
        { x: -0.15, y: 0.05, z: 0.05 }, // left_ankle
        { x: 0.25, y: 0.05, z: 0 }, // right_ankle
        { x: -0.2, y: 0, z: 0.1 }, // left_toe
        { x: 0.3, y: 0, z: 0 }, // right_toe
      ],
    },
  ],
  netshot: [
    {
      name: 'Approach',
      landmarks: [
        { x: 0, y: 1.65, z: 0 },
        { x: 0, y: 1.45, z: 0 },
        { x: -0.2, y: 1.35, z: 0 },
        { x: 0.2, y: 1.35, z: 0 },
        { x: -0.15, y: 0.95, z: 0 },
        { x: 0.15, y: 0.95, z: 0 },
        { x: -0.25, y: 1.15, z: 0.1 },
        { x: 0.35, y: 1.25, z: 0.15 },
        { x: -0.3, y: 0.95, z: 0.1 },
        { x: 0.5, y: 1.2, z: 0.25 },
        { x: -0.35, y: 0.85, z: 0.1 },
        { x: 0.55, y: 1.15, z: 0.3 },
        { x: -0.15, y: 0.5, z: 0.05 },
        { x: 0.25, y: 0.5, z: 0.1 },
        { x: -0.15, y: 0.05, z: 0.05 },
        { x: 0.3, y: 0.05, z: 0.15 },
        { x: -0.2, y: 0, z: 0.1 },
        { x: 0.4, y: 0, z: 0.2 },
      ],
    },
    {
      name: 'Extend',
      landmarks: [
        { x: 0.1, y: 1.5, z: 0.2 },
        { x: 0.1, y: 1.3, z: 0.15 },
        { x: -0.15, y: 1.2, z: 0.1 },
        { x: 0.3, y: 1.25, z: 0.2 },
        { x: -0.1, y: 0.85, z: 0.05 },
        { x: 0.2, y: 0.85, z: 0.1 },
        { x: -0.2, y: 1.0, z: 0.15 },
        { x: 0.55, y: 1.15, z: 0.35 },
        { x: -0.25, y: 0.8, z: 0.15 },
        { x: 0.8, y: 1.0, z: 0.5 },
        { x: -0.3, y: 0.7, z: 0.15 },
        { x: 0.9, y: 0.95, z: 0.55 },
        { x: -0.15, y: 0.45, z: 0.1 },
        { x: 0.35, y: 0.35, z: 0.2 },
        { x: -0.2, y: 0.05, z: 0.1 },
        { x: 0.55, y: 0.05, z: 0.35 },
        { x: -0.25, y: 0, z: 0.15 },
        { x: 0.65, y: 0, z: 0.4 },
      ],
    },
    {
      name: 'Tap',
      landmarks: [
        { x: 0.15, y: 1.45, z: 0.25 },
        { x: 0.15, y: 1.25, z: 0.2 },
        { x: -0.1, y: 1.15, z: 0.15 },
        { x: 0.35, y: 1.2, z: 0.25 },
        { x: -0.05, y: 0.8, z: 0.1 },
        { x: 0.25, y: 0.8, z: 0.15 },
        { x: -0.15, y: 0.95, z: 0.2 },
        { x: 0.6, y: 1.0, z: 0.4 },
        { x: -0.2, y: 0.75, z: 0.2 },
        { x: 0.85, y: 0.85, z: 0.55 },
        { x: -0.25, y: 0.65, z: 0.2 },
        { x: 0.95, y: 0.8, z: 0.6 },
        { x: -0.1, y: 0.4, z: 0.15 },
        { x: 0.4, y: 0.3, z: 0.25 },
        { x: -0.15, y: 0.05, z: 0.15 },
        { x: 0.6, y: 0.05, z: 0.4 },
        { x: -0.2, y: 0, z: 0.2 },
        { x: 0.7, y: 0, z: 0.45 },
      ],
    },
  ],
  footwork: [
    {
      name: 'Ready',
      landmarks: [
        { x: 0, y: 1.65, z: 0 },
        { x: 0, y: 1.45, z: 0 },
        { x: -0.22, y: 1.35, z: 0 },
        { x: 0.22, y: 1.35, z: 0 },
        { x: -0.15, y: 0.95, z: 0 },
        { x: 0.15, y: 0.95, z: 0 },
        { x: -0.35, y: 1.15, z: 0.15 },
        { x: 0.35, y: 1.15, z: 0.15 },
        { x: -0.4, y: 0.95, z: 0.15 },
        { x: 0.4, y: 0.95, z: 0.15 },
        { x: -0.45, y: 0.85, z: 0.15 },
        { x: 0.45, y: 0.85, z: 0.15 },
        { x: -0.18, y: 0.45, z: 0.05 },
        { x: 0.18, y: 0.45, z: 0.05 },
        { x: -0.22, y: 0.05, z: 0 },
        { x: 0.22, y: 0.05, z: 0 },
        { x: -0.27, y: 0, z: 0.05 },
        { x: 0.27, y: 0, z: 0.05 },
      ],
    },
    {
      name: 'Step',
      landmarks: [
        { x: 0.1, y: 1.6, z: 0.05 },
        { x: 0.1, y: 1.4, z: 0.05 },
        { x: -0.12, y: 1.3, z: 0.05 },
        { x: 0.32, y: 1.3, z: 0.05 },
        { x: -0.05, y: 0.9, z: 0.03 },
        { x: 0.25, y: 0.9, z: 0.03 },
        { x: -0.25, y: 1.1, z: 0.18 },
        { x: 0.45, y: 1.1, z: 0.18 },
        { x: -0.3, y: 0.9, z: 0.18 },
        { x: 0.5, y: 0.9, z: 0.18 },
        { x: -0.35, y: 0.8, z: 0.18 },
        { x: 0.55, y: 0.8, z: 0.18 },
        { x: -0.1, y: 0.45, z: 0.08 },
        { x: 0.35, y: 0.4, z: 0.1 },
        { x: -0.12, y: 0.05, z: 0.03 },
        { x: 0.45, y: 0.05, z: 0.15 },
        { x: -0.17, y: 0, z: 0.08 },
        { x: 0.55, y: 0, z: 0.2 },
      ],
    },
    {
      name: 'Return',
      landmarks: [
        { x: 0, y: 1.65, z: 0 },
        { x: 0, y: 1.45, z: 0 },
        { x: -0.22, y: 1.35, z: 0 },
        { x: 0.22, y: 1.35, z: 0 },
        { x: -0.15, y: 0.95, z: 0 },
        { x: 0.15, y: 0.95, z: 0 },
        { x: -0.35, y: 1.15, z: 0.15 },
        { x: 0.35, y: 1.15, z: 0.15 },
        { x: -0.4, y: 0.95, z: 0.15 },
        { x: 0.4, y: 0.95, z: 0.15 },
        { x: -0.45, y: 0.85, z: 0.15 },
        { x: 0.45, y: 0.85, z: 0.15 },
        { x: -0.18, y: 0.45, z: 0.05 },
        { x: 0.18, y: 0.45, z: 0.05 },
        { x: -0.22, y: 0.05, z: 0 },
        { x: 0.22, y: 0.05, z: 0 },
        { x: -0.27, y: 0, z: 0.05 },
        { x: 0.27, y: 0, z: 0.05 },
      ],
    },
  ],
  drive: [
    {
      name: 'Position',
      landmarks: [
        { x: 0, y: 1.65, z: 0 },
        { x: 0, y: 1.45, z: 0 },
        { x: -0.2, y: 1.35, z: 0 },
        { x: 0.2, y: 1.35, z: 0 },
        { x: -0.15, y: 0.95, z: 0 },
        { x: 0.15, y: 0.95, z: 0 },
        { x: -0.3, y: 1.2, z: 0.1 },
        { x: 0.35, y: 1.25, z: -0.1 },
        { x: -0.35, y: 1.0, z: 0.1 },
        { x: 0.4, y: 1.35, z: -0.2 },
        { x: -0.4, y: 0.9, z: 0.1 },
        { x: 0.45, y: 1.4, z: -0.25 },
        { x: -0.15, y: 0.5, z: 0.05 },
        { x: 0.15, y: 0.5, z: 0 },
        { x: -0.18, y: 0.05, z: 0.05 },
        { x: 0.18, y: 0.05, z: 0 },
        { x: -0.23, y: 0, z: 0.1 },
        { x: 0.23, y: 0, z: 0 },
      ],
    },
    {
      name: 'Contact',
      landmarks: [
        { x: 0.05, y: 1.65, z: 0.05 },
        { x: 0.05, y: 1.45, z: 0.05 },
        { x: -0.15, y: 1.35, z: 0.05 },
        { x: 0.25, y: 1.35, z: 0.05 },
        { x: -0.1, y: 0.95, z: 0.03 },
        { x: 0.2, y: 0.95, z: 0.03 },
        { x: -0.25, y: 1.15, z: 0.15 },
        { x: 0.45, y: 1.2, z: 0.2 },
        { x: -0.3, y: 0.95, z: 0.15 },
        { x: 0.65, y: 1.25, z: 0.35 },
        { x: -0.35, y: 0.85, z: 0.15 },
        { x: 0.75, y: 1.3, z: 0.4 },
        { x: -0.12, y: 0.5, z: 0.08 },
        { x: 0.18, y: 0.48, z: 0.05 },
        { x: -0.15, y: 0.05, z: 0.08 },
        { x: 0.22, y: 0.05, z: 0.05 },
        { x: -0.2, y: 0, z: 0.13 },
        { x: 0.27, y: 0, z: 0.08 },
      ],
    },
    {
      name: 'Follow',
      landmarks: [
        { x: 0.08, y: 1.65, z: 0.1 },
        { x: 0.08, y: 1.45, z: 0.1 },
        { x: -0.12, y: 1.35, z: 0.1 },
        { x: 0.28, y: 1.35, z: 0.1 },
        { x: -0.07, y: 0.95, z: 0.05 },
        { x: 0.22, y: 0.95, z: 0.05 },
        { x: -0.22, y: 1.1, z: 0.18 },
        { x: 0.35, y: 1.05, z: 0.35 },
        { x: -0.27, y: 0.9, z: 0.18 },
        { x: 0.5, y: 0.95, z: 0.5 },
        { x: -0.32, y: 0.8, z: 0.18 },
        { x: 0.55, y: 0.9, z: 0.55 },
        { x: -0.1, y: 0.5, z: 0.1 },
        { x: 0.2, y: 0.48, z: 0.08 },
        { x: -0.13, y: 0.05, z: 0.1 },
        { x: 0.25, y: 0.05, z: 0.08 },
        { x: -0.18, y: 0, z: 0.15 },
        { x: 0.3, y: 0, z: 0.13 },
      ],
    },
  ],
  clear: [
    {
      name: 'Prepare',
      landmarks: [
        { x: -0.05, y: 1.7, z: 0 },
        { x: -0.05, y: 1.5, z: 0 },
        { x: -0.25, y: 1.4, z: 0.05 },
        { x: 0.15, y: 1.4, z: -0.05 },
        { x: -0.2, y: 1.0, z: 0.03 },
        { x: 0.1, y: 1.0, z: -0.03 },
        { x: -0.35, y: 1.2, z: 0.1 },
        { x: 0.35, y: 1.55, z: -0.2 },
        { x: -0.4, y: 1.0, z: 0.1 },
        { x: 0.45, y: 1.7, z: -0.3 },
        { x: -0.45, y: 0.9, z: 0.1 },
        { x: 0.5, y: 1.8, z: -0.35 },
        { x: -0.2, y: 0.5, z: 0.05 },
        { x: 0.15, y: 0.5, z: -0.03 },
        { x: -0.22, y: 0.05, z: 0.08 },
        { x: 0.18, y: 0.05, z: -0.08 },
        { x: -0.27, y: 0, z: 0.13 },
        { x: 0.23, y: 0, z: -0.13 },
      ],
    },
    {
      name: 'Reach',
      landmarks: [
        { x: 0, y: 1.68, z: 0.05 },
        { x: 0, y: 1.48, z: 0.05 },
        { x: -0.2, y: 1.38, z: 0.08 },
        { x: 0.2, y: 1.42, z: 0 },
        { x: -0.15, y: 0.98, z: 0.05 },
        { x: 0.15, y: 1.0, z: 0 },
        { x: -0.3, y: 1.18, z: 0.12 },
        { x: 0.45, y: 1.65, z: 0.1 },
        { x: -0.35, y: 0.98, z: 0.12 },
        { x: 0.65, y: 1.8, z: 0.2 },
        { x: -0.4, y: 0.88, z: 0.12 },
        { x: 0.75, y: 1.85, z: 0.25 },
        { x: -0.17, y: 0.52, z: 0.08 },
        { x: 0.18, y: 0.48, z: 0 },
        { x: -0.2, y: 0.05, z: 0.1 },
        { x: 0.22, y: 0.05, z: -0.03 },
        { x: -0.25, y: 0, z: 0.15 },
        { x: 0.27, y: 0, z: -0.08 },
      ],
    },
    {
      name: 'Follow',
      landmarks: [
        { x: 0.05, y: 1.68, z: -0.05 },
        { x: 0.05, y: 1.48, z: -0.03 },
        { x: -0.15, y: 1.38, z: -0.05 },
        { x: 0.25, y: 1.38, z: 0.05 },
        { x: -0.1, y: 0.98, z: -0.03 },
        { x: 0.2, y: 0.98, z: 0.03 },
        { x: -0.25, y: 1.15, z: 0 },
        { x: 0.35, y: 1.15, z: 0.25 },
        { x: -0.3, y: 0.95, z: 0 },
        { x: 0.45, y: 0.95, z: 0.4 },
        { x: -0.35, y: 0.85, z: 0 },
        { x: 0.5, y: 0.85, z: 0.45 },
        { x: -0.13, y: 0.52, z: 0 },
        { x: 0.18, y: 0.5, z: 0.05 },
        { x: -0.16, y: 0.05, z: 0.03 },
        { x: 0.22, y: 0.05, z: 0.05 },
        { x: -0.21, y: 0, z: 0.08 },
        { x: 0.27, y: 0, z: 0.08 },
      ],
    },
  ],
};

// Interpolate between two keyframes
function interpolateLandmarks(
  from: Landmark3D[],
  to: Landmark3D[],
  t: number
): Landmark3D[] {
  return from.map((f, i) => ({
    x: f.x + (to[i].x - f.x) * t,
    y: f.y + (to[i].y - f.y) * t,
    z: f.z + (to[i].z - f.z) * t,
  }));
}

// Project 3D point to 2D canvas with perspective
function project3D(
  point: Landmark3D,
  canvasWidth: number,
  canvasHeight: number,
  rotationY: number,
  scale: number = 150
): { x: number; y: number; depth: number } {
  // Apply Y-axis rotation
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);
  const rotatedX = point.x * cos - point.z * sin;
  const rotatedZ = point.x * sin + point.z * cos;

  // Simple perspective projection
  const fov = 2;
  const z = rotatedZ + fov;
  const projectedX = (rotatedX / z) * scale + canvasWidth / 2;
  const projectedY = canvasHeight - ((point.y / z) * scale + canvasHeight * 0.1);

  return { x: projectedX, y: projectedY, depth: rotatedZ };
}

// ============================================
// Component Props
// ============================================

interface Skeleton3DProps {
  drillType: 'smash' | 'clear' | 'netshot' | 'footwork' | 'drive';
  activePhase?: number;
  isPlaying?: boolean;
  showLabels?: boolean;
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

// ============================================
// Main Component
// ============================================

export default function Skeleton3D({
  drillType,
  activePhase = 0,
  isPlaying = true,
  showLabels = true,
  width = 280,
  height = 350,
  color = '#0ea5e9',
  className = '',
}: Skeleton3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentPhase, setCurrentPhase] = useState(activePhase);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [rotationY, setRotationY] = useState(0.3);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const lastMouseXRef = useRef(0);

  const keyframes = DRILL_KEYFRAMES[drillType] || DRILL_KEYFRAMES.footwork;

  // Handle phase change from prop
  useEffect(() => {
    setCurrentPhase(activePhase);
    setAnimationProgress(0);
  }, [activePhase]);

  // Animation loop
  const animate = useCallback((timestamp: number) => {
    if (!isPlaying) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }

    const deltaTime = timestamp - lastTimeRef.current;

    if (deltaTime > 30) { // ~30fps
      lastTimeRef.current = timestamp;

      setAnimationProgress((prev) => {
        const newProgress = prev + 0.02; // Speed control
        if (newProgress >= 1) {
          // Move to next phase
          setCurrentPhase((p) => (p + 1) % keyframes.length);
          return 0;
        }
        return newProgress;
      });
    }

    animationRef.current = requestAnimationFrame(animate);
  }, [isPlaying, keyframes.length]);

  // Start animation
  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);

  // Draw the skeleton
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Get current and next keyframe
    const fromKeyframe = keyframes[currentPhase];
    const toKeyframe = keyframes[(currentPhase + 1) % keyframes.length];

    // Interpolate landmarks
    const landmarks = interpolateLandmarks(
      fromKeyframe.landmarks,
      toKeyframe.landmarks,
      animationProgress
    );

    // Project all points
    const projectedPoints = landmarks.map((l) =>
      project3D(l, width, height, rotationY, height * 0.4)
    );

    // Draw background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#f8fafc');
    gradient.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw grid floor
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 0.5;
    const gridY = height - 30;
    for (let i = -5; i <= 5; i++) {
      const x1 = width / 2 + i * 25;
      ctx.beginPath();
      ctx.moveTo(x1, gridY - 50);
      ctx.lineTo(x1, gridY + 10);
      ctx.stroke();
    }

    // Sort bones by average depth for proper rendering order
    const sortedBones = [...BONE_CONNECTIONS]
      .map((conn) => ({
        conn,
        depth: (projectedPoints[conn[0]].depth + projectedPoints[conn[1]].depth) / 2,
      }))
      .sort((a, b) => a.depth - b.depth);

    // Draw bones with depth-based shading
    sortedBones.forEach(({ conn }) => {
      const [i1, i2] = conn;
      const p1 = projectedPoints[i1];
      const p2 = projectedPoints[i2];

      // Depth-based alpha and width
      const avgDepth = (p1.depth + p2.depth) / 2;
      const alpha = Math.max(0.4, Math.min(1, 0.7 - avgDepth * 0.3));
      const lineWidth = Math.max(2, 4 - avgDepth);

      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    });

    // Draw joints
    ctx.globalAlpha = 1;
    projectedPoints.forEach((p, i) => {
      const depth = p.depth;
      const alpha = Math.max(0.5, Math.min(1, 0.8 - depth * 0.3));
      const radius = Math.max(3, 5 - depth);

      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Highlight for head
      if (i === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x - 1, p.y - 1, radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.globalAlpha = 1;

    // Draw phase label
    if (showLabels) {
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(fromKeyframe.name, width / 2, 25);

      // Phase indicator dots
      const dotSpacing = 20;
      const startX = width / 2 - ((keyframes.length - 1) * dotSpacing) / 2;
      keyframes.forEach((_, i) => {
        ctx.fillStyle = i === currentPhase ? color : '#cbd5e1';
        ctx.beginPath();
        ctx.arc(startX + i * dotSpacing, height - 15, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }, [currentPhase, animationProgress, rotationY, width, height, color, keyframes, showLabels]);

  // Mouse drag for rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastMouseXRef.current = e.clientX;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - lastMouseXRef.current;
    lastMouseXRef.current = e.clientX;
    setRotationY((prev) => prev + deltaX * 0.01);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-lg cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      <div className="absolute bottom-2 right-2 text-xs text-gray-400">
        Drag to rotate
      </div>
    </div>
  );
}

// ============================================
// Tabbed Drill Animation Component
// ============================================

interface TabbedDrillAnimationProps {
  drillType: 'smash' | 'clear' | 'netshot' | 'footwork' | 'drive';
  className?: string;
}

export function TabbedDrillAnimation({
  drillType,
  className = '',
}: TabbedDrillAnimationProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const keyframes = DRILL_KEYFRAMES[drillType] || DRILL_KEYFRAMES.footwork;
  const tabLabels = keyframes.map((kf) => kf.name);

  return (
    <div className={`bg-white rounded-xl shadow-sm overflow-hidden ${className}`}>
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {tabLabels.map((label, i) => (
          <button
            key={i}
            onClick={() => {
              setActiveTab(i);
              setIsPlaying(false);
            }}
            className={`flex-1 px-4 py-3 text-sm font-medium transition ${
              activeTab === i
                ? 'text-primary-600 border-b-2 border-primary-500 bg-primary-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Animation */}
      <div className="p-4 flex flex-col items-center">
        <Skeleton3D
          drillType={drillType}
          activePhase={activeTab}
          isPlaying={isPlaying}
          showLabels={false}
          width={240}
          height={300}
        />

        {/* Play/Pause control */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="mt-3 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition flex items-center gap-2"
        >
          {isPlaying ? (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
              Pause
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Play Animation
            </>
          )}
        </button>
      </div>
    </div>
  );
}
