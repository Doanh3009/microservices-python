@echo off
title Microservice Launcher
echo ============================================
echo 🚀 Starting All Flask Microservices
echo ============================================
echo.

REM === Kích hoạt môi trường ảo (nếu có) ===
set VENV_PATH=C:\Users\Dell\foodfast\venv\Scripts\activate

REM === Kiểm tra file venv có tồn tại không ===
if not exist "%VENV_PATH%" (
    echo ⚠️ Không tìm thấy môi trường ảo .venv, vui lòng kiểm tra lại!
    pause
    exit /b
)

REM === Khởi động từng service trong cửa sổ riêng ===
echo 🔹 Starting User Service (port 5001)...
start cmd /k "cd C:\Users\Dell\foodfast\users && call %VENV_PATH% && python users.py"

echo 🔹 Starting Product Service (port 5003)...
start cmd /k "cd C:\Users\Dell\foodfast\orders && call %VENV_PATH% && python orders.py"

echo 🔹 Starting Order Service (port 5002)...
start cmd /k "cd C:\Users\Dell\foodfast\products && call %VENV_PATH% && python products.py"

echo 🔹 Starting Payment Service (port 5004)...
start cmd /k "cd C:\Users\Dell\foodfast\payments && call %VENV_PATH% && python payments.py"

echo.
echo ✅ Tất cả các service đã được khởi động trong các cửa sổ riêng biệt!
echo.
pause
