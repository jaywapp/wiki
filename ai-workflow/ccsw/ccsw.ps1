#!/usr/bin/env pwsh
# ccsw - Claude + Codex environment profile switcher
# Switches model routing, Codex config, env vars, and compression layer
# for the active token-optimization profile in one command.
#
# Usage:
#   ./ccsw.ps1 list
#   ./ccsw.ps1 use balanced
#   ./ccsw.ps1 status
#
# Profiles live in ./profiles/*.json next to this script.
# State is tracked in ~/.ccsw/active.json.
# Existing ~/.claude/settings.json and ~/.codex/config.toml are backed up
# (.ccsw-bak) before each switch.

[CmdletBinding()]
param(
  [Parameter(Position = 0)][string]$Command = "status",
  [Parameter(Position = 1)][string]$Name
)

$ErrorActionPreference = "Stop"

$ScriptDir      = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProfilesDir    = Join-Path $ScriptDir "profiles"
$StateDir       = Join-Path $HOME ".ccsw"
$StateFile      = Join-Path $StateDir "active.json"
$ClaudeSettings = Join-Path $HOME ".claude\settings.json"
$CodexConfig    = Join-Path $HOME ".codex\config.toml"

function Ensure-Dir($p) {
  if (-not (Test-Path $p)) { New-Item -ItemType Directory -Force -Path $p | Out-Null }
}

function Read-Json($path) {
  if (Test-Path $path) { return (Get-Content -Raw -Path $path | ConvertFrom-Json) }
  return $null
}

function Get-ProfileList {
  Get-ChildItem -Path $ProfilesDir -Filter *.json | ForEach-Object { $_.BaseName }
}

function Get-Profile($name) {
  $f = Join-Path $ProfilesDir "$name.json"
  if (-not (Test-Path $f)) {
    throw "Unknown profile '$name'. Available: $((Get-ProfileList) -join ', ')"
  }
  return (Get-Content -Raw -Path $f | ConvertFrom-Json)
}

# Shallow-merge profile.claudeSettings over the existing settings.json top-level keys.
function Apply-ClaudeSettings($profile) {
  Ensure-Dir (Split-Path $ClaudeSettings)
  $settings = Read-Json $ClaudeSettings
  if ($null -eq $settings) {
    $settings = [pscustomobject]@{}
  } else {
    Copy-Item $ClaudeSettings "$ClaudeSettings.ccsw-bak" -Force
  }
  if ($profile.claudeSettings) {
    foreach ($p in $profile.claudeSettings.PSObject.Properties) {
      $settings | Add-Member -NotePropertyName $p.Name -NotePropertyValue $p.Value -Force
    }
  }
  ($settings | ConvertTo-Json -Depth 30) | Set-Content -Path $ClaudeSettings -Encoding utf8
}

# Update only the managed top-level keys in config.toml, preserving other lines.
function Apply-CodexConfig($profile) {
  if (-not $profile.codex) { return }
  Ensure-Dir (Split-Path $CodexConfig)
  $kv = @{}
  foreach ($p in $profile.codex.PSObject.Properties) { $kv[$p.Name] = [string]$p.Value }

  $existing = @()
  if (Test-Path $CodexConfig) {
    Copy-Item $CodexConfig "$CodexConfig.ccsw-bak" -Force
    $existing = Get-Content -Path $CodexConfig
  }
  $out = @()
  $seen = @{}
  foreach ($line in $existing) {
    $m = [regex]::Match($line, '^\s*([A-Za-z0-9_]+)\s*=')
    if ($m.Success -and $kv.ContainsKey($m.Groups[1].Value)) {
      $k = $m.Groups[1].Value
      $out += ('{0} = "{1}"' -f $k, $kv[$k]); $seen[$k] = $true
    } else {
      $out += $line
    }
  }
  foreach ($k in $kv.Keys) { if (-not $seen[$k]) { $out += ('{0} = "{1}"' -f $k, $kv[$k]) } }
  ($out -join "`n") | Set-Content -Path $CodexConfig -Encoding utf8
}

