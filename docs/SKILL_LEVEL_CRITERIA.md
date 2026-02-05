# Skill Level Classification Criteria

## Overview

RallyCoach uses a **100-point skill score** computed from real pose metrics to classify players into three skill levels. The score is NOT from Gemini AI - it's calculated from actual movement analysis.

---

## Skill Levels

| Level | Score Range | Description |
|-------|-------------|-------------|
| **Beginner** | 0-39 | Learning fundamentals, inconsistent form |
| **Intermediate** | 40-69 | Solid basics, working on consistency |
| **Advanced** | 70-100 | Consistent technique, refined movements |

---

## Scoring Components

The skill score is computed from these factors:

### 1. Consistency Score (30% weight)
How stable your form is across frames.

| Rating | Standard Deviation |
|--------|-------------------|
| Excellent | Elbow angle std < 10°, Knee std < 15° |
| Good | Elbow std < 20°, Knee std < 25° |
| Needs Work | Elbow std > 25°, Knee std > 35° |

### 2. Recovery Speed (25% weight)
How quickly you return to ready position after lunges.

| Rating | Recovery Time |
|--------|---------------|
| Excellent | < 0.3 seconds |
| Good | 0.3-0.5 seconds |
| Slow | > 0.7 seconds |

### 3. Form Quality (25% weight)
Joint angles within ideal ranges during shots.

| Metric | Ideal Range |
|--------|-------------|
| Elbow Angle (overhead) | 150-180° |
| Elbow Angle (stroke) | 90-130° |
| Knee Bend (ready) | 130-160° |
| Knee Bend (lunge) | 90-140° |
| Stance Width | 0.8-1.4x shoulder width |

### 4. Split-Step Quality (20% weight)
Presence and execution of split-steps before shots.

| Rating | Description |
|--------|-------------|
| Good | Clear widening, controlled landing |
| Present | Detectable movement but inconsistent |
| Missing | No split-step detected |

---

## Scoring Bands (Tolerance by Level)

Different skill levels have different tolerance bands:

### Beginner
- **Green zone**: 40% wider than ideal
- **Yellow zone**: 60% wider than ideal
- Focuses on encouragement, not strict form

### Intermediate
- **Green zone**: 25% wider than ideal
- **Yellow zone**: 40% wider than ideal
- Balance of feedback and encouragement

### Advanced
- **Green zone**: 10% wider than ideal (strict)
- **Yellow zone**: 20% wider than ideal
- Detailed, precise feedback

---

## Detection Confidence

Confidence is computed from:
- **Landmark visibility** (MediaPipe visibility scores)
- **Valid frame ratio** (frames with pose detection)
- **Dropout rate** (frames with missing poses)

| Confidence | Interpretation |
|------------|----------------|
| > 80% | High confidence in assessment |
| 60-80% | Moderate confidence |
| < 60% | Low confidence - may be inaccurate |

---

## Issue Penalties

Detected issues reduce the skill score:
- **High severity issue**: -5 points each
- **Medium severity issue**: -2 points each
- **Low severity issue**: No penalty

---

## Example Scores

| Scenario | Approx Score | Level |
|----------|--------------|-------|
| Pro player clip | 80-95 | Advanced |
| Club player, good form | 55-70 | Intermediate |
| Casual player, learning | 30-45 | Beginner |
| First time playing | 15-30 | Beginner |
