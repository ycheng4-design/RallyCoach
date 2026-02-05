/**
 * Rules Engine for Badminton Form Evaluation
 * Provides form rules, drill recommendations, and keyframe generation
 */

import type { PoseLandmark, PoseMetrics } from './types';
import { calculateAngle, calculateDistance, POSE_LANDMARKS } from './pose-utils';

// ============================================
// Form Rules Configuration
// ============================================

export interface FormRule {
  code: string;
  name: string;
  description: string;
  compute: (landmarks: PoseLandmark[], width?: number) => number;
  threshold: { min: number; max: number };
  severity: 'low' | 'medium' | 'high';
  drillId: string;
  drillTypes: string[];
  feedback: {
    tooLow: string;
    tooHigh: string;
    good: string;
  };
}

export const FORM_RULES: Record<string, FormRule> = {
  ELBOW_ANGLE_OVERHEAD: {
    code: 'ELBOW_ANGLE_OVERHEAD',
    name: 'Elbow Extension (Overhead)',
    description: 'Elbow should be nearly straight at contact point for overhead shots',
    compute: (landmarks) => {
      const shoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
      const elbow = landmarks[POSE_LANDMARKS.RIGHT_ELBOW];
      const wrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST];
      return calculateAngle(shoulder, elbow, wrist);
    },
    threshold: { min: 150, max: 180 },
    severity: 'high',
    drillId: 'elbow-extension',
    drillTypes: ['smash', 'clear'],
    feedback: {
      tooLow: 'Extend your elbow more at contact',
      tooHigh: 'Good extension!',
      good: 'Perfect elbow extension!',
    },
  },
  ELBOW_ANGLE_DRIVE: {
    code: 'ELBOW_ANGLE_DRIVE',
    name: 'Elbow Angle (Drive)',
    description: 'Elbow should be at 90-120 degrees for drive shots',
    compute: (landmarks) => {
      const shoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
      const elbow = landmarks[POSE_LANDMARKS.RIGHT_ELBOW];
      const wrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST];
      return calculateAngle(shoulder, elbow, wrist);
    },
    threshold: { min: 90, max: 120 },
    severity: 'medium',
    drillId: 'drive-technique',
    drillTypes: ['drive', 'netshot'],
    feedback: {
      tooLow: 'Extend your elbow slightly more',
      tooHigh: 'Bend your elbow more for control',
      good: 'Good elbow position!',
    },
  },
  STANCE_WIDTH: {
    code: 'STANCE_WIDTH',
    name: 'Stance Width',
    description: 'Feet should be shoulder-width apart for stability',
    compute: (landmarks, width = 640) => {
      const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
      const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
      const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
      const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
      const shoulderWidth = calculateDistance(leftShoulder, rightShoulder);
      const ankleWidth = calculateDistance(leftAnkle, rightAnkle);
      return shoulderWidth > 0 ? ankleWidth / shoulderWidth : 0;
    },
    threshold: { min: 0.8, max: 1.5 },
    severity: 'medium',
    drillId: 'footwork-basics',
    drillTypes: ['footwork', 'general'],
    feedback: {
      tooLow: 'Widen your stance for better balance',
      tooHigh: 'Narrow your stance slightly',
      good: 'Good stance width!',
    },
  },
  KNEE_BEND: {
    code: 'KNEE_BEND',
    name: 'Knee Bend',
    description: 'Knees should be bent for ready position and lunges',
    compute: (landmarks) => {
      const hip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
      const knee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
      const ankle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
      return calculateAngle(hip, knee, ankle);
    },
    threshold: { min: 100, max: 160 },
    severity: 'high',
    drillId: 'lunge-practice',
    drillTypes: ['netshot', 'footwork', 'general'],
    feedback: {
      tooLow: 'Straighten your legs a bit more',
      tooHigh: 'Bend your knees more for power',
      good: 'Good knee bend!',
    },
  },
  BODY_ROTATION: {
    code: 'BODY_ROTATION',
    name: 'Body Rotation',
    description: 'Proper hip-shoulder separation for power generation',
    compute: (landmarks) => {
      const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
      const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
      const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
      const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
      const shoulderAngle = Math.atan2(
        rightShoulder.y - leftShoulder.y,
        rightShoulder.x - leftShoulder.x
      );
      const hipAngle = Math.atan2(rightHip.y - leftHip.y, rightHip.x - leftHip.x);
      return Math.abs(shoulderAngle - hipAngle) * (180 / Math.PI);
    },
    threshold: { min: 10, max: 45 },
    severity: 'medium',
    drillId: 'rotation-drill',
    drillTypes: ['smash', 'clear'],
    feedback: {
      tooLow: 'Rotate your body more for power',
      tooHigh: 'Control your rotation',
      good: 'Good body rotation!',
    },
  },
};

