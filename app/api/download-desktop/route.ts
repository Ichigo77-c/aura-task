import { NextResponse } from "next/server";

/**
 * Desktop App Launcher Download Endpoint
 *
 * Generates a simple launcher script that:
 * 1. Opens Aura Tasks in the default browser (production URL)
 * 2. Can be packaged as .exe using tools like PyInstaller or electron-builder
 *
 * For now, returns a Windows batch file (.bat) that can be converted to .exe
 * Users can use online converters or tools like Bat To Exe Converter
 */
export async function GET(req: Request) {
  try {
    const productionUrl = process.env.NEXTAUTH_URL || "https://taskflow-henna-phi.vercel.app";

    // Windows Batch Script - Can be converted to .exe
    const batchScript = `@echo off
REM Aura Tasks Desktop Launcher
REM This script opens Aura Tasks in your default browser

title Aura Tasks
echo.
echo ========================================
echo   🚀 Aura Tasks - Desktop Launcher
echo ========================================
echo.
echo Opening Aura Tasks in your browser...
echo.
echo If browser doesn't open, visit:
echo ${productionUrl}
echo.

REM Open the URL in default browser
start "" "${productionUrl}"

REM Keep window open for 2 seconds then close
timeout /t 2 /nobreak
exit
`;

    // PowerShell Script Alternative (better UX)
    const powershellScript = `# Aura Tasks Desktop Launcher
# Run with: powershell -ExecutionPolicy Bypass -File "Aura Tasks.ps1"

$AuraTasks = "Aura Tasks ✨"
$Url = "${productionUrl}"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  🚀 $AuraTasks" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Opening Aura Tasks in your browser..." -ForegroundColor Green
Write-Host ""

try {
    # Try to open URL in default browser
    Start-Process $Url
    Write-Host "✅ Launched successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "If browser didn't open, visit:" -ForegroundColor Yellow
    Write-Host $Url -ForegroundColor Cyan
} catch {
    Write-Host "❌ Error opening browser" -ForegroundColor Red
    Write-Host "Please visit: $Url" -ForegroundColor Yellow
}

Write-Host ""
Start-Sleep -Seconds 3
`;

    // Check Accept header to determine format
    const acceptHeader = req.headers.get("accept") || "";
    const format = acceptHeader.includes("powershell") ? "ps1" : "bat";

    if (format === "ps1") {
      return new NextResponse(powershellScript, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": 'attachment; filename="Aura-Tasks-Launcher.ps1"',
        },
      });
    }

    // Default: return batch script
    return new NextResponse(batchScript, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": 'attachment; filename="Aura-Tasks-Launcher.bat"',
      },
    });
  } catch (error) {
    console.error("Desktop download error:", error);
    return NextResponse.json(
      { error: "Failed to generate launcher" },
      { status: 500 }
    );
  }
}
