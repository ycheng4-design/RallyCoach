import cv2
import numpy as np


def track_shuttlecock(frames):
    """
    Track shuttlecock across video frames using color-based detection.

    Args:
        frames: List of video frames

    Returns:
        List of (x, y) positions or None per frame
    """
    shuttle_positions = []

    for frame in frames:
        position = detect_shuttlecock_in_frame(frame)
        shuttle_positions.append(position)

    return shuttle_positions


def detect_shuttlecock_in_frame(frame):
    """
    Detect shuttlecock in a single frame using color filtering and blob detection.

    The shuttlecock is typically white, so we look for white circular objects.

    Args:
        frame: Video frame (BGR)

    Returns:
        (x, y) tuple of shuttlecock center, or None if not detected
    """
    # Convert to HSV for better color detection
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)

    # Define range for white color (shuttlecock is usually white)
    lower_white = np.array([0, 0, 200])
    upper_white = np.array([180, 30, 255])

    # Create mask
    mask = cv2.inRange(hsv, lower_white, upper_white)

    # Apply morphological operations to reduce noise
    kernel = np.ones((5, 5), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

    # Find contours
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        return None

    # Find the smallest contour (shuttlecock is small)
    # Filter by area (shuttlecock should be between certain pixel sizes)
    valid_contours = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if 20 < area < 500:  # Adjust based on video resolution
            # Check if roughly circular
            perimeter = cv2.arcLength(contour, True)
            if perimeter > 0:
                circularity = 4 * np.pi * area / (perimeter * perimeter)
                if circularity > 0.5:  # Somewhat circular
                    valid_contours.append(contour)

    if not valid_contours:
        return None

    # Get the contour with smallest area (likely shuttlecock)
    shuttle_contour = min(valid_contours, key=cv2.contourArea)

    # Get center point
    M = cv2.moments(shuttle_contour)
    if M["m00"] != 0:
        cx = int(M["m10"] / M["m00"])
        cy = int(M["m01"] / M["m00"])
        return (cx, cy)

    return None


def analyze_shuttle_trajectory(shuttle_positions):
    """
    Analyze shuttlecock trajectory for shot detection.

    Args:
        shuttle_positions: List of (x, y) positions per frame

    Returns:
        Dict with trajectory info (direction changes, speed, etc.)
    """
    trajectory_info = {
        "direction_changes": [],
        "avg_speed": 0,
        "max_speed": 0
    }

    if not shuttle_positions or len(shuttle_positions) < 3:
        return trajectory_info

    # Calculate velocities
    velocities = []
    for i in range(1, len(shuttle_positions)):
        if shuttle_positions[i] and shuttle_positions[i-1]:
            dx = shuttle_positions[i][0] - shuttle_positions[i-1][0]
            dy = shuttle_positions[i][1] - shuttle_positions[i-1][1]
            speed = np.hypot(dx, dy)
            velocities.append((dx, dy, speed))
        else:
            velocities.append(None)

    # Detect direction changes (potential shot moments)
    for i in range(1, len(velocities) - 1):
        if velocities[i] and velocities[i-1] and velocities[i+1]:
            # Check if vertical direction changes (going up then down, or vice versa)
            dy_before = velocities[i-1][1]
            dy_after = velocities[i+1][1]

            if dy_before * dy_after < 0:  # Sign change
                trajectory_info["direction_changes"].append(i)

    # Calculate speed stats
    valid_speeds = [v[2] for v in velocities if v]
    if valid_speeds:
        trajectory_info["avg_speed"] = np.mean(valid_speeds)
        trajectory_info["max_speed"] = np.max(valid_speeds)

    return trajectory_info


def draw_shuttlecock_trail(frame, shuttle_positions, current_idx, trail_length=10):
    """
    Draw shuttlecock trail on frame.

    Args:
        frame: Video frame
        shuttle_positions: All shuttle positions
        current_idx: Current frame index
        trail_length: Number of past positions to show

    Returns:
        Frame with trail drawn
    """
    annotated = frame.copy()

    start_idx = max(0, current_idx - trail_length)
    trail = shuttle_positions[start_idx:current_idx + 1]

    # Draw trail
    for i in range(len(trail) - 1):
        if trail[i] and trail[i+1]:
            # Fade color from old (dim) to new (bright)
            alpha = i / len(trail)
            color = (0, int(255 * alpha), int(255 * alpha))
            cv2.line(annotated, trail[i], trail[i+1], color, 2)

    # Draw current position
    if current_idx < len(shuttle_positions) and shuttle_positions[current_idx]:
        cv2.circle(annotated, shuttle_positions[current_idx], 5, (0, 255, 255), -1)
        cv2.circle(annotated, shuttle_positions[current_idx], 7, (255, 255, 255), 2)

    return annotated
