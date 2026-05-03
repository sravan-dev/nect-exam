@echo off
echo Building NECT Exam...

call npm run build
if %errorlevel% neq 0 (
    echo BUILD FAILED
    pause
    exit /b 1
)

echo Cleaning build folder...
if exist build rmdir /s /q build
mkdir build

echo Copying files...
xcopy /e /i /q dist\* build\
xcopy /e /i /q api build\api\
copy /y .htaccess build\.htaccess
mkdir build\uploads

echo Writing assets\.htaccess...
(
    echo RewriteEngine Off
    echo ^<FilesMatch "\.js$"^>
    echo     ForceType application/javascript
    echo ^</FilesMatch^>
    echo ^<FilesMatch "\.css$"^>
    echo     ForceType text/css
    echo ^</FilesMatch^>
) > build\assets\.htaccess

echo.
echo Done! Upload build\ contents to public_html\
pause
