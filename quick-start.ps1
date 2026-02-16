# Script de Inicio Rápido - NEXUS IT
# Ejecutar: .\quick-start.ps1

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  NEXUS IT - Inicio Rápido" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Verificar Node.js
Write-Host "Verificando Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Node.js no está instalado" -ForegroundColor Red
    Write-Host "  Descarga desde: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}
Write-Host "✓ Node.js $nodeVersion" -ForegroundColor Green

# Verificar npm
$npmVersion = npm --version 2>$null
Write-Host "✓ npm $npmVersion" -ForegroundColor Green
Write-Host ""

# Instalar dependencias raíz
Write-Host "Instalando dependencias del proyecto..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Error instalando dependencias" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Dependencias instaladas" -ForegroundColor Green
Write-Host ""

# Compilar paquete shared
Write-Host "Compilando paquete compartido..." -ForegroundColor Yellow
Set-Location packages\shared
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Error compilando paquete shared" -ForegroundColor Red
    Set-Location ..\..
    exit 1
}
Set-Location ..\..
Write-Host "✓ Paquete compartido compilado" -ForegroundColor Green
Write-Host ""

# Menú de opciones
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  ¿Qué deseas ejecutar?" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Desktop (Electron + React)" -ForegroundColor White
Write-Host "2. Mobile (Expo + React Native)" -ForegroundColor White
Write-Host "3. Ambas aplicaciones" -ForegroundColor White
Write-Host "4. Salir" -ForegroundColor White
Write-Host ""

$option = Read-Host "Selecciona opción (1-4)"

switch ($option) {
    "1" {
        Write-Host ""
        Write-Host "Iniciando aplicación Desktop..." -ForegroundColor Yellow
        Write-Host ""
        Set-Location apps\desktop
        npm run dev
        Set-Location ..\..
    }
    "2" {
        Write-Host ""
        Write-Host "Iniciando aplicación Mobile..." -ForegroundColor Yellow
        Write-Host "Escanea el QR con Expo Go en tu celular" -ForegroundColor Cyan
        Write-Host ""
        Set-Location apps\mobile
        npm start
        Set-Location ..\..
    }
    "3" {
        Write-Host ""
        Write-Host "Iniciando ambas aplicaciones..." -ForegroundColor Yellow
        Write-Host ""
        
        # Ejecutar desktop en background
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\apps\desktop'; npm run dev"
        
        # Ejecutar mobile en esta terminal
        Set-Location apps\mobile
        npm start
        Set-Location ..\..
    }
    "4" {
        Write-Host "Saliendo..." -ForegroundColor Yellow
        exit 0
    }
    default {
        Write-Host "Opción inválida" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Gracias por usar NEXUS IT" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
