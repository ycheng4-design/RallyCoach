import type { PoseMetrics, PoseLandmark } from './types';

// MediaPipe Pose landmark indices
export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
};

// Calculate angle between three points (in degrees)
export function calculateAngle(
  p1: PoseLandmark,
  p2: PoseLandmark, // vertex
  p3: PoseLandmark
): number {
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

  if (mag1 === 0 || mag2 === 0) return 0;

  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.acos(cosAngle) * (180 / Math.PI);
}

// Calculate distance between two points
export function calculateDistance(p1: PoseLandmark, p2: PoseLandmark): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Extract metrics from pose landmarks
export function extractMetrics(landmarks: PoseLandmark[]): PoseMetrics {
  // Get relevant landmarks
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  const leftElbow = landmarks[POSE_LANDMARKS.LEFT_ELBOW];
  const rightElbow = landmarks[POSE_LANDMARKS.RIGHT_ELBOW];
  const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST];
  const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST];
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
  const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
  const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
  const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
  const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];

  // Calculate elbow angle (use the more visible arm)
  const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
  const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
  const elbowAngle =
    leftElbow.visibility > rightElbow.visibility ? leftElbowAngle : rightElbowAngle;

  // Calculate knee angle (average of both knees)
  const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
  const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
  const kneeAngle = (leftKneeAngle + rightKneeAngle) / 2;

  // Calculate stance width normalized by shoulder width
  const shoulderWidth = calculateDistance(leftShoulder, rightShoulder);
  const ankleWidth = calculateDistance(leftAnkle, rightAnkle);
  const stanceWidthNorm = shoulderWidth > 0 ? ankleWidth / shoulderWidth : 0;

  // Calculate shoulder-hip rotation proxy
  // This measures the rotation difference between shoulder line and hip line
  const shoulderAngle = Math.atan2(
    rightShoulder.y - leftShoulder.y,
    rightShoulder.x - leftShoulder.x
  );
  const hipAngle = Math.atan2(rightHip.y - leftHip.y, rightHip.x - leftHip.x);
  const rotationProxy = Math.abs(shoulderAngle - hipAngle);

  return {
    elbow_angle: elbowAngle,
    knee_angle: kneeAngle,
    stance_width_norm: stanceWidthNorm,
    shoulder_hip_rotation_proxy: rotationProxy,
    timestamp: Date.now(),
  };
}

// Check if metrics are within acceptable thresholds
export function evaluateMetrics(metrics: PoseMetrics): {
  isGreen: boolean;
  feedback: string[];
} {
  const feedback: string[] = [];
  let greenCount = 0;
  const totalChecks = 4;

  // Elbow angle check (90-120 degrees is ideal)
  if (metrics.elbow_angle >= 90 && metrics.elbow_angle <= 120) {
    greenCount++;
  } else if (metrics.elbow_angle < 90) {
    feedback.push('Extend your elbow more');
  } else {
    feedback.push('Bend your elbow slightly');
  }

  // Knee angle check (120-150 degrees is ideal)
  if (metrics.knee_angle >= 120 && metrics.knee_angle <= 150) {
    greenCount++;
  } else if (metrics.knee_angle < 120) {
    feedback.push('Straighten your knees a bit');
  } else {
    feedback.push('Bend your knees more');
  }

  // Stance width check (0.3-0.5 normalized is ideal)
  if (metrics.stance_width_norm >= 0.3 && metrics.stance_width_norm <= 0.5) {
    greenCount++;
  } else if (metrics.stance_width_norm < 0.3) {
    feedback.push('Widen your stance');
  } else {
    feedback.push('Narrow your stance slightly');
  }

  // Rotation check (0.1-0.3 is ideal for most shots)
  if (
    metrics.shoulder_hip_rotation_proxy >= 0.1 &&
    metrics.shoulder_hip_rotation_proxy <= 0.3
  ) {
    greenCount++;
  } else if (metrics.shoulder_hip_rotation_proxy < 0.1) {
    feedback.push('Rotate your body more');
  } else {
    feedback.push('Control your rotation');
  }

  return {
    isGreen: greenCount >= 3, // Green if at least 3 out of 4 metrics are good
    feedback: feedback.length > 0 ? feedback : ['Great form! Keep it up!'],
  };
}

// Generate mock metrics for demo/fallback
export function generateMockMetrics(): PoseMetrics {
  return {
    elbow_angle: 95 + Math.random() * 30,
    knee_angle: 125 + Math.random() * 30,
    stance_width_norm: 0.35 + Math.random() * 0.2,
    shoulder_hip_rotation_proxy: 0.15 + Math.random() * 0.2,
    timestamp: Date.now(),
  };
}

// Drawing utilities for canvas
export const POSE_CONNECTIONS = [
  // Face
  [POSE_LANDMARKS.LEFT_EAR, POSE_LANDMARKS.LEFT_EYE],
  [POSE_LANDMARKS.LEFT_EYE, POSE_LANDMARKS.NOSE],
  [POSE_LANDMARKS.NOSE, POSE_LANDMARKS.RIGHT_EYE],
  [POSE_LANDMARKS.RIGHT_EYE, POSE_LANDMARKS.RIGHT_EAR],
  // Torso
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER],
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP],
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_HIP],
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP],
  // Left arm
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW],
  [POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],
  // Right arm
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW],
  [POSE_LANDMARKS.RIGHT_ELBOW, POSE_LANDMARKS.RIGHT_WRIST],
  // Left leg
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
  [POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],
  // Right leg
  [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE],
  [POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE],
];

export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: PoseLandmark[],
  isGreen: boolean,
  width: number,
  height: number
) {
  const color = isGreen ? '#22c55e' : '#ef4444';

  // Draw connections
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;

  for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
    const start = landmarks[startIdx];
    const end = landmarks[endIdx];

    if (start.visibility > 0.5 && end.visibility > 0.5) {
      ctx.beginPath();
      ctx.moveTo(start.x * width, start.y * height);
      ctx.lineTo(end.x * width, end.y * height);
      ctx.stroke();
    }
  }

  // Draw landmarks
  ctx.fillStyle = color;
  for (const landmark of landmarks) {
    if (landmark.visibility > 0.5) {
      ctx.beginPath();
      ctx.arc(landmark.x * width, landmark.y * height, 5, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
}

// Default thresholds for metrics
export const DEFAULT_THRESHOLDS = {
  elbow_angle: { min: 90, max: 120 },
  knee_angle: { min: 120, max: 150 },
  stance_width_norm: { min: 0.3, max: 0.5 },
  shoulder_hip_rotation_proxy: { min: 0.1, max: 0.3 },
};
