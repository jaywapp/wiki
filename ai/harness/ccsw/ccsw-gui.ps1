#requires -version 5
# ccsw-gui - WPF entry-point launcher for Claude Code / Codex
# One window to: install/toggle RTK + Headroom, pick a token profile,
# get a situational recommendation, and launch a session (external terminal
# or VS Code integrated terminal).
#
# Launch:  double-click ccsw-gui.cmd  (or)  powershell -STA -File ccsw-gui.ps1
#
# Thin front-end: profile/compression actions shell out to ccsw.ps1 and
# cc-compress.ps1, so behavior matches the CLI exactly.

Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName System.Windows.Forms   # FolderBrowserDialog

$ScriptDir      = $PSScriptRoot
$Ccsw           = Join-Path $ScriptDir 'ccsw.ps1'
$CcX            = Join-Path $ScriptDir 'cc-compress.ps1'
$ProfilesDir    = Join-Path $ScriptDir 'profiles'
$ClaudeSettings = Join-Path $HOME '.claude\settings.json'
$ActiveFile     = Join-Path $HOME '.ccsw\active.json'

[xml]$xaml = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="CC Token Optimizer - Launcher" Width="640" Height="660"
        WindowStartupLocation="CenterScreen" FontFamily="Segoe UI" FontSize="12">
  <Grid Margin="12">
    <Grid.RowDefinitions>
      <RowDefinition Height="*"/>
      <RowDefinition Height="190"/>
    </Grid.RowDefinitions>

    <TabControl Grid.Row="0">

      <TabItem Header="Session">
        <StackPanel Margin="10">
          <TextBlock Text="Profile" FontWeight="Bold"/>
          <ComboBox x:Name="cboProfile" Width="220" HorizontalAlignment="Left" Margin="0,4,0,10"/>

          <TextBlock Text="Project folder" FontWeight="Bold"/>
          <StackPanel Orientation="Horizontal" Margin="0,4,0,10">
            <TextBox x:Name="txtFolder" Width="420"/>
            <Button x:Name="btnBrowse" Content="Browse..." Width="90" Margin="8,0,0,0"/>
          </StackPanel>

          <TextBlock Text="Agent" FontWeight="Bold"/>
          <StackPanel Orientation="Horizontal" Margin="0,4,0,10">
            <RadioButton x:Name="rdoClaude" Content="Claude Code" IsChecked="True"/>
            <RadioButton x:Name="rdoCodex"  Content="Codex" Margin="16,0,0,0"/>
          </StackPanel>

          <TextBlock Text="Terminal" FontWeight="Bold"/>
          <StackPanel Orientation="Horizontal" Margin="0,4,0,10">
            <RadioButton x:Name="rdoExternal" Content="External (PowerShell)" IsChecked="True"/>
            <RadioButton x:Name="rdoVSCode"   Content="VS Code integrated terminal" Margin="16,0,0,0"/>
          </StackPanel>

          <CheckBox x:Name="chkApplyProfile" Content="Apply selected profile before launch" IsChecked="True" Margin="0,0,0,12"/>

          <Button x:Name="btnLaunch" Content="Launch session" Width="160" Height="32" HorizontalAlignment="Left"/>
        </StackPanel>
      </TabItem>

      <TabItem Header="Compression">
        <StackPanel Margin="10">
          <TextBlock Text="Status" FontWeight="Bold"/>
          <TextBlock x:Name="lblProfile"  Text="Active profile : -" Margin="0,4,0,0"/>
          <TextBlock x:Name="lblModel"    Text="Claude model   : -" Margin="0,2,0,0"/>
          <TextBlock x:Name="lblRtk"      Text="RTK            : -" Margin="0,2,0,0"/>
          <TextBlock x:Name="lblHeadroom" Text="Headroom       : -" Margin="0,2,0,10"/>

          <TextBlock Text="Install" FontWeight="Bold"/>
          <StackPanel Orientation="Horizontal" Margin="0,4,0,10">
            <Button x:Name="btnRtkInstall"  Content="Install RTK"      Width="130"/>
            <Button x:Name="btnHeadInstall" Content="Install Headroom" Width="150" Margin="8,0,0,0"/>
          </StackPanel>

          <TextBlock Text="Toggle" FontWeight="Bold"/>
          <StackPanel Orientation="Horizontal" Margin="0,4,0,10">
            <Button x:Name="btnRtkOn"     Content="RTK On"         Width="90"/>
            <Button x:Name="btnRtkOff"    Content="RTK Off"        Width="90"  Margin="8,0,0,0"/>
            <Button x:Name="btnHeadStart" Content="Headroom Start" Width="130" Margin="16,0,0,0"/>
            <Button x:Name="btnHeadStop"  Content="Headroom Stop"  Width="130" Margin="8,0,0,0"/>
          </StackPanel>

          <Button x:Name="btnRefresh" Content="Refresh status" Width="120" HorizontalAlignment="Left"/>
        </StackPanel>
      </TabItem>

      <TabItem Header="Recommend">
        <StackPanel Margin="10">
          <TextBlock Text="Task type" FontWeight="Bold"/>
          <ComboBox x:Name="cboTask" Width="240" HorizontalAlignment="Left" Margin="0,4,0,8">
            <ComboBoxItem Content="Daily / simple" IsSelected="True"/>
            <ComboBoxItem Content="Design / complex"/>
            <ComboBoxItem Content="Hard / long-horizon"/>
          </ComboBox>

          <TextBlock Text="Concurrent sessions" FontWeight="Bold"/>
          <ComboBox x:Name="cboConc" Width="240" HorizontalAlignment="Left" Margin="0,4,0,8">
            <ComboBoxItem Content="Single / few" IsSelected="True"/>
            <ComboBoxItem Content="Many (parallel)"/>
          </ComboBox>

          <TextBlock Text="Version control" FontWeight="Bold"/>
          <ComboBox x:Name="cboVcs" Width="240" HorizontalAlignment="Left" Margin="0,4,0,10">
            <ComboBoxItem Content="git" IsSelected="True"/>
            <ComboBoxItem Content="perforce"/>
          </ComboBox>

          <Button x:Name="btnRecommend" Content="Recommend" Width="120" HorizontalAlignment="Left"/>
          <Border BorderBrush="#CCC" BorderThickness="1" Margin="0,10,0,10" Padding="8" Background="#F7F7F7">
            <TextBlock x:Name="lblRec" Text="Pick options and press Recommend." TextWrapping="Wrap"/>
          </Border>
          <Button x:Name="btnApplyRec" Content="Apply recommended" Width="160" HorizontalAlignment="Left"/>
        </StackPanel>
      </TabItem>

    </TabControl>

    <GroupBox Grid.Row="1" Header="Log" Margin="0,10,0,0">
      <TextBox x:Name="txtLog" IsReadOnly="True" VerticalScrollBarVisibility="Auto"
               TextWrapping="Wrap" FontFamily="Consolas" FontSize="11"/>
    </GroupBox>
  </Grid>
