@echo off
echo ========================================
echo Gym Hunter - Setup Script
echo ========================================
echo.

set GCLOUD="%LOCALAPPDATA%\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"

echo [1/4] Setting project...
%GCLOUD% config set project your-coach-plus

echo.
echo [2/4] Logging in (browser will open)...
%GCLOUD% auth login

echo.
echo [3/4] Setting application default credentials...
%GCLOUD% auth application-default login

echo.
echo [4/4] Enabling Vertex AI API...
%GCLOUD% services enable aiplatform.googleapis.com --project=your-coach-plus

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next: Add your Maps API key to .env file
echo.
pause
