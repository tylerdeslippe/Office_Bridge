# Office Bridge - Field to Office Management System

A comprehensive construction management platform bridging field operations with office decision-making.

## Quick Start (Windows Commands)

Open PowerShell or Command Prompt and run these commands:

```cmd
:: Create project structure
cd C:\Users\TylerDeslippe\Documents\Office_Bridge

:: Create all directories
mkdir backend\src\routes
mkdir backend\src\models
mkdir backend\src\middleware
mkdir backend\src\controllers
mkdir backend\src\services
mkdir backend\src\config
mkdir backend\uploads\photos
mkdir backend\uploads\documents
mkdir frontend\src\components\common
mkdir frontend\src\components\layout
mkdir frontend\src\components\modules
mkdir frontend\src\pages
mkdir frontend\src\hooks
mkdir frontend\src\services
mkdir frontend\src\context
mkdir frontend\src\styles
mkdir frontend\public
mkdir database\migrations
mkdir database\seeds
```

## Project Structure

```
Office_Bridge/
├── backend/
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   ├── models/          # Database models
│   │   ├── middleware/      # Auth, upload, validation
│   │   ├── controllers/     # Business logic
│   │   ├── services/        # External services
│   │   └── config/          # Configuration
│   ├── uploads/             # File storage
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Main views
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API calls
│   │   ├── context/         # Global state
│   │   └── styles/          # CSS/styling
│   ├── public/
│   └── package.json
└── database/
    ├── migrations/          # Schema changes
    └── seeds/               # Initial data
```

## Core Roles

| Role | Access Level | Primary Functions |
|------|--------------|-------------------|
| **Project Manager** | Full | All features, assign tasks, approve changes |
| **Superintendent** | High | Daily reports, crew management, decisions |
| **Foreman** | Field | Daily reports, photos, time entry |
| **Project Engineer** | Office | RFIs, submittals, document control |
| **Accounting** | Finance | Job costing, invoicing, change orders |
| **Logistics** | Materials | Deliveries, material tracking, look-ahead |
| **Document Controller** | Documents | Drawings, specs, redlines, revisions |
| **Service Dispatcher** | Service | Work orders, scheduling, assignments |

## Core Modules

### 1. Daily Field Reporting
- Crew count by cost code
- Work installed (quantities/areas)
- Delays and constraints
- Deliveries received
- Progress photos with annotations

### 2. Time & Cost Tracking
- Cost code enforcement (no "misc")
- Split day entries
- Budget vs actual tracking
- Labor productivity metrics

### 3. Change Management Pipeline
- Potential change capture (field)
- Pricing and schedule impact (office)
- Tracking: Pending → Submitted → Approved

### 4. RFI Workflow
- Field submission with photos/markups
- Office routing and tracking
- Response time monitoring
- Decision push to field

### 5. Photo Documentation
- In-wall/above-ceiling
- Equipment tags/serials
- Delivery condition
- Milestone progress
- Organized by date + area

### 6. Materials & Logistics
- 2-6 week look-ahead
- Delivery calendar
- Receiving verification
- Shortage/damage escalation

### 7. Task Management
- Assignable todo lists
- Task acknowledgment
- Due date tracking
- Role-based visibility

### 8. Document Control
- Drawing management with revisions
- Spec tracking
- Redline workflow
- Transmittal logging

### 9. Decision Log
- Who approved what
- Date and context
- Cost/schedule/quality impacts

### 10. Quality & Punch List
- Stage checklists
- Punch items with photos
- Responsible party assignment
- Closure rate tracking

## Tech Stack

- **Frontend**: React + Tailwind CSS (Mobile-first for iPhone)
- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **File Storage**: Local (can migrate to S3)
- **Auth**: JWT tokens

## Installation

### Backend Setup
```cmd
cd C:\Users\TylerDeslippe\Documents\Office_Bridge\backend
npm install
copy .env.example .env
:: Edit .env with your database credentials
npm run migrate
npm run seed
npm run dev
```

### Frontend Setup
```cmd
cd C:\Users\TylerDeslippe\Documents\Office_Bridge\frontend
npm install
npm start
```

## Environment Variables

Create `backend/.env`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/office_bridge
JWT_SECRET=your-secret-key-here
PORT=3001
UPLOAD_DIR=./uploads
```

## API Endpoints Overview

```
/api/auth/*           - Authentication
/api/users/*          - User management
/api/projects/*       - Project CRUD
/api/daily-reports/*  - Daily field reports
/api/photos/*         - Photo upload/annotation
/api/rfis/*           - RFI workflow
/api/changes/*        - Change management
/api/tasks/*          - Task assignment
/api/timecards/*      - Time entry
/api/documents/*      - Document control
/api/materials/*      - Material tracking
/api/punch-list/*     - Quality/punch items
/api/decisions/*      - Decision log
```
