import cv2
import numpy as np
import mediapipe as mp

class VideoAnnotator:
    def __init__(self):
        self.mp_pose = mp.solutions.pose
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles
        
        # Colors (BGR)
        self.COLOR_GOOD = (0, 255, 0)    # Green
        self.COLOR_BAD = (0, 0, 255)     # Red
        self.COLOR_TEXT = (255, 255, 255) # White
        self.COLOR_GHOST = (255, 200, 100) # Light Blue for ghost

    def draw_text_with_background(self, img, text, pos, font_scale=0.6, thickness=1, color=(255, 255, 255), bg_color=(0, 0, 0)):
        """Helper to draw text with a contrasting background"""
        font = cv2.FONT_HERSHEY_SIMPLEX
        (text_w, text_h), _ = cv2.getTextSize(text, font, font_scale, thickness)
        x, y = pos
        cv2.rectangle(img, (x - 5, y - text_h - 5), (x + text_w + 5, y + 5), bg_color, -1)
        cv2.putText(img, text, (x, y), font, font_scale, color, thickness)

    def add_ideal_pose_ghost(self, frame, current_pose_landmarks):
        """
        Draws a semi-transparent 'Ghost' pose. 
        In a real app, 'ideal_pose' would come from a database of pro shots.
        For now, we visualize the current pose as a ghost for style.
        """
        overlay = frame.copy()
        if current_pose_landmarks:
            self.mp_drawing.draw_landmarks(
                overlay,
                current_pose_landmarks,
                self.mp_pose.POSE_CONNECTIONS,
                landmark_drawing_spec=self.mp_drawing.DrawingSpec(color=self.COLOR_GHOST, thickness=2, circle_radius=2),
                connection_drawing_spec=self.mp_drawing.DrawingSpec(color=self.COLOR_GHOST, thickness=2)
            )
        return cv2.addWeighted(frame, 1.0, overlay, 0.3, 0)

    def create_annotated_video(self, input_path, output_path, analysis_result):
        """
        Generates the final video with Iron-Man style overlays.
        """
        cap = cv2.VideoCapture(input_path)
        if not cap.isOpened():
            return None

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

        # Data lookups
        shots = analysis_result.get('shots', [])
        # Map frame number to specific shot data for O(1) lookup
        shot_map = {shot['frame']: shot for shot in shots}
        
        frame_idx = 0
        
        with self.mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5) as pose:
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break

                # 1. Process Pose
                image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = pose.process(image_rgb)

                # 2. Check for Shot Event
                current_shot = None
                # Check within a small window (e.g., 5 frames) to keep text on screen longer
                for f_key in shot_map:
                    if 0 <= frame_idx - f_key < 30: # Show shot info for 1 second (30 frames)
                        current_shot = shot_map[f_key]
                        break

                # 3. Draw Overlays
                if results.pose_landmarks:
                    # Draw Ghost (Optional - nice visual touch)
                    # frame = self.add_ideal_pose_ghost(frame, results.pose_landmarks)

                    # Draw Main Skeleton
                    # Color based on quality if inside a shot event
                    connection_color = self.COLOR_GOOD
                    if current_shot and current_shot.get('pose_errors'):
                        connection_color = self.COLOR_BAD

                    self.mp_drawing.draw_landmarks(
                        frame,
                        results.pose_landmarks,
                        self.mp_pose.POSE_CONNECTIONS,
                        landmark_drawing_spec=self.mp_drawing.DrawingSpec(color=connection_color, thickness=2, circle_radius=2),
                        connection_drawing_spec=self.mp_drawing.DrawingSpec(color=connection_color, thickness=2)
                    )

                # 4. Draw HUD / Text Info
                if current_shot:
                    # Top Left: Shot Type
                    self.draw_text_with_background(frame, f"SHOT: {current_shot['shot_type']}", (20, 50), 1.2, 2)
                    
                    # Bottom Left: Errors or Good Form
                    if current_shot.get('pose_errors'):
                        y_pos = 100
                        for err in current_shot['pose_errors']:
                            self.draw_text_with_background(frame, f"FIX: {err}", (20, y_pos), 0.7, 1, self.COLOR_BAD)
                            y_pos += 30
                    else:
                        self.draw_text_with_background(frame, "PERFECT FORM", (20, 100), 0.8, 2, self.COLOR_GOOD)

                    # Top Right: Tactical Suggestion (from CoachAI logic)
                    if 'suggestion' in current_shot:
                        self.draw_text_with_background(frame, f"COACH: {current_shot['suggestion']}", (width - 400, 50), 0.7, 1, (0, 255, 255))

                # Frame Counter
                cv2.putText(frame, f"Frame: {frame_idx}", (width - 150, height - 30), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)

                out.write(frame)
                frame_idx += 1

        cap.release()
        out.release()
        return output_path


# Standalone function for compatibility with main.py
def create_annotated_video_with_analysis(input_path, output_path, pose_data, shot_events):
    """
    Wrapper function that creates annotated video using pose_data and shot_events.
    This matches the interface expected by main.py
    """
    from video_processing import draw_skeleton_on_frame

    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        print(f"Error: Could not open video {input_path}")
        return None

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    if fps == 0:
        fps = 30  # Default fallback

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    # Map frame numbers to shots for quick lookup
    shot_map = {shot['frame']: shot for shot in shot_events}

    frame_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Get pose for this frame
        pose = pose_data[frame_idx] if frame_idx < len(pose_data) else None

        # Check if this frame has a shot event (with 30 frame window)
        current_shot = None
        for shot_frame in shot_map:
            if 0 <= frame_idx - shot_frame < 30:
                current_shot = shot_map[shot_frame]
                break

        # Draw skeleton if pose data exists
        if pose:
            is_good_form = True
            if current_shot and current_shot.get('pose_errors'):
                is_good_form = False

            frame = draw_skeleton_on_frame(frame, pose, None, is_good_form)

        # Add shot information overlay
        if current_shot:
            shot_type = current_shot.get('shot_type', 'SHOT')
            cv2.putText(frame, f"SHOT: {shot_type}", (20, 50),
                       cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 255), 2)

            # Show errors or good form message
            if current_shot.get('pose_errors'):
                y_pos = 100
                for error in current_shot['pose_errors'][:3]:  # Max 3 errors
                    cv2.putText(frame, f"FIX: {error}", (20, y_pos),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                    y_pos += 30
            else:
                cv2.putText(frame, "GOOD FORM", (20, 100),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

        # Frame counter
        cv2.putText(frame, f"Frame: {frame_idx}", (width - 150, height - 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)

        out.write(frame)
        frame_idx += 1

    cap.release()
    out.release()
    print(f"Annotated video created: {output_path}")
    return output_path
