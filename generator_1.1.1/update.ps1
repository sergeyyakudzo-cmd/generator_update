# Auto-Update Script for Generator
param([switch]$CheckOnly, [switch]$Silent)

$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if ([string]::IsNullOrEmpty($ScriptDir)) { $ScriptDir = Get-Location }
if (-not $Silent) { Write-Host "=== AUTO-UPDATE ===" }
if (-not $Silent) { Write-Host "Script dir: $ScriptDir" }
if (-not $Silent) { Write-Host "Current dir: $(Get-Location)" }

# Read config
$ConfigFile = Join-Path $ScriptDir "config.json"
if (-not (Test-Path $ConfigFile)) { Write-Host "ERROR: Config not found"; exit 1 }
$Config = Get-Content $ConfigFile -Raw | ConvertFrom-Json
$Repo = $Config.github.repo
$Version = $Config.version
Write-Host "Current: $Version | Repo: $Repo"

# Get latest from GitHub
$Headers = @{ "User-Agent" = "Generator-AutoUpdate" }
$Token = ""
if ($Config.github.PSObject.Properties.Name -contains "token") { $Token = $Config.github.token }
if ($Token -and $Token.Length -gt 10) { $Headers["Authorization"] = "token $Token"; Write-Host "Token: OK" }

$Response = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest" -Headers $Headers -TimeoutSec 30
$Latest = $Response.tag_name -replace '^v', ''
Write-Host "Latest: $Latest"

if ([version]$Latest -le [version]$Version) { Write-Host "Already latest!"; exit 0 }
Write-Host "UPDATE AVAILABLE: $Latest"

if ($CheckOnly) { exit 0 }

# Download
$ZipPath = Join-Path $env:TEMP "gen.zip"
$Web = New-Object Net.WebClient
$Web.Headers.Add("User-Agent", "Generator")
if ($Token) { $Web.Headers.Add("Authorization", "token $Token") }
Write-Host "Downloading..."
$Web.DownloadFile($Response.zipball_url, $ZipPath)
Write-Host "Downloaded: $((Get-Item $ZipPath).Length) bytes"

# Extract
$ExtractDir = Join-Path $env:TEMP "genextract"
if (Test-Path $ExtractDir) { Remove-Item $ExtractDir -Recurse -Force }
Write-Host "Extracting..."

try {
    Expand-Archive -Path $ZipPath -DestinationPath $ExtractDir -Force
} catch {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $Zip = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
    foreach ($e in $Zip.Entries) {
        $dest = Join-Path $ExtractDir $e.FullName
        if (-not $e.FullName.EndsWith('/')) {
            $d = Split-Path $dest
            if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
            [System.IO.File]::WriteAllBytes($dest, $e.Contents)
        }
    }
    $Zip.Dispose()
}

# Find version directories.
# Expand-Archive strips single root folder from GitHub zipballs,
# so version dirs are directly under $ExtractDir:
#   $ExtractDir/
#     generator_1.1.0/
#     generator_1.1.1/
# Fallback: look one level deeper (when root wasn't stripped).

$VersionPattern = '^generator_\d+\.\d+\.\d+$'

$VersionDirs = Get-ChildItem $ExtractDir -Directory | Where-Object { $_.Name -match $VersionPattern } | Sort-Object Name -Descending

if (-not $VersionDirs) {
    $Level1 = Get-ChildItem $ExtractDir -Directory | Select-Object -First 1
    if ($Level1) {
        Write-Host "Level1: $($Level1.Name)"
        $VersionDirs = Get-ChildItem $Level1.FullName -Directory | Where-Object { $_.Name -match $VersionPattern } | Sort-Object Name -Descending
    }
}

if (-not $VersionDirs) {
    Write-Host "ERROR: No version directories found"; exit 1
}

$ContentDir = $VersionDirs | Select-Object -First 1
Write-Host "Using version directory: $($ContentDir.Name)"

$Content = Get-ChildItem $ContentDir.FullName
Write-Host "Final: $($Content.Count) items"

# Backup protected files
$Protected = @("config.json", "start.bat", "update.ps1")
$Backup = Join-Path $ScriptDir "backup_update"
if (Test-Path $Backup) { Remove-Item $Backup -Recurse -Force }
New-Item -ItemType Directory -Path $Backup -Force | Out-Null
foreach ($p in $Protected) {
    $src = Join-Path $ScriptDir $p
    if (Test-Path $src) { Copy-Item $src $Backup -Force }
}
Write-Host "Backup done"

# Delete everything EXCEPT protected files and zimbra-extension
Write-Host "Deleting old files from: $ScriptDir"
foreach ($f in Get-ChildItem $ScriptDir -File) {
    if ($Protected -notcontains $f.Name) { 
        Write-Host "  Deleting: $($f.Name)"
        Remove-Item $f.FullName -Force 
    }
}
foreach ($d in Get-ChildItem $ScriptDir -Directory) {
    if ($d.Name -notmatch "^(backup|zimbra)") { 
        Write-Host "  Deleting folder: $($d.Name)"
        Remove-Item $d.FullName -Recurse -Force 
    }
}
Write-Host "Deleted old"

# Copy new files
Write-Host "Installing to: $ScriptDir"
Write-Host "Content count: $($Content.Count)"
foreach ($c in $Content) {
    if ($c.PSIsContainer) {
        Copy-Item $c.FullName (Join-Path $ScriptDir $c.Name) -Recurse -Force
        Write-Host "  + $($c.Name)/"
    } else {
        Copy-Item $c.FullName (Join-Path $ScriptDir $c.Name) -Force
        Write-Host "  + $($c.Name)"
    }
}

# Restore protected
foreach ($p in $Protected) {
    $src = Join-Path $Backup $p
    $dst = Join-Path $ScriptDir $p
    if (Test-Path $src) { Copy-Item $src $dst -Force }
}
Write-Host "Protected restored"

# Update version in config.json
$ConfigFile = Join-Path $ScriptDir "config.json"
$Config = Get-Content $ConfigFile -Raw | ConvertFrom-Json
if ($Config.version -ne $Latest) {
    $Config.version = $Latest
    $Config | ConvertTo-Json | Set-Content $ConfigFile -Encoding UTF8
    Write-Host "Version updated to $Latest"
}

# Cleanup
Remove-Item $ZipPath -Force -EA SilentlyContinue
Remove-Item $ExtractDir -Recurse -Force -EA SilentlyContinue
Remove-Item $Backup -Recurse -Force -EA SilentlyContinue

Write-Host "=== DONE: $Latest ===="
exit 0
