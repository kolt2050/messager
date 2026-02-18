@echo off
cd /d "%~dp0"
echo Starting Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

echo Waiting for Docker to start...
:check_docker
docker info >nul 2>&1
if %errorlevel% equ 0 goto docker_ready

echo Docker is not ready yet...
timeout /t 5 >nul
goto check_docker

:docker_ready

echo Docker is ready!
echo Checking if Docker image exists...
docker inspect --type=image messager-client:latest >nul 2>&1
if %errorlevel% neq 0 (
    echo Image 'messager-client:latest' not found. Building...
    docker build -t messager-client:latest .
    if %errorlevel% neq 0 (
        echo Build failed!
        pause
        exit /b
    )
) else (
    echo Image 'messager-client:latest' found. Skipping build.
)

echo.
echo Build finished. Starting application...
echo Opening browser in 5 seconds...
start /b cmd /c "timeout /t 5 >nul & start http://localhost:3001"
docker-compose -f ../docker-compose.client.yml up -d --no-build

exit
