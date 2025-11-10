# python app/services/define_parking_slots.py
import cv2
import json
import numpy as np
import os # Import the os module for robust path handling

# --- Configuration ---
# Get the directory where this script is located
script_dir = os.path.dirname(os.path.abspath(__file__))

# Build robust paths relative to this script's location
# Video is in 'backend/', script is in 'backend/app/services/'
VIDEO_SOURCE = os.path.join(script_dir, '..', '..', 'sample_video3.mp4')
# Save the slots file in the 'backend/' directory
SLOTS_FILE = os.path.join(script_dir, '..', '..', 'parking_slots.json')
WINDOW_NAME = 'Define Parking Slots'

# --- Global Variables ---
points = []
polygons = [] # Will store polygons as list of numpy arrays (for drawing)
geojson_features = [] # Will store the full GeoJSON features (for saving/loading)

def load_slots():
    """Loads existing slots from the GeoJSON file."""
    global polygons, geojson_features
    try:
        with open(SLOTS_FILE, 'r') as f:
            feature_collection = json.load(f)
            if feature_collection.get('type') == 'FeatureCollection':
                geojson_features = feature_collection.get('features', [])
                polygons = []
                for feature in geojson_features:
                    if feature.get('geometry', {}).get('type') == 'Polygon':
                        # Convert GeoJSON coordinates back to numpy array for OpenCV drawing
                        # GeoJSON coordinates are [ [[x,y], [x,y], ...]] for a single polygon
                        coords = feature['geometry']['coordinates'][0] 
                        polygons.append(np.array(coords, np.int32).reshape((-1, 1, 2)))
                print(f"✅ Loaded {len(polygons)} existing parking slots from GeoJSON.")
            else:
                print("⚠️ Loaded JSON is not a valid FeatureCollection. Starting fresh.")
                geojson_features = []
                polygons = []
    except FileNotFoundError:
        print("ℹ️ No existing GeoJSON slots file found. Starting fresh.")
        geojson_features = []
        polygons = []
    except json.JSONDecodeError:
        print("⚠️ Could not decode GeoJSON file. Starting fresh.")
        geojson_features = []
        polygons = []
    except Exception as e:
        print(f"⚠️ Error loading GeoJSON slots: {e}. Starting fresh.")
        geojson_features = []
        polygons = []

def save_slots():
    """Saves the current list of polygons to the GeoJSON file."""
    global polygons, geojson_features
    # Rebuild geojson_features from current polygons list for saving
    new_geojson_features = []
    for i, poly_np_array in enumerate(polygons):
        # Convert numpy array back to list of lists for GeoJSON
        coords_list = poly_np_array.reshape(-1, 2).tolist()
        
        # GeoJSON polygons require the first and last coordinate to be identical to close the loop.
        # Ensure this, as `cv2.polylines` with `isClosed=True` handles this internally for drawing
        # but GeoJSON specification often expects it explicitly.
        if coords_list and coords_list[0] != coords_list[-1]:
            coords_list.append(coords_list[0])

        feature = {
            "type": "Feature",
            "properties": {
                "slot_number": f"Slot {i+1}",
                "parking_lot_id": "PLACEHOLDER_LOT_ID", # This would be filled by your backend
                "status": "available" # Default status, backend will manage
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [coords_list] # GeoJSON standard is [ [ [x,y], [x,y], ...] ]
            }
        }
        new_geojson_features.append(feature)
    
    feature_collection = {
        "type": "FeatureCollection",
        "features": new_geojson_features
    }

    with open(SLOTS_FILE, 'w') as f:
        json.dump(feature_collection, f, indent=4)
    print(f"✅ Saved {len(polygons)} slots to {SLOTS_FILE} in GeoJSON format.")

def mouse_callback(event, x, y, flags, param):
    """Handles mouse clicks to define polygon points."""
    global points
    if event == cv2.EVENT_LBUTTONDOWN:
        points.append([x, y])
        print(f"Point added: ({x}, {y}). Total points: {len(points)}")

def draw_elements(frame):
    """Draws all defined polygons and the current set of points."""
    # Draw existing polygons
    for polygon_np in polygons: # polygons is now a list of numpy arrays
        cv2.polylines(frame, [polygon_np], isClosed=True, color=(0, 255, 0), thickness=2)

    # Draw the points for the polygon currently being defined
    for point in points:
        cv2.circle(frame, tuple(point), 5, (0, 0, 255), -1)

    # Draw lines connecting the current points
    if len(points) > 1:
        for i in range(len(points) - 1):
            cv2.line(frame, tuple(points[i]), tuple(points[i+1]), (0, 0, 255), 2)

    return frame

def main():
    """Main loop to capture points and define slots."""
    global points, polygons
    cap = cv2.VideoCapture(VIDEO_SOURCE)
    if not cap.isOpened():
        print(f"Error: Cannot open video {VIDEO_SOURCE}")
        return

    ret, frame = cap.read()
    if not ret:
        print("Error: Cannot read the first frame.")
        return
    
    load_slots() # Load any previously defined slots
    
    cv2.namedWindow(WINDOW_NAME)
    cv2.setMouseCallback(WINDOW_NAME, mouse_callback)

    print("\n--- Instructions ---")
    print("1. Click to define the corners of a parking slot.")
    print("2. Press 's' to SAVE the current slot polygon.")
    print("3. Press 'd' to DELETE the last saved slot.")
    print("4. Press 'r' to RESET the current points.")
    print("5. Press 'q' to QUIT and save all slots.")
    print("--------------------\n")

    while True:
        # Create a fresh copy of the frame for drawing
        display_frame = frame.copy()
        display_frame = draw_elements(display_frame)
        cv2.imshow(WINDOW_NAME, display_frame)
        
        key = cv2.waitKey(1) & 0xFF

        if key == ord('s'): # Save current polygon
            if len(points) > 2: # GeoJSON polygons need at least 3 distinct points (4 total, as first=last)
                polygons.append(np.array(points, np.int32).reshape((-1, 1, 2))) # Store as numpy array for drawing
                print(f"Polygon saved. Total slots: {len(polygons)}")
                points = [] # Reset for the next polygon
            else:
                print("⚠️ Need at least 3 points to define a slot polygon.")
        
        elif key == ord('d'): # Delete last saved polygon
            if polygons:
                polygons.pop()
                print("Last saved slot deleted.")
            else:
                print("No slots to delete.")

        elif key == ord('r'): # Reset current points
            points = []
            print("Current points reset.")
        
        elif key == ord('q'): # Quit
            save_slots()
            break
            
    cap.release()
    cv2.destroyAllWindows()

if __name__ == '__main__':
    main()