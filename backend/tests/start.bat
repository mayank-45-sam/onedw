@echo off
echo ================================
echo   STARTING ONEDW FULL STACK
echo ================================

cd /d "C:\Users\mayan\Desktop\boltnew ondw\backend"

echo.
echo Activating virtual environment...
call .venv\Scripts\activate

echo.
echo Installing dependencies (safe)...
pip install -r requirements.txt

echo.
echo Running migrations...
python -m alembic upgrade head

echo.
echo Seeding database...
python -m app.seeds.seed_marketplace

echo.
echo Starting backend server...
start cmd /k "cd /d C:\Users\mayan\Desktop\boltnew ondw\backend && .venv\Scripts\activate && uvicorn main:app --reload"

echo.
echo Starting frontend...
cd /d "C:\Users\mayan\Desktop\boltnew ondw"
start cmd /k "npm install && npm run dev"

echo.
echo ================================
echo   ALL SERVICES STARTED
echo ================================
pause