</Window>
'@

$reader = New-Object System.Xml.XmlNodeReader $xaml
$window = [Windows.Markup.XamlReader]::Load($reader)

# Resolve controls
'cboProfile txtFolder btnBrowse rdoClaude rdoCodex rdoExternal rdoVSCode chkApplyProfile btnLaunch lblProfile lblModel lblRtk lblHeadroom btnRtkInstall btnHeadInstall btnRtkOn btnRtkOff btnHeadStart btnHeadStop btnRefresh cboTask cboConc cboVcs btnRecommend lblRec btnApplyRec txtLog'.Split(' ') | ForEach-Object {
  Set-Variable -Name $_ -Value $window.FindName($_) -Scope Script
}

$script:lastRec = $null

function Write-Log($msg) {
  $txtLog.AppendText("$msg`r`n")
  $txtLog.ScrollToEnd()
}

function Update-Status {
  $active = '(none)'
  if (Test-Path $ActiveFile) {
    try { $a = (Get-Content -Raw $ActiveFile | ConvertFrom-Json).name; if ($a) { $active = $a } } catch {}
  }
  $model = '(unknown)'
  if (Test-Path $ClaudeSettings) {
    try { $m = (Get-Content -Raw $ClaudeSettings | ConvertFrom-Json).model; if ($m) { $model = $m } } catch {}
  }
  $rtk = 'not installed'
  if (Get-Command rtk -ErrorAction SilentlyContinue) {
    $hook = (Test-Path $ClaudeSettings) -and ((Get-Content -Raw $ClaudeSettings) -match '(?i)rtk')
    if ($hook) { $rtk = 'installed + hook ON' } else { $rtk = 'installed, hook off' }
  }
  $hp = Get-Process -Name Headroom -ErrorAction SilentlyContinue
  if ($hp) { $hr = "running (pid $($hp.Id))" } else { $hr = 'stopped' }

  $lblProfile.Text  = "Active profile : $active"
  $lblModel.Text    = "Claude model   : $model"
  $lblRtk.Text      = "RTK            : $rtk"
  $lblHeadroom.Text = "Headroom       : $hr"
}

