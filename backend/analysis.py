import math
from pose_estimation import extract_pose_from_video, calc_angle
from gemini_client import generate_coaching_feedback


def analyze_video(video_path, language="en"):
    """
    Main video analysis pipeline.

    Steps:
    1. Extract pose data from video
    2. Detect shot events
    3. Analyze pose for each shot
    4. Generate Gemini feedback
    5. Return structured JSON
    """

    # Step 1: Extract pose data
    pose_data, frames = extract_pose_from_video(video_path)

    # Step 2: Detect shots based on wrist movement
    shot_events = detect_shots(pose_data, frames)

    # Step 3: Analyze each shot for form errors
    for shot in shot_events:
        frame_idx = shot["frame"]
        if pose_data[frame_idx]:
            shot["pose_errors"] = analyze_shot_pose(
                pose_data[frame_idx],
                shot["shot_type"]
            )

    # Step 4: Prepare summary for Gemini
    analysis_summary = prepare_summary(shot_events)

    # Step 5: Get Gemini feedback (with language support)
    feedback = generate_coaching_feedback(analysis_summary, language)

    # Step 6: Build result JSON
    result = {
        "shots": shot_events,
        "gemini_feedback": feedback
    }

    return result


def detect_shots(pose_data, frames):
    """
    Detect shot events based on wrist velocity spikes.
    Returns list of shots with frame index and type.
    """
    shot_events = []
    last_shot_frame = -100

    for i in range(1, len(frames) - 1):
        if pose_data[i] is None or pose_data[i-1] is None:
            continue

        shot_detected = False

        # Check right wrist velocity
        if 'right_wrist' in pose_data[i] and 'right_wrist' in pose_data[i-1]:
            rw_prev = pose_data[i-1]['right_wrist']
            rw_curr = pose_data[i]['right_wrist']
            speed = math.hypot(rw_curr[0] - rw_prev[0], rw_curr[1] - rw_prev[1])

            # Threshold for fast swing (tunable)
            if speed > 20:
                shot_detected = True

        # Avoid double-counting shots too close together
        if shot_detected and i - last_shot_frame > 5:
            last_shot_frame = i

            # Determine shot type by pose heuristics
            shot_type = classify_shot_type(pose_data[i])

            shot_events.append({
                "frame": i,
                "shot_type": shot_type,
                "pose_errors": []
            })

    return shot_events


def classify_shot_type(pose):
    """
    Classify shot type based on pose heuristics.
    Very basic logic for MVP.
    """
    if not pose:
        return "Other"

    # Calculate elbow angle
    right_elbow_angle = calc_angle(
        pose['right_shoulder'],
        pose['right_elbow'],
        pose['right_wrist']
    )

    # Simple classification rules
    # If wrist is above shoulder and arm nearly straight
    if pose['right_wrist'][1] < pose['right_shoulder'][1]:
        if right_elbow_angle < 160:
            return "Smash/Clear"
        else:
            return "Overhead"
    # If wrist is below shoulder
    elif pose['right_wrist'][1] > pose['right_shoulder'][1]:
        # Check if near hip level (net shot)
        if 'right_hip' in pose and pose['right_wrist'][1] < pose['right_hip'][1]:
            return "Net Shot"
        else:
            return "Underhand"
    else:
        return "Other"


def analyze_shot_pose(pose, shot_type):
    """
    Compare pose with ideal form and detect errors.
    Returns list of error messages.
    """
    pose_errors = []

    if shot_type == "Smash/Clear":
        # Check elbow extension
        angle = calc_angle(
            pose['right_shoulder'],
            pose['right_elbow'],
            pose['right_wrist']
        )
        if angle < 170:
            pose_errors.append(f"Elbow not fully extended (angle ~{int(angle)}°, ideal 170°+)")

        # Check if arm is raised high enough
        if pose['right_wrist'][1] > pose['right_shoulder'][1]:
            pose_errors.append("Arm not raised high enough for overhead shot")

    elif shot_type == "Net Shot":
        # Check knee bend (simple heuristic)
        if 'right_knee' in pose and 'right_hip' in pose and 'right_ankle' in pose:
            knee_angle = calc_angle(
                pose['right_hip'],
                pose['right_knee'],
                pose['right_ankle']
            )
            if knee_angle > 150:  # Too straight
                pose_errors.append("Knees not bent enough for lunge (increase knee bend)")

    # General posture checks could be added here

    return pose_errors


def prepare_summary(shot_events):
    """
    Prepare a text summary of analysis for Gemini prompt.
    """
    summary_lines = []

    if not shot_events:
        summary_lines.append("No clear shots detected in the video.")
    else:
        summary_lines.append(f"Detected {len(shot_events)} shot(s):\n")

        for i, shot in enumerate(shot_events, 1):
            shot_type = shot["shot_type"]
            errors = shot["pose_errors"]

            if errors:
                error_text = "; ".join(errors)
                summary_lines.append(f"{i}. {shot_type} at frame {shot['frame']}: Issues found - {error_text}")
            else:
                summary_lines.append(f"{i}. {shot_type} at frame {shot['frame']}: Good form")

    return "\n".join(summary_lines)
