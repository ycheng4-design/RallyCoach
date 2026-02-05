import cv2
import math
import mediapipe as mp

# Initialize MediaPipe Pose (simpler, no model file needed)
mp_pose = mp.solutions.pose
pose_estimator = mp_pose.Pose(
    static_image_mode=False,
    model_complexity=1,
    enable_segmentation=False
)


def calc_angle(p1, p2, p3):
    """Calculate angle at p2 formed by points p1->p2->p3."""
    ax, ay = p1
    bx, by = p2
    cx, cy = p3

    BA = (ax - bx, ay - by)
    BC = (cx - bx, cy - by)

    dot = BA[0] * BC[0] + BA[1] * BC[1]
    magBA = math.hypot(*BA)
    magBC = math.hypot(*BC)

    if magBA * magBC == 0:
        return 0.0

    cos_angle = max(-1.0, min(1.0, dot / (magBA * magBC)))
    angle = math.degrees(math.acos(cos_angle))
    return angle


def extract_pose_from_video(video_path):
    """
    Extract pose data from video using MediaPipe Pose.
    Returns list of pose dictionaries and frames.
    """
    cap = cv2.VideoCapture(video_path)
    pose_data = []
    frames = []

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frames.append(frame)

        # Convert BGR to RGB for MediaPipe
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose_estimator.process(rgb)

        if results.pose_landmarks:
            h, w, _ = frame.shape
            landmarks = results.pose_landmarks.landmark

            pose = {
                'right_shoulder': (landmarks[12].x * w, landmarks[12].y * h),
                'right_elbow': (landmarks[14].x * w, landmarks[14].y * h),
                'right_wrist': (landmarks[16].x * w, landmarks[16].y * h),
                'left_shoulder': (landmarks[11].x * w, landmarks[11].y * h),
                'left_elbow': (landmarks[13].x * w, landmarks[13].y * h),
                'left_wrist': (landmarks[15].x * w, landmarks[15].y * h),
                'right_hip': (landmarks[24].x * w, landmarks[24].y * h),
                'left_hip': (landmarks[23].x * w, landmarks[23].y * h),
                'right_knee': (landmarks[26].x * w, landmarks[26].y * h),
                'left_knee': (landmarks[25].x * w, landmarks[25].y * h),
                'right_ankle': (landmarks[28].x * w, landmarks[28].y * h),
                'left_ankle': (landmarks[27].x * w, landmarks[27].y * h),
            }
        else:
            pose = None

        pose_data.append(pose)

    cap.release()
    return pose_data, frames
