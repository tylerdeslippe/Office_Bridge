@echo off
REM ========================================
REM Office Bridge - Project Setup Commands
REM Run this from: C:\Users\TylerDeslippe\Documents\Office_Bridge
REM ========================================

REM Create root project directory
cd C:\Users\TylerDeslippe\Documents
mkdir Office_Bridge
cd Office_Bridge

REM ========================================
REM BACKEND SETUP
REM ========================================
mkdir backend
cd backend

REM Create backend directory structure
mkdir app
mkdir app\api
mkdir app\api\routes
mkdir app\models
mkdir app\schemas
mkdir app\services
mkdir app\core
mkdir tests
mkdir uploads
mkdir uploads\photos
mkdir uploads\documents
mkdir uploads\drawings

REM Create Python virtual environment
python -m venv venv

REM Activate virtual environment (run this manually)
REM venv\Scripts\activate

REM After activating venv, install dependencies:
REM pip install -r requirements.txt

cd ..

REM ========================================
REM FRONTEND SETUP
REM ========================================
mkdir frontend
cd frontend

REM Create frontend directory structure
mkdir src
mkdir src\components
mkdir src\components\common
mkdir src\components\forms
mkdir src\components\layout
mkdir src\pages
mkdir src\contexts
mkdir src\hooks
mkdir src\utils
mkdir src\styles
mkdir public

REM Initialize React project (alternative: run npx create-react-app . --template typescript)
REM npm init -y
REM npm install react react-dom react-router-dom axios
REM npm install -D vite @vitejs/plugin-react typescript @types/react @types/react-dom

cd ..

echo.
echo ========================================
echo Setup complete! Next steps:
echo ========================================
echo 1. cd backend
echo 2. venv\Scripts\activate
echo 3. pip install -r requirements.txt
echo 4. cd ..\frontend
echo 5. npm install
echo 6. Start backend: cd backend ^& python -m uvicorn app.main:app --reload
echo 7. Start frontend: cd frontend ^& npm run dev
echo ========================================

pause
