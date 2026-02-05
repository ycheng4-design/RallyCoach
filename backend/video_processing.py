import cv2
import numpy as np
import mediapipe as mp

mp_pose = mp.solutions.pose

# MediaPipe pose connections
POSE_CONNECTIONS = [
    (11, 12), (12, 14), (14, 16),  # Right arm
    (11, 13), (13, 15),  # Left arm
    (12, 24), (11, 23),  # Torso
    (24, 26), (26, 28),  # Right leg
    (23, 25), (25, 27),  # Left leg
    (23, 24),  # Hips
    (11, 12),  # Shoulders
]


def draw_skeleton_on_frame(frame, pose_dict, angles=None, is_good_form=True):
    """
    Draw pose skeleton overlay on a video frame with angle-based coloring.

    Args:
        frame: Video frame (numpy array)
        pose_dict: Dictionary with joint names as keys, (x, y) tuples as values
        angles: Dict of calculated angles (e.g., {'right_elbow': 145.0})
        is_good_form: Boolean indicating if form is correct

    Returns:
        Annotated frame with skeleton overlay
    """
    if pose_dict is None or not pose_dict:
        return frame

    annotated_frame = frame.copy()

    # Define connections with joint names
    connections = [
        ('right_shoulder', 'right_elbow'),
        ('right_elbow', 'right_wrist'),
        ('left_shoulder', 'left_elbow'),
        ('left_elbow', 'left_wrist'),
        ('right_shoulder', 'right_hip'),
        ('left_shoulder', 'left_hip'),
        ('right_hip', 'left_hip'),
        ('right_hip', 'right_knee'),
        ('right_knee', 'right_ankle'),
        ('left_hip', 'left_knee'),
        ('left_knee', 'left_ankle'),
    ]

    # Determine color based on form quality
    line_color = (0, 255, 0) if is_good_form else (0, 0, 255)  # Green or Red
    joint_color = (0, 255, 0) if is_good_form else (0, 0, 255)

    # Draw connections
    for start_joint, end_joint in connections:
        if start_joint in pose_dict and end_joint in pose_dict:
            start_point = (int(pose_dict[start_joint][0]), int(pose_dict[start_joint][1]))
            end_point = (int(pose_dict[end_joint][0]), int(pose_dict[end_joint][1]))

            # Draw line with thickness based on confidence
            cv2.line(annotated_frame, start_point, end_point, line_color, 3)

    # Draw joints
    for joint_name, (x, y) in pose_dict.items():
        point = (int(x), int(y))
        cv2.circle(annotated_frame, point, 5, joint_color, -1)
        cv2.circle(annotated_frame, point, 5, (255, 255, 255), 2)

    # Draw angle values if provided
    if angles:
        for joint, angle in angles.items():
            if 'elbow' in joint and 'right_elbow' in pose_dict:
                pos = pose_dict['right_elbow']
                text = f"{int(angle)}°"
                cv2.putText(annotated_frame, text, (int(pos[0]) + 10, int(pos[1]) - 10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)

    return annotated_frame


def create_annotated_video(input_path, output_path, pose_data_list, shot_events):
    """
    Create a new video with skeleton overlay and shot markers.

    Args:
        input_path: Path to original video
        output_path: Path to save annotated video
        pose_data_list: List of pose landmarks per frame
        shot_events: List of detected shots with frame numbers
    """
    cap = cv2.VideoCapture(input_path)

    # Get video properties
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # Video writer
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    frame_idx = 0
    shot_frames = {shot['frame']: shot for shot in shot_events}

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Draw skeleton if pose data available
        if frame_idx < len(pose_data_list) and pose_data_list[frame_idx]:
            # Get landmarks from pose data
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = pose_estimator.process(rgb)

            if results.pose_landmarks:
                # Determine error joints
                error_joints = None
                if frame_idx in shot_frames:
                    shot = shot_frames[frame_idx]
                    if shot['pose_errors']:
                        error_joints = [12, 14, 16]  # Right arm (shoulder, elbow, wrist)

                frame = draw_skeleton_on_frame(frame, results.pose_landmarks, error_joints)

                # Add shot marker
                if frame_idx in shot_frames:
                    shot_type = shot_frames[frame_idx]['shot_type']
                    cv2.putText(frame, f"SHOT: {shot_type}", (50, 50),
                              cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)

        out.write(frame)
        frame_idx += 1

    cap.release()
    out.release()

    return output_path


def extract_key_frames(video_path, shot_events, output_dir):
    """
    Extract key frames (shot moments) from video as images.

    Args:
        video_path: Path to video
        shot_events: List of shots with frame numbers
        output_dir: Directory to save frame images

    Returns:
        List of frame image paths
    """
    import os
    os.makedirs(output_dir, exist_ok=True)

    cap = cv2.VideoCapture(video_path)
    frame_paths = []

    for shot in shot_events:
        frame_num = shot['frame']
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
        ret, frame = cap.read()

        if ret:
            # Process with pose overlay
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = pose_estimator.process(rgb)

            if results.pose_landmarks:
                error_joints = [12, 14, 16] if shot['pose_errors'] else None
                frame = draw_skeleton_on_frame(frame, results.pose_landmarks, error_joints)

            # Save frame
            frame_path = os.path.join(output_dir, f"frame_{frame_num}_{shot['shot_type']}.jpg")
            cv2.imwrite(frame_path, frame)
            frame_paths.append(frame_path)

    cap.release()
    return frame_paths