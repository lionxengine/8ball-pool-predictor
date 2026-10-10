@echo off
echo ====================================================
echo LionX-Engine Compiler Script
echo ====================================================
echo.

set "NDK_PATH=C:\Users\Toshiba\AppData\Local\Android\Sdk\ndk\29.0.14033849"
if not exist "%NDK_PATH%" (
    set "NDK_PATH=C:\Users\Toshiba\AppData\Local\Android\Sdk\ndk\28.2.13676358"
)
if not exist "%NDK_PATH%" (
    set "NDK_PATH=C:\Users\Toshiba\AppData\Local\Android\Sdk\ndk\24.0.8215888"
)

if not exist "%NDK_PATH%" (
    echo [ERROR] Android NDK not found!
    echo Checked paths under C:\Users\Toshiba\AppData\Local\Android\Sdk\ndk
    echo Please make sure Android SDK and NDK are installed.
    pause
    exit /b 1
)

echo Using NDK: %NDK_PATH%
echo Compiling source code...
echo.

call "%NDK_PATH%\ndk-build.cmd" -C "app\src\main" -j8 -B

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Compilation failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo Copying library.so to project root...
copy "app\src\main\libs\arm64-v8a\libgdtgos.so" "library.so" /Y

echo.
echo ====================================================
echo Build Successful! library.so is ready in root folder.
echo ====================================================
echo.
pause