function Invoke-Tool($script, $argList) {
  Write-Log ("> {0} {1}" -f [IO.Path]::GetFileName($script), ($argList -join ' '))
  try {
    $out = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $script @argList 2>&1 | Out-String
  } catch {
    $out = ($_ | Out-String)
  }
  if ($out.Trim()) { Write-Log $out.Trim() }
  Update-Status
}

function Get-Agent { if ($rdoCodex.IsChecked) { 'codex' } else { 'claude' } }

function Launch-External($folder, $agent) {
  $cmd = "Set-Location -LiteralPath '$folder'; $agent"
  Start-Process powershell.exe -ArgumentList '-NoExit', '-NoProfile', '-Command', $cmd
  Write-Log "Launched '$agent' in a new PowerShell window at $folder"
}

function Launch-VSCode($folder, $agent) {
  if (-not (Get-Command code -ErrorAction SilentlyContinue)) {
    Write-Log "VS Code 'code' CLI not found on PATH. Install it (VS Code: Shell Command: Install 'code' command)."
    return
  }
  $vscodeDir = Join-Path $folder '.vscode'
  if (-not (Test-Path $vscodeDir)) { New-Item -ItemType Directory -Force -Path $vscodeDir | Out-Null }
  $tasksPath = Join-Path $vscodeDir 'tasks.json'
  if (Test-Path $tasksPath) { Copy-Item $tasksPath "$tasksPath.ccsw-bak" -Force }
  $taskJson = @"
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "ccsw: launch $agent",
      "type": "shell",
      "command": "$agent",
      "presentation": { "reveal": "always", "panel": "dedicated", "focus": true },
      "runOptions": { "runOn": "folderOpen" }
    }
  ]
}
"@
  Set-Content -Path $tasksPath -Value $taskJson -Encoding utf8
  Start-Process code -ArgumentList @($folder)
  Write-Log "Opened VS Code at $folder; the folderOpen task runs '$agent' in the integrated terminal."
  Write-Log "  First time only: click 'Allow Automatic Tasks' in VS Code (Manage Automatic Tasks)."
  if (Test-Path "$tasksPath.ccsw-bak") { Write-Log "  Existing tasks.json was backed up to tasks.json.ccsw-bak." }
}

function Get-Recommendation($task, $conc, $vcs) {
  switch -Wildcard ($task) {
    'Daily*'  { $profile = 'lean' }
    'Design*' { $profile = 'balanced' }
    'Hard*'   { $profile = 'max' }
    default   { $profile = 'balanced' }
  }
  $many = $conc -like 'Many*'
  $p4   = $vcs  -like 'perforce*'

  if ($many) {
    $comp = 'RTK'
    $why  = 'Many concurrent sessions -> RTK (PreToolUse hook, no resident proxy, near-zero local load). Headroom would contend on one local proxy process.'
  } elseif ($p4) {
    $comp = 'Headroom'
    $why  = 'Perforce: RTK is git-centric and will not compress p4 output. Use Headroom (VCS-agnostic) plus p4 terse flags (see perforce-p4.md).'
  } elseif ($profile -eq 'lean') {
    $comp = 'RTK'
    $why  = 'Daily/simple work: the lightweight RTK hook is enough.'
  } else {
    $comp = 'Headroom'
    $why  = 'Design/deep single session: stronger reversible compression (Headroom) pays off, and cache stabilization helps.'
  }
  if ($many -and $p4) {
    $why += ' NOTE: many + Perforce conflicts - RTK cannot shrink p4 output, so prefer terse p4 flags, or accept Headroom local load.'
  }
  [pscustomobject]@{ profile = $profile; compression = $comp; why = $why }
}

