#!/usr/bin/env pwsh
# cc-compress - launcher for the compression layer (RTK hook + Headroom proxy)
# Start/stop/toggle the token-compression tools and report their state,
# independent of which ccsw profile is active.
#
# Usage:
#   ./cc-compress.ps1 status
#   ./cc-compress.ps1 rtk on            # install Claude Code hook (rtk init -g)
#   ./cc-compress.ps1 rtk off           # remove hook (rtk init -g --uninstall)
#   ./cc-compress.ps1 headroom start    # launch Headroom app (set $env:HEADROOM_PATH on Windows)
#   ./cc-compress.ps1 headroom stop
#
# Notes:
#   - RTK auto-rewrite needs WSL on Windows; native Windows = explicit rtk use only.
#   - Headroom is a local proxy (prompts stay on your machine) and is macOS-centric;
#     verify Windows availability at https://extraheadroom.com/.

[CmdletBinding()]
param(
  [Parameter(Position = 0)][string]$Command = "status",
  [Parameter(Position = 1)][string]$Arg
)

$ErrorActionPreference = "Stop"
$ClaudeSettings    = Join-Path $HOME ".claude\settings.json"
$HeadroomProcNames = @("Headroom")

function Test-RtkInstalled { [bool](Get-Command rtk -ErrorAction SilentlyContinue) }

function Test-RtkHook {
  if (Test-Path $ClaudeSettings) {
    return ((Get-Content -Raw $ClaudeSettings) -match '(?i)rtk')
  }
  return $false
}

function Get-HeadroomProc { Get-Process -Name $HeadroomProcNames -ErrorAction SilentlyContinue }

function Invoke-RtkOn {
  if (-not (Test-RtkInstalled)) {
    Write-Host "RTK not on PATH. Install: https://github.com/rtk-ai/rtk" -ForegroundColor Yellow; return
  }
  rtk init -g
  Write-Host "RTK hook installed. Restart Claude Code to apply." -ForegroundColor Green
  Write-Host "  (auto-rewrite needs WSL on Windows)" -ForegroundColor DarkGray
}

function Invoke-RtkOff {
  if (-not (Test-RtkInstalled)) { Write-Host "RTK not on PATH." -ForegroundColor Yellow; return }
  rtk init -g --uninstall
  Write-Host "RTK hook removed. Restart Claude Code to apply." -ForegroundColor Green
}

function Invoke-RtkInstall {
  if (Test-RtkInstalled) { Write-Host "RTK already installed: $(rtk --version)" -ForegroundColor Green; return }
  if (Get-Command cargo -ErrorAction SilentlyContinue) {
    Write-Host "Installing RTK via cargo (this may take a few minutes)..."
    cargo install --git https://github.com/rtk-ai/rtk
    if (Test-RtkInstalled) { Write-Host "RTK installed. Run: cc-compress rtk on" -ForegroundColor Green }
  } else {
    Write-Host "cargo not found. Opening the RTK releases page..." -ForegroundColor Yellow
    Start-Process "https://github.com/rtk-ai/rtk/releases"
    Write-Host "  Download the Windows binary, add it to PATH, then: cc-compress rtk on" -ForegroundColor DarkGray
    Write-Host "  (auto-rewrite hook needs WSL on Windows)" -ForegroundColor DarkGray
  }
}

function Invoke-HeadroomInstall {
  Write-Host "Opening the Headroom download page..."
  Start-Process "https://extraheadroom.com/"
  Write-Host "  Headroom is macOS-centric; verify Windows availability before installing." -ForegroundColor DarkGray
  Write-Host "  After install, set `$env:HEADROOM_PATH (Windows) then: cc-compress headroom start" -ForegroundColor DarkGray
}

function Invoke-HeadroomStart {
  $p = Get-HeadroomProc
  if ($p) { Write-Host "Headroom already running (pid $($p.Id))." -ForegroundColor Green; return }
  if ($env:HEADROOM_PATH -and (Test-Path $env:HEADROOM_PATH)) {
    Start-Process $env:HEADROOM_PATH
    Write-Host "Headroom launched from `$env:HEADROOM_PATH." -ForegroundColor Green; return
  }
  $macOS = Get-Variable -Name IsMacOS -ErrorAction SilentlyContinue
  if ($macOS -and $IsMacOS) {
    & open -a Headroom
    Write-Host "Headroom launched (macOS)." -ForegroundColor Green; return
  }
  Write-Host "Headroom executable not found." -ForegroundColor Yellow
  Write-Host "  Set `$env:HEADROOM_PATH to the app path, or start it manually." -ForegroundColor Yellow
  Write-Host "  Headroom is macOS-centric; verify Windows availability at https://extraheadroom.com/" -ForegroundColor DarkGray
}

function Invoke-HeadroomStop {
  $p = Get-HeadroomProc
  if (-not $p) { Write-Host "Headroom not running."; return }
  $p | Stop-Process -Force
  Write-Host "Headroom stopped." -ForegroundColor Green
}

function Show-Status {
  if (Test-RtkInstalled) {
    $rtk = if (Test-RtkHook) { "installed + hook ON" } else { "installed, hook off" }
  } else {
    $rtk = "not installed"
  }
  $hp = Get-HeadroomProc
  $hr = if ($hp) { "running (pid $($hp.Id))" } else { "stopped" }
  Write-Host "compression status:"
  Write-Host "  RTK      : $rtk"
  Write-Host "  Headroom : $hr"
}

switch ($Command.ToLower()) {
  "status"   { Show-Status }
  "rtk"      {
    switch ($Arg) {
      "install" { Invoke-RtkInstall }
      "on"      { Invoke-RtkOn }
      "off"     { Invoke-RtkOff }
      default   { Write-Host "usage: cc-compress rtk install|on|off" }
    }
  }
  "headroom" {
    switch ($Arg) {
      "install" { Invoke-HeadroomInstall }
      "start"   { Invoke-HeadroomStart }
      "stop"    { Invoke-HeadroomStop }
      default   { Write-Host "usage: cc-compress headroom install|start|stop" }
    }
  }
  "help"     { Write-Host "Commands:`n  cc-compress status`n  cc-compress rtk install|on|off`n  cc-compress headroom install|start|stop" }
  default    { Write-Host "Unknown command '$Command'. Try: status | rtk install|on|off | headroom install|start|stop | help" }
}