// ============================================
// Drill Definitions
// ============================================

export interface DrillDefinition {
  id: string;
  name: string;
  description: string;
  steps: string[];
  tips: string[];
  durationMinutes: number;
  targetMetrics: string[];
  keyframeType: 'smash' | 'clear' | 'netshot' | 'footwork' | 'drive';
}

export const DRILLS: Record<string, DrillDefinition> = {
  'elbow-extension': {
    id: 'elbow-extension',
    name: 'Elbow Extension Drill',
    description: 'Practice full arm extension for powerful overhead shots',
    steps: [
      'Stand with racket arm extended overhead',
      'Practice full extension motion slowly',
      'Focus on locking elbow at contact point',
      'Repeat 20 times with shadow swing',
    ],
    tips: ['Keep wrist relaxed', 'Use mirror for feedback', 'Focus on smooth motion'],
    durationMinutes: 5,
    targetMetrics: ['elbow_angle'],
    keyframeType: 'smash',
  },
  'lunge-practice': {
    id: 'lunge-practice',
    name: 'Lunge Practice Drill',
    description: 'Develop proper lunge technique for net play',
    steps: [
      'Start in ready stance',
      'Step forward with lead leg',
      'Bend knee to 90 degrees',
      'Push back to starting position',
    ],
    tips: ['Keep back straight', 'Push through heel', 'Stay low'],
    durationMinutes: 10,
    targetMetrics: ['knee_angle', 'stance_width'],
    keyframeType: 'netshot',
  },
  'footwork-basics': {
    id: 'footwork-basics',
    name: 'Footwork Basics',
    description: 'Master the fundamental footwork patterns',
    steps: [
      'Start in center position',
      'Move to each corner using proper footwork',
      'Return to center after each move',
      'Focus on split step timing',
    ],
    tips: ['Stay on balls of feet', 'Keep center of gravity low', 'Use small, quick steps'],
    durationMinutes: 15,
    targetMetrics: ['stance_width', 'knee_angle'],
    keyframeType: 'footwork',
  },
  'rotation-drill': {
    id: 'rotation-drill',
    name: 'Body Rotation Drill',
    description: 'Develop hip-shoulder separation for power',
    steps: [
      'Stand sideways to the net',
      'Rotate hips first, then shoulders',
      'Practice the throwing motion',
      'Add racket swing gradually',
    ],
    tips: ['Lead with hips', 'Keep eye on shuttle', 'Follow through completely'],
    durationMinutes: 10,
    targetMetrics: ['body_rotation'],
    keyframeType: 'smash',
  },
  'drive-technique': {
    id: 'drive-technique',
    name: 'Drive Shot Technique',
    description: 'Practice flat, fast drive shots',
    steps: [
      'Position racket at shoulder height',
      'Use short, punchy swing',
      'Contact shuttle in front of body',
      'Follow through towards target',
    ],
    tips: ['Keep grip relaxed', 'Use forearm rotation', 'Stay compact'],
    durationMinutes: 10,
    targetMetrics: ['elbow_angle'],
    keyframeType: 'drive',
  },
};

// ============================================
// Evaluation Functions
// ============================================

export interface EvaluationResult {
  passed: boolean;
  score: number;
  failedRules: Array<{
    rule: FormRule;
    value: number;
    feedback: string;
  }>;
  passedRules: Array<{
    rule: FormRule;
    value: number;
  }>;
  highlightJoints: number[];
  recommendedDrills: DrillDefinition[];
}