# --- Populate + wire ---
if (Test-Path $ProfilesDir) {
  Get-ChildItem $ProfilesDir -Filter *.json | Sort-Object Name | ForEach-Object {
    [void]$cboProfile.Items.Add($_.BaseName)
  }
}
if ($cboProfile.Items.Count -gt 0) {
  $cur = $null
  if (Test-Path $ActiveFile) { try { $cur = (Get-Content -Raw $ActiveFile | ConvertFrom-Json).name } catch {} }
  if ($cur -and $cboProfile.Items.Contains($cur)) { $cboProfile.SelectedItem = $cur } else { $cboProfile.SelectedIndex = 0 }
}
$txtFolder.Text = (Get-Location).Path

$btnBrowse.Add_Click({
  $dlg = New-Object System.Windows.Forms.FolderBrowserDialog
  if (Test-Path $txtFolder.Text) { $dlg.SelectedPath = $txtFolder.Text }
  if ($dlg.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { $txtFolder.Text = $dlg.SelectedPath }
})

$btnLaunch.Add_Click({
  $folder = $txtFolder.Text
  if (-not $folder -or -not (Test-Path $folder)) { Write-Log "Select a valid project folder first."; return }
  $agent = Get-Agent
  if ($chkApplyProfile.IsChecked -and $cboProfile.SelectedItem) {
    Invoke-Tool $Ccsw @('use', [string]$cboProfile.SelectedItem)
  }
  if ($rdoVSCode.IsChecked) { Launch-VSCode $folder $agent } else { Launch-External $folder $agent }
})

$btnRtkInstall.Add_Click({  Invoke-Tool $CcX @('rtk', 'install') })
$btnHeadInstall.Add_Click({ Invoke-Tool $CcX @('headroom', 'install') })
$btnRtkOn.Add_Click({       Invoke-Tool $CcX @('rtk', 'on') })
$btnRtkOff.Add_Click({      Invoke-Tool $CcX @('rtk', 'off') })
$btnHeadStart.Add_Click({   Invoke-Tool $CcX @('headroom', 'start') })
$btnHeadStop.Add_Click({    Invoke-Tool $CcX @('headroom', 'stop') })
$btnRefresh.Add_Click({     Update-Status; Write-Log "Status refreshed." })

$btnRecommend.Add_Click({
  $task = if ($cboTask.SelectedItem) { [string]$cboTask.SelectedItem.Content } else { 'Daily / simple' }
  $conc = if ($cboConc.SelectedItem) { [string]$cboConc.SelectedItem.Content } else { 'Single / few' }
  $vcs  = if ($cboVcs.SelectedItem)  { [string]$cboVcs.SelectedItem.Content }  else { 'git' }
  $r = Get-Recommendation $task $conc $vcs
  $script:lastRec = $r
  $lblRec.Text = "Recommended:  profile = $($r.profile)   |   compression = $($r.compression)`n`n$($r.why)"
})

$btnApplyRec.Add_Click({
  if (-not $script:lastRec) { Write-Log "Press Recommend first."; return }
  $r = $script:lastRec
  if ($cboProfile.Items.Contains($r.profile)) { $cboProfile.SelectedItem = $r.profile }
  Invoke-Tool $Ccsw @('use', $r.profile)
  if ($r.compression -eq 'RTK') { Invoke-Tool $CcX @('rtk', 'on') }
  elseif ($r.compression -eq 'Headroom') { Invoke-Tool $CcX @('headroom', 'start') }
  Write-Log "Applied recommendation: profile=$($r.profile), compression=$($r.compression). Open the Session tab to launch."
})

Update-Status
Write-Log "Ready. Session tab: pick profile + folder, then Launch. Compression tab: install/toggle RTK/Headroom."
[void]$window.ShowDialog()
