# Auto-Update Script for Generator
param([switch]$CheckOnly)

$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if ([string]::IsNullOrEmpty($ScriptDir)) { $ScriptDir = Get-Location }

Write-Host "=== AUTO-UPDATE ==="
Write-Host "Script dir: $ScriptDir"

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

if ([version]$Latest -le [version]$Version) { 
    Write-Host "Already latest: $Version >= $Latest" 
    exit 0 
}
Write-Host "UPDATE AVAILABLE: $Latest (from $Version)"

if ($CheckOnly) { exit 0 }

# Download
Write-Host "Download URL: $($Response.zipball_url)"
$ZipPath = Join-Path $env:TEMP "gen.zip"
$Web = New-Object Net.WebClient
$Web.Headers.Add("User-Agent", "Generator-AutoUpdate")

if ($Token -and $Token.Length -gt 10) { 
    $Web.Headers.Add("Authorization", "token $Token") 
}
Write-Host "Downloading..."
try {
    $Web.DownloadFile($Response.zipball_url, $ZipPath)
    Write-Host "Downloaded: $((Get-Item $ZipPath).Length) bytes"
} catch {
    Write-Host "Download ERROR: $($_.Exception.Message)"
    exit 1
}

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

# Find proper content - Go TWO levels deep for GitHub source archive:
# Level1: sergeyyakudzo-cmd-generator_update-xxx (repo wrapper)
# Then: version folder (generator_1.1.0)
# Then: actual files
$Level1 = Get-ChildItem $ExtractDir -Directory | Select -First 1
if (-not $Level1) { Write-Host "ERROR: No Level1"; exit 1 }
Write-Host "Level1: $($Level1.Name)"

# Get what's inside Level1 - might be version folder or direct files
$Items = Get-ChildItem $Level1.FullName
$First = $Items | Select -First 1

# Keep going deeper until we find actual files (not a folder with version-like name)
$Current = $First
$Depth = 2
while ($Current.PSIsContainer -and $Current.Name -match '^[\dw\.-]+$') {
    $Next = Get-ChildItem $Current.FullName | Select -First 1
    if (-not $Next) { break }
    Write-Host "Level$($Depth): $($Current.Name)"
    $Current = $Next
    $Depth++
}

# Now get all content from the deepest level with actual files
$Content = Get-ChildItem $Current.FullName
Write-Host "Final: $($Content.Count) items"

# Protected files
$Protected = @("config.json", "start.bat", "update.ps1")
$Backup = Join-Path $ScriptDir "backup_update"
if (Test-Path $Backup) { Remove-Item $Backup -Recurse -Force }
New-Item -ItemType Directory -Path $Backup -Force | Out-Null
foreach ($p in $Protected) {
    $src = Join-Path $ScriptDir $p
    if (Test-Path $src) { Copy-Item $src $Backup -Force }
}
Write-Host "Backup done"

# Delete old files (not protected, not icons, not zimbra-extension)
Write-Host "Deleting old files from: $ScriptDir"
foreach ($f in Get-ChildItem $ScriptDir -File) {
    if ($Protected -notcontains $f.Name) { 
        Write-Host "  Deleting: $($f.Name)"
        Remove-Item $f.FullName -Force 
    }
}
foreach ($d in Get-ChildItem $ScriptDir -Directory) {
    if ($d.Name -notmatch "^(backup|icons|zimbra)") { 
        Write-Host "  Deleting folder: $($d.Name)"
        Remove-Item $d.FullName -Recurse -Force 
    }
}
Write-Host "Deleted old"

# Install from Level1 contents directly
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

# Update version in config.json (since it was restored from backup with old version)
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