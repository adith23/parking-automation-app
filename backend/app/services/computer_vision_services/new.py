import cv2
import numpy as np
import time
import os
import sys

# --- Load image ---
img_path = os.path.abspath("Screenshot (9).png")
img = cv2.imread(img_path)

if img is None:
    print(f"❌ Image not found: {img_path}")
    sys.exit(1)

points = []
window_name = "Select 4 Points (Top-left → Bottom-left)"

def select_points(event, x, y, flags, param):
    if event == cv2.EVENT_LBUTTONDOWN:
        points.append((x, y))
        print(f"✅ Point selected: ({x}, {y})")
        cv2.circle(param, (x, y), 5, (0, 255, 0), -1)
        cv2.imshow(window_name, param)

# --- Create a named window before attaching callback ---
cv2.startWindowThread()
cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)

# Try repeatedly until window exists
for _ in range(10):
    try:
        cv2.imshow(window_name, img)
        cv2.setMouseCallback(window_name, select_points, img)
        break
    except cv2.error:
        time.sleep(0.1)
else:
    print("❌ Failed to create OpenCV window. Try running in normal desktop terminal.")
    sys.exit(1)

print("🖱️ Click 4 corners in order:")
print("1️⃣ Top-left\n2️⃣ Top-right\n3️⃣ Bottom-right\n4️⃣ Bottom-left")
print("Press ESC anytime to cancel.")

# --- Wait for selection ---
while True:
    cv2.imshow(window_name, img)
    key = cv2.waitKey(1) & 0xFF
    if len(points) == 4:
        print("✅ Selected points:", points)
        break
    if key == 27:  # ESC key
        print("❌ Cancelled.")
        cv2.destroyAllWindows()
        sys.exit(0)

cv2.destroyAllWindows()

# --- Homography ---
src_points = np.float32(points)
width, height = 800, 600
dst_points = np.float32([
    [0, 0],
    [width - 1, 0],
    [width - 1, height - 1],
    [0, height - 1]
])

H, _ = cv2.findHomography(src_points, dst_points)
birdseye = cv2.warpPerspective(img, H, (width, height))

cv2.imshow("Original", img)
cv2.imshow("Bird's Eye View", birdseye)
cv2.waitKey(0)
cv2.destroyAllWindows()