# Set User-scope env vars; clear ones managed by the previous profile.
function Apply-Env($profile, $prev) {
  if ($prev -and $prev.envKeys) {
    foreach ($k in $prev.envKeys) { [Environment]::SetEnvironmentVariable($k, $null, "User") }
  }
  $keys = @()
  if ($profile.env) {
    foreach ($p in $profile.env.PSObject.Properties) {
      [Environment]::SetEnvironmentVariable($p.Name, [string]$p.Value, "User")
      Set-Item -Path "Env:$($p.Name)" -Value ([string]$p.Value)
      $keys += $p.Name
    }
  }
  return $keys
}

# Toggle the compression layer. RTK ships its own installer; Headroom is a GUI proxy.
function Apply-Compression($profile, $prev) {
  $hasRtk = [bool](Get-Command rtk -ErrorAction SilentlyContinue)
  if ($prev -and $prev.compression -eq "rtk" -and $profile.compression -ne "rtk" -and $hasRtk) {
    try { rtk init -g --uninstall 2>$null } catch {}
  }
  switch ($profile.compression) {
    "rtk" {
      if ($hasRtk) { rtk init -g }   # installs the Claude Code bash hook (auto-rewrite needs WSL on Windows)
      else { Write-Host "  ! RTK not found on PATH. Install: https://github.com/rtk-ai/rtk" -ForegroundColor Yellow }
    }
    "headroom" {
      Write-Host "  ! Headroom is a GUI proxy - start the Headroom app and enable optimization." -ForegroundColor Yellow
    }
    default { }
  }
}

function Show-Status {
  $state = Read-Json $StateFile
  if ($null -eq $state) {
    Write-Host "No active profile. Run: ccsw use <name>   (available: $((Get-ProfileList) -join ', '))"
    return
  }
  Write-Host "Active profile: $($state.name)" -ForegroundColor Green
  $cs = Read-Json $ClaudeSettings
  if ($cs -and $cs.model) { Write-Host "  Claude model : $($cs.model)" }
  $cx = $null
  if (Test-Path $CodexConfig) {
    $cx = (Get-Content $CodexConfig | Select-String '^\s*model\s*=' | Select-Object -First 1)
  }
  if ($cx) { Write-Host "  Codex        : $($cx.Line.Trim())" }
  Write-Host "  compression  : $($state.compression)"
  Write-Host "  applied at   : $($state.appliedAt)"
}

function Use-Profile($name) {
  $profile = Get-Profile $name
  Ensure-Dir $StateDir
  $prev = Read-Json $StateFile

  Write-Host "Switching to profile: $name" -ForegroundColor Cyan
  Apply-ClaudeSettings $profile
  Apply-CodexConfig $profile
  $envKeys = Apply-Env $profile $prev
  Apply-Compression $profile $prev

  $state = [pscustomobject]@{
    name        = $name
    envKeys     = $envKeys
    compression = $profile.compression
    appliedAt   = (Get-Date).ToString("s")
  }
  ($state | ConvertTo-Json) | Set-Content -Path $StateFile -Encoding utf8

  Write-Host ""
  Show-Status
  Write-Host ""
  Write-Host "  effort 권장 : $($profile.recommendedEffort)  (세션에서 /model 또는 effort 로 설정)" -ForegroundColor DarkGray
  Write-Host "  메모        : $($profile.notes)" -ForegroundColor DarkGray
  Write-Host "  ! 새 env 변수는 새 터미널/에이전트 재시작 후 적용됩니다." -ForegroundColor Yellow
}

switch ($Command.ToLower()) {
  "list"   { Get-ProfileList }
  "use"    { if (-not $Name) { throw "Usage: ccsw use <name>" }; Use-Profile $Name }
  "status" { Show-Status }
  "help"   { Write-Host "Commands:`n  ccsw list`n  ccsw use <name>`n  ccsw status" }
  default  { Write-Host "Unknown command '$Command'. Try: list | use <name> | status | help" }
}
