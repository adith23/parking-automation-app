<div align="center">

# 🅿️ EasyPark — Smart Parking Automation Platform

**AI-powered parking management with real-time computer vision, license plate recognition, and automated session tracking.**

[![Built with FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![React Native](https://img.shields.io/badge/Mobile-React%20Native-61DAFB?logo=react)](https://reactnative.dev/)
[![YOLO](https://img.shields.io/badge/CV-YOLOv11-purple)](https://docs.ultralytics.com/)
[![AWS](https://img.shields.io/badge/Cloud-AWS-FF9900?logo=amazonaws)](https://aws.amazon.com/)

</div>

---

## 📖 Overview

EasyPark is a full-stack smart parking platform that automates parking lot operations using **computer vision** and **license plate recognition (LPR)**. It replaces manual parking management with an intelligent system that:

- **Detects vehicles in real-time** using YOLO object detection on parking lot camera feeds
- **Reads license plates automatically** via EasyOCR with fuzzy matching to identify registered vehicles
- **Tracks slot occupancy** and pushes live availability updates to mobile apps via Socket.IO
- **Automates parking sessions** — drivers are checked in/out automatically when their vehicle is detected entering or leaving a slot

The system serves two user types through separate mobile apps: **Drivers** (search, book, and park) and **Parking Lot Owners** (register lots, monitor via live camera, view analytics).

---

## ✨ Features

### For Drivers

- 📍 **GPS-based parking search** — Find nearby lots within walking distance using PostGIS geo-queries
- 🔖 **Two-phase booking** — Reserve a slot with Redis-based optimistic locking to prevent double-booking
- 🚗 **Auto check-in/check-out** — License plate detected on arrival creates a session automatically
- 📊 **Session history & cost tracking** — View parking duration and costs in real-time

### For Parking Lot Owners

- 🏗️ **Lot management** — Register lots with GPS location, pricing, operating hours, and photos
- 🎯 **Visual slot definition** — Draw parking slot polygons on camera images
- 📹 **Live camera feed** — Watch lot activity via WebRTC video streaming with CV annotations
- 📈 **Revenue analytics** — Weekly/monthly/annual booking and subscription revenue dashboards
- 💳 **Subscription plans** — Create tiered plans (Basic/Premium/Enterprise) for recurring parkers

### Computer Vision Pipeline

- 🧠 **YOLO 11 + ByteTrack** — Multi-object vehicle tracking with persistent IDs across frames
- 🔤 **Custom fine-tuned LPR model** — Detects license plates, EasyOCR reads the text
- 🔄 **Frame threshold debouncing** — 3-frame threshold prevents status flickering
- 📡 **Real-time slot updates** — Status changes published via Redis Pub/Sub → Socket.IO to apps

---

## 🛠️ Tech Stack

| Layer               | Technology                                                 |
| ------------------- | ---------------------------------------------------------- |
| **Backend API**     | Python 3.10, FastAPI, SQLAlchemy 2.0, Pydantic v2, Uvicorn |
| **Database**        | PostgreSQL + PostGIS (GeoAlchemy2)                         |
| **Cache / Pub-Sub** | Redis 7.0 (geo indexing, slot availability, booking locks) |
| **Real-time**       | Socket.IO (python-socketio), WebRTC (aiortc)               |
| **Computer Vision** | YOLOv11 (Ultralytics), EasyOCR, OpenCV, ByteTrack, SciPy   |
| **Deep Learning**   | PyTorch 2.3.1, CUDA 12.4 + cuDNN (GPU worker)              |
| **Mobile Apps**     | React Native 0.79, Expo SDK 53, Expo Router 5              |
| **Maps & Location** | Google Maps SDK (react-native-maps), expo-location         |
| **Auth**            | JWT (python-jose) + bcrypt, OTP via Twilio                 |
| **Cloud (AWS)**     | ECS, ECR, ALB, RDS, ElastiCache, SQS, S3, Secrets Manager  |
| **CI/CD**           | GitHub Actions → Docker → ECR                              |
| **OCR Fallback**    | Google Cloud Vision API                                    |

---

## 📸 Demo / Screenshots

> **Note:** Add screenshots of the Driver App (map search, booking flow) and Owner App (dashboard, live view, analytics) here.

```
screenshots/
├── driver-map-search.png
├── driver-booking-flow.png
├── owner-dashboard.png
├── owner-live-view.png
├── owner-analytics.png
└── cv-detection-demo.gif
```

|                    Driver App                    |                   Owner App                   |
| :----------------------------------------------: | :-------------------------------------------: |
| ![Map Search](screenshots/driver-map-search.png) |   ![Dashboard](screenshots/owner-home.png)    |
|     ![Booking](screenshots/driver-home.png)      | ![Live View](screenshots/owner-analytics.png) |

---

## ⚙️ Installation

### Prerequisites

- **Python 3.10+** (backend)
- **Node.js 18+** and **npm** (mobile apps)
- **PostgreSQL 14+** with PostGIS extension
- **Redis 7+**
- **Android Studio** (for mobile emulator)
- **NVIDIA GPU + CUDA 12.4** (optional, for CV worker GPU inference)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/parking-automation-app.git
cd parking-automation-app
```

### 2. Backend Setup

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\Activate.ps1

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

### 3. Driver App Setup

```bash
cd driver-app
npm install
```

### 4. Owner App Setup

```bash
cd owner-app
npm install
```

### 5. CV Worker Setup (GPU)

```bash
cd cv_worker
python -m venv .venv

# Activate venv, then:
pip install -r requirements.txt
```

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

```env
# Database
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/ParkingSystem

# JWT
JWT_SECRET_KEY=your-secret-key-here

# Redis
REDIS_URL=redis://localhost:6379/0

# API Config
API_V1_PREFIX=/api/v1
PROJECT_NAME=Parking Automation API
LOG_LEVEL=INFO

# Google Cloud Vision (optional OCR fallback)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json

# Twilio OTP (optional)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# AWS (production only)
SECRETS_ARN=arn:aws:secretsmanager:us-east-1:...
AWS_REGION=us-east-1
```

### Driver App (`driver-app/.env`)

```env
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### Owner App (`owner-app/.env`)

```env
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### CV Worker (environment variables)

```env
SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/...
AWS_REGION=us-east-1
MODELS_S3_URI=s3://your-models-bucket/production/
```

---

## 🚀 How to Run

### Backend (Development)

```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs available at: `http://localhost:8000/docs`

### Driver App

```bash
cd driver-app
npx expo start
```

> Update `BASE_URL` in `driver-app/services/api.js` to your backend IP.

### Owner App

```bash
cd owner-app
npx expo start
```

> Update `BASE_URL` in `owner-app/services/api.js` to your backend IP.

### CV Worker (local testing)

```bash
cd cv_worker
python computer_vision_services/computer_vision_service.py
```

### Production (Docker)

```bash
# Backend
cd backend
docker build -t parking-api .
docker run -p 8000:8000 --env-file .env parking-api

# CV Worker (requires NVIDIA Docker runtime)
cd cv_worker
docker build -t parking-cv-worker .
docker run --gpus all --env-file .env parking-cv-worker
```

---

## 📱 Usage

### Driver Workflow

1. **Register/Login** → Create account with email and phone number
2. **Search Parking** → Map shows nearby available lots based on GPS location
3. **View Details** → Tap a lot to see pricing, available slots, operating hours
4. **Book a Slot** → Select a slot and confirm booking (60-second lock window)
5. **Drive & Park** → Camera detects your license plate and auto-creates a parking session
6. **Leave** → Camera detects departure, session ends, and cost is calculated

### Owner Workflow

1. **Register/Login** → Create owner account
2. **Add Parking Lot** → Set name, address, GPS location, pricing, and operating hours
3. **Define Slots** → Draw slot polygons on the camera feed image
4. **Monitor Live** → Watch real-time WebRTC camera feed with CV annotations
5. **Manage Bookings** → View incoming reservations for your lots
6. **View Analytics** → Track revenue, occupancy trends, and subscription metrics

---

## 📁 Project Structure

```
parking-automation-app/
├── backend/                        # FastAPI REST API + WebRTC + Socket.IO
│   ├── app/
│   │   ├── api/v1/
│   │   │   └── endpoints/
│   │   │       ├── driver/         # Auth, search, booking, session routes
│   │   │       └── owner/          # Auth, lots, slots, analytics, subscriptions, live view
│   │   ├── core/                   # Config, database, JWT, Redis, Socket.IO manager
│   │   ├── models/
│   │   │   ├── driver_models/      # Driver, Vehicle, Booking, ParkingSession
│   │   │   └── owner_models/       # Owner, ParkingLot, ParkingSlot, Subscription
│   │   ├── schemas/                # Pydantic request/response schemas
│   │   ├── services/               # Business logic (booking, session, search, analytics, CV, WebRTC)
│   │   └── utils/
│   ├── assets/                     # Sample videos, YOLO model weights
│   ├── Dockerfile
│   └── requirements.txt
│
├── cv_worker/                      # GPU-accelerated computer vision worker
│   ├── computer_vision_services/
│   │   ├── computer_vision_service.py   # YOLO + EasyOCR + slot occupancy logic
│   │   ├── define_parking_slots.py      # Slot polygon definition tool
│   │   ├── real_time_lpr.py             # Real-time license plate recognition
│   │   └── sort.py                      # SORT multi-object tracking
│   ├── main.py                     # SQS message polling loop
│   ├── entrypoint.sh               # S3 model sync on container startup
│   ├── Dockerfile                  # NVIDIA CUDA 12.4 base image
│   └── requirements.txt
│
├── driver-app/                     # React Native (Expo) — Driver mobile app
│   ├── app/
│   │   ├── (auth)/                 # Login, Signup screens
│   │   └── (tabs)/                 # Home (map search), Settings
│   ├── components/                 # ParkingMap, ParkingDetailCard, LocationSearch
│   ├── context/                    # AuthContext
│   ├── services/                   # API client, auth service, location, search
│   └── package.json
│
├── owner-app/                      # React Native (Expo) — Owner mobile app
│   ├── app/
│   │   ├── (auth)/                 # Launch, Login, Signup screens
│   │   ├── (tabs)/                 # Home, ManageLots, Bookings, Analytics, Settings
│   │   └── (screens)/             # AddLot, EditLot, LiveView, SlotDefinition, Subscriptions
│   ├── components/                 # BookingCard, WebRTCVideoStream, LocationPickerModal
│   ├── context/                    # AuthContext, LoadingContext, ThemeContext
│   ├── services/                   # API client, auth service
│   └── package.json
│
├── .github/workflows/              # CI/CD: Build & push Docker images to ECR
└── README.md
```

---

## 🔌 API Details

**Base URL:** `/api/v1`  
**Auth:** Bearer JWT token in `Authorization` header  
**Docs:** FastAPI auto-generated at `/docs` (Swagger UI)

### Driver Endpoints

| Method | Endpoint                            | Auth | Description                              |
| ------ | ----------------------------------- | :--: | ---------------------------------------- |
| `POST` | `/driver/register/`                 |  ✗   | Register new driver                      |
| `POST` | `/driver/login/`                    |  ✗   | Login, returns JWT                       |
| `GET`  | `/driver/me/`                       |  ✓   | Get current driver profile               |
| `GET`  | `/driver/parking`                   |  ✓   | Search nearby parking (lat, lng, radius) |
| `GET`  | `/driver/parking/text`              |  ✓   | Text-based parking search                |
| `GET`  | `/driver/parking/{id}`              |  ✓   | Get lot details                          |
| `GET`  | `/driver/parking/{id}/availability` |  ✓   | Get slot availability                    |
| `POST` | `/driver/bookings`                  |  ✓   | Initiate booking (acquires Redis lock)   |
| `POST` | `/driver/bookings/{id}/confirm`     |  ✓   | Confirm booking                          |
| `POST` | `/driver/bookings/{id}/cancel`      |  ✓   | Cancel booking                           |
| `GET`  | `/driver/bookings`                  |  ✓   | List driver's bookings                   |
| `GET`  | `/driver/sessions`                  |  ✓   | List parking sessions                    |
| `GET`  | `/driver/sessions/active`           |  ✓   | List active sessions                     |
| `GET`  | `/driver/sessions/{id}`             |  ✓   | Get session details + cost               |

### Owner Endpoints

| Method  | Endpoint                                       | Auth | Description                     |
| ------- | ---------------------------------------------- | :--: | ------------------------------- |
| `POST`  | `/owner/register/`                             |  ✗   | Register new owner              |
| `POST`  | `/owner/login/`                                |  ✗   | Login, returns JWT              |
| `GET`   | `/owner/me/`                                   |  ✓   | Get current owner profile       |
| `PUT`   | `/owner/profile/`                              |  ✓   | Update profile                  |
| `POST`  | `/owner/send-otp/`                             |  ✓   | Send OTP for email/phone update |
| `POST`  | `/owner/verify-otp/`                           |  ✓   | Verify OTP and update           |
| `POST`  | `/owner/parking-lots/`                         |  ✓   | Create parking lot              |
| `GET`   | `/owner/parking-lots/`                         |  ✓   | List owner's lots               |
| `GET`   | `/owner/parking-lots/{id}`                     |  ✓   | Get lot details                 |
| `PUT`   | `/owner/parking-lots/{id}`                     |  ✓   | Update lot                      |
| `PATCH` | `/owner/parking-lots/{id}/status`              |  ✓   | Open/close lot                  |
| `POST`  | `/owner/slot-definitions/`                     |  ✓   | Define slot polygons            |
| `GET`   | `/owner/slot-definitions/{lot_id}`             |  ✓   | Get slot definitions            |
| `GET`   | `/owner/bookings/{lot_id}`                     |  ✓   | View lot bookings               |
| `GET`   | `/owner/analytics`                             |  ✓   | Revenue + booking analytics     |
| `GET`   | `/owner/analytics/summary`                     |  ✓   | Summary for today/all-time      |
| `CRUD`  | `/owner/subscription-plans/`                   |  ✓   | Full CRUD on subscription plans |
| `POST`  | `/owner/subscription-plans/{id}/activate`      |  ✓   | Activate plan                   |
| `GET`   | `/owner/subscription-plans/{id}/statistics`    |  ✓   | Plan stats + subscriber metrics |
| `GET`   | `/owner/subscription-plans/dashboard/overview` |  ✓   | Subscription dashboard          |
| `WS`    | `/owner/parking-lots-view/ws/{id}/live-view`   |  —   | WebRTC live camera feed         |

### System Endpoints

| Method | Endpoint                               | Description                         |
| ------ | -------------------------------------- | ----------------------------------- |
| `GET`  | `/health`                              | ALB health check                    |
| `GET`  | `/ready`                               | Readiness check (DB connectivity)   |
| `WS`   | `/ws/socket.io` (ns: `/driver-search`) | Real-time slot availability updates |

### Example: Search Nearby Parking

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:8000/api/v1/driver/parking?latitude=6.9271&longitude=79.8612&radius=500"
```

```json
[
  {
    "id": 1,
    "name": "City Center Parking",
    "address": "123 Main St",
    "total_slots": 50,
    "price_per_hour": 2.5,
    "distance_meters": 230.5,
    "is_open": true
  }
]
```

```
## 🏗️ Real-Time Communication Architecture

|                      Real-Time Communication Architecture                                 |
| :-------------------------------------------------------------------------------: |
|           ![Architecture Diagram](screenshots/architecture.png)                   |

```

### Real-Time Data Flow

```
Camera Feed → CV Worker (YOLO detect + OCR) → Redis Pub/Sub → Backend Listener
    → Update Redis availability hash → Socket.IO broadcast → Mobile Apps update UI
```

### Two-Phase Booking Flow

```
Driver taps "Book" → POST /bookings (Redis SETNX lock, 60s TTL)
    → Driver confirms → POST /bookings/{id}/confirm → Slot reserved
    → Lock expires if not confirmed → Slot released automatically
```

---

## 🗄️ Database Schema

|                 Database ER Schema                  |
| :-------------------------------------------------: |
| ![Database Schema](screenshots/database-schema.png) |

```

**Key relationships:**

- `ParkingLot` ↔ `SubscriptionPlan` — Many-to-many via `subscription_plan_lots`
- `ParkingSession` links to `Booking` (pre-booked) or is created as walk-in (booking_id = null)
- License plates are fuzzy-matched (Levenshtein distance < 2) to handle OCR errors

---

## 🌐 Deployment

### Live API

```

http://parking-app-alb-1557007686.us-east-1.elb.amazonaws.com/api/v1

````

### Deployment Platform

- **Backend API:** AWS ECS (Fargate) behind an Application Load Balancer
- **CV Worker:** AWS ECS with GPU instances (NVIDIA CUDA runtime)
- **Database:** AWS RDS (PostgreSQL with PostGIS)
- **Cache:** AWS ElastiCache (Redis with TLS)
- **Task Queue:** AWS SQS for CV job distribution
- **Models/Media:** AWS S3
- **Secrets:** AWS Secrets Manager (auto-loaded on startup)
- **Mobile Apps:** Built with EAS Build, distributed via APK/TestFlight

### CI/CD Pipeline

On push to `main`, GitHub Actions automatically:

1. Builds the backend Docker image (multi-stage, `python:3.10-slim`)
2. Tags with Git SHA
3. Pushes to AWS ECR (`parking-api-cv`)
4. ECS picks up the new image and deploys

---

## 🧪 Testing

### Backend

```bash
cd backend

# Run the API server and test via Swagger UI
python -m uvicorn app.main:app --reload

# Access interactive API docs
open http://localhost:8000/docs
````

### CV Worker (standalone test)

```bash
cd backend
python -m app.services.computer_vision_services.computer_vision_service
# Opens a window showing annotated video with slot detection
```

### Mobile Apps

```bash
cd driver-app   # or owner-app
npx expo start
# Press 'a' for Android emulator
```

> **Note:** Automated test suites (pytest, Jest) are planned for future development.

---

## 🔮 Future Improvements

1. **Payment integration** — Stripe/PayPal for booking payments and subscription billing
2. **Push notifications** — Alert drivers when their session is about to end or a booked slot becomes available
3. **Multi-camera support** — Support multiple camera angles per lot with merged slot tracking
4. **Review & rating system** — Allow drivers to rate parking lots (backend models are scaffolded)
5. **Automated test suites** — pytest for backend API, Jest + Detox for mobile end-to-end tests

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---