export function evaluateForm(
  landmarks: PoseLandmark[],
  drillType: string = 'general',
  canvasWidth: number = 640
): EvaluationResult {
  const failedRules: EvaluationResult['failedRules'] = [];
  const passedRules: EvaluationResult['passedRules'] = [];
  const highlightJoints: number[] = [];
  const drillIds = new Set<string>();

  // Get rules applicable to this drill type
  const applicableRules = Object.values(FORM_RULES).filter(
    (rule) => rule.drillTypes.includes(drillType) || rule.drillTypes.includes('general')
  );

  for (const rule of applicableRules) {
    const value = rule.compute(landmarks, canvasWidth);
    const { min, max } = rule.threshold;

    if (value >= min && value <= max) {
      passedRules.push({ rule, value });
    } else {
      const feedback = value < min ? rule.feedback.tooLow : rule.feedback.tooHigh;
      failedRules.push({ rule, value, feedback });
      drillIds.add(rule.drillId);

      // Add joints to highlight based on rule
      if (rule.code.includes('ELBOW')) {
        highlightJoints.push(POSE_LANDMARKS.RIGHT_ELBOW, POSE_LANDMARKS.RIGHT_WRIST);
      }
      if (rule.code.includes('KNEE')) {
        highlightJoints.push(POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.LEFT_KNEE);
      }
      if (rule.code.includes('STANCE')) {
        highlightJoints.push(POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.RIGHT_ANKLE);
      }
    }
  }

  const totalRules = applicableRules.length;
  const score = totalRules > 0 ? (passedRules.length / totalRules) * 100 : 100;
  const passed = score >= 75; // Pass if 75% or more rules pass

  // Get recommended drills
  const recommendedDrills = Array.from(drillIds)
    .map((id) => DRILLS[id])
    .filter(Boolean);

  return {
    passed,
    score,
    failedRules,
    passedRules,
    highlightJoints,
    recommendedDrills,
  };
}

// ============================================
// SVG Keyframe Generation
// ============================================

const IDEAL_POSES: Record<string, Array<{ x: number; y: number }>> = {
  smash: [
    // Frame 1: Preparation
    { x: 0.5, y: 0.15 }, // nose
    { x: 0.45, y: 0.25 }, // left shoulder
    { x: 0.55, y: 0.25 }, // right shoulder
    { x: 0.35, y: 0.35 }, // left elbow
    { x: 0.75, y: 0.15 }, // right elbow (raised)
    { x: 0.25, y: 0.45 }, // left wrist
    { x: 0.85, y: 0.1 }, // right wrist (racket back)
    { x: 0.45, y: 0.5 }, // left hip
    { x: 0.55, y: 0.5 }, // right hip
    { x: 0.4, y: 0.75 }, // left knee
    { x: 0.6, y: 0.7 }, // right knee
    { x: 0.35, y: 0.95 }, // left ankle
    { x: 0.65, y: 0.95 }, // right ankle
  ],
  clear: [
    { x: 0.5, y: 0.15 },
    { x: 0.45, y: 0.25 },
    { x: 0.55, y: 0.25 },
    { x: 0.35, y: 0.35 },
    { x: 0.7, y: 0.2 },
    { x: 0.25, y: 0.45 },
    { x: 0.8, y: 0.1 },
    { x: 0.45, y: 0.5 },
    { x: 0.55, y: 0.5 },
    { x: 0.4, y: 0.75 },
    { x: 0.6, y: 0.7 },
    { x: 0.35, y: 0.95 },
    { x: 0.65, y: 0.95 },
  ],
  netshot: [
    { x: 0.5, y: 0.2 },
    { x: 0.45, y: 0.3 },
    { x: 0.55, y: 0.3 },
    { x: 0.4, y: 0.4 },
    { x: 0.65, y: 0.35 },
    { x: 0.35, y: 0.5 },
    { x: 0.75, y: 0.4 },
    { x: 0.45, y: 0.55 },
    { x: 0.55, y: 0.55 },
    { x: 0.35, y: 0.75 },
    { x: 0.7, y: 0.65 },
    { x: 0.3, y: 0.95 },
    { x: 0.8, y: 0.85 },
  ],
  footwork: [
    { x: 0.5, y: 0.15 },
    { x: 0.4, y: 0.25 },
    { x: 0.6, y: 0.25 },
    { x: 0.35, y: 0.4 },
    { x: 0.65, y: 0.4 },
    { x: 0.3, y: 0.5 },
    { x: 0.7, y: 0.5 },
    { x: 0.42, y: 0.5 },
    { x: 0.58, y: 0.5 },
    { x: 0.35, y: 0.75 },
    { x: 0.65, y: 0.75 },
    { x: 0.3, y: 0.95 },
    { x: 0.7, y: 0.95 },
  ],
  drive: [
    { x: 0.5, y: 0.15 },
    { x: 0.45, y: 0.25 },
    { x: 0.55, y: 0.25 },
    { x: 0.4, y: 0.35 },
    { x: 0.65, y: 0.3 },
    { x: 0.35, y: 0.45 },
    { x: 0.8, y: 0.3 },
    { x: 0.45, y: 0.5 },
    { x: 0.55, y: 0.5 },
    { x: 0.4, y: 0.75 },
    { x: 0.6, y: 0.75 },
    { x: 0.35, y: 0.95 },
    { x: 0.65, y: 0.95 },
  ],
};

const SKELETON_CONNECTIONS = [
  [0, 1], [0, 2], // Head to shoulders
  [1, 2], // Shoulder to shoulder
  [1, 3], [3, 5], // Left arm
  [2, 4], [4, 6], // Right arm
  [1, 7], [2, 8], // Shoulders to hips
  [7, 8], // Hip to hip
  [7, 9], [9, 11], // Left leg
  [8, 10], [10, 12], // Right leg
];

export function generateKeyframeSVG(
  drillType: 'smash' | 'clear' | 'netshot' | 'footwork' | 'drive',
  frame: number = 0,
  options: { width?: number; height?: number; color?: string } = {}
): string {
  const { width = 120, height = 180, color = '#0ea5e9' } = options;
  const pose = IDEAL_POSES[drillType] || IDEAL_POSES.footwork;

  // Simple frame variation (slightly different poses)
  const offset = frame * 0.02;

  let pathD = '';
  for (const [i, j] of SKELETON_CONNECTIONS) {
    const p1 = pose[i];
    const p2 = pose[j];
    if (p1 && p2) {
      const x1 = (p1.x + offset) * width;
      const y1 = p1.y * height;
      const x2 = (p2.x + offset) * width;
      const y2 = p2.y * height;
      pathD += `M${x1},${y1}L${x2},${y2}`;
    }
  }

  let circles = '';
  for (const point of pose) {
    const x = (point.x + offset) * width;
    const y = point.y * height;
    circles += `<circle cx="${x}" cy="${y}" r="4" fill="${color}"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="#f8fafc" rx="8"/>
    <path d="${pathD}" stroke="${color}" stroke-width="3" fill="none" stroke-linecap="round"/>
    ${circles}
  </svg>`;
}

export function getKeyframeSVGs(
  drillType: 'smash' | 'clear' | 'netshot' | 'footwork' | 'drive',
  options: { width?: number; height?: number } = {}
): Array<{ svg: string; label: string }> {
  const labels = {
    smash: ['Setup', 'Load', 'Strike'],
    clear: ['Prepare', 'Reach', 'Follow'],
    netshot: ['Approach', 'Extend', 'Tap'],
    footwork: ['Ready', 'Step', 'Return'],
    drive: ['Position', 'Contact', 'Follow'],
  };

  return [0, 1, 2].map((frame) => ({
    svg: generateKeyframeSVG(drillType, frame, options),
    label: labels[drillType]?.[frame] || `Step ${frame + 1}`,
  }));
}

// ============================================
// Session Stats Aggregation
// ============================================

export interface SessionStats {
  totalFrames: number;
  greenFrames: number;
  redFrames: number;
  greenRatio: number;
  avgScore: number;
  topIssues: Array<{ code: string; count: number }>;
  recommendedDrills: DrillDefinition[];
}

export function aggregateSessionStats(
  frameResults: EvaluationResult[]
): SessionStats {
  const totalFrames = frameResults.length;
  const greenFrames = frameResults.filter((r) => r.passed).length;
  const redFrames = totalFrames - greenFrames;
  const greenRatio = totalFrames > 0 ? greenFrames / totalFrames : 0;
  const avgScore = totalFrames > 0
    ? frameResults.reduce((sum, r) => sum + r.score, 0) / totalFrames
    : 0;

  // Count issues
  const issueCounts: Record<string, number> = {};
  for (const result of frameResults) {
    for (const failed of result.failedRules) {
      const code = failed.rule.code;
      issueCounts[code] = (issueCounts[code] || 0) + 1;
    }
  }

  const topIssues = Object.entries(issueCounts)
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Get unique recommended drills
  const drillIds = new Set<string>();
  for (const result of frameResults) {
    for (const drill of result.recommendedDrills) {
      drillIds.add(drill.id);
    }
  }
  const recommendedDrills = Array.from(drillIds)
    .map((id) => DRILLS[id])
    .filter(Boolean)
    .slice(0, 3);

  return {
    totalFrames,
    greenFrames,
    redFrames,
    greenRatio,
    avgScore,
    topIssues,
    recommendedDrills,
  };
}

// ============================================
// Timestamp Violation Detection
// ============================================

export function findViolationTimestamps(
  frameResults: Array<{ timestamp: number; result: EvaluationResult }>,
  ruleCode?: string
): number[] {
  return frameResults
    .filter((frame) => {
      if (ruleCode) {
        return frame.result.failedRules.some((f) => f.rule.code === ruleCode);
      }
      return !frame.result.passed;
    })
    .map((frame) => frame.timestamp);
}
