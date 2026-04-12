# ============================================
# Auto-Update Script for Notification Generator
# ============================================

param(
    [string]$ConfigPath = "config.json",
    [switch]$CheckOnly = $false,
    [switch]$Silent = $false
)

$ErrorActionPreference = "Continue"

# Цвета для вывода
function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    if (-not $Silent) {
        switch ($Color) {
            "Green"  { Write-Host $Message -ForegroundColor Green }
            "Yellow" { Write-Host $Message -ForegroundColor Yellow }
            "Red"    { Write-Host $Message -ForegroundColor Red }
            "Cyan"   { Write-Host $Message -ForegroundColor Cyan }
            default  { Write-Host $Message }
        }
    }
}

# Получение текущей директории (где лежит генератор)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if ([string]::IsNullOrEmpty($ScriptDir)) {
    $ScriptDir = Get-Location
}

# Чтение конфигурации
$ConfigFile = Join-Path $ScriptDir $ConfigPath
if (-not (Test-Path $ConfigFile)) {
    Write-ColorOutput "Config file not found: $ConfigFile" "Red"
    exit 1
}

try {
    $Config = Get-Content $ConfigFile -Raw -Encoding UTF8 | ConvertFrom-Json
} catch {
    Write-ColorOutput "Error reading config: $($_.Exception.Message)" "Red"
    exit 1
}

# Проверка настроек GitHub
if (-not $Config.github) {
    Write-ColorOutput "GitHub configuration not found in config.json" "Red"
    Write-ColorOutput "Add: { ""github"": { ""repo"": ""OWNER/REPO"", ""branch"": ""main"" } }" "Yellow"
    exit 1
}

$Repo = $Config.github.repo
$Branch = if ($Config.github.branch) { $Config.github.branch } else { "main" }
$CurrentVersion = if ($Config.version) { $Config.version } else { "0.0.0" }

Write-ColorOutput "Current version: $CurrentVersion" "Cyan"
Write-ColorOutput "Repository: $Repo" "Cyan"
Write-ColorOutput "Branch: $Branch" "Cyan"

# API GitHub для получения информации о последнем релизе
$ApiUrl = "https://api.github.com/repos/$Repo/releases/latest"

try {
    Write-ColorOutput "Checking for updates..." "Yellow"
    $Response = Invoke-RestMethod -Uri $ApiUrl -Method Get -Headers @{ "User-Agent" = "PowerShell-AutoUpdate" } -TimeoutSec 30
    
    $LatestVersion = $Response.tag_name -replace '^v', ''
    $DownloadUrl = $Response.assets | Where-Object { $_.name -match '\.zip$' } | Select-Object -First 1
    
    if (-not $DownloadUrl) {
        # Если нет assets, используем source code
        $DownloadUrl = $Response.zipball_url
    }
    
    Write-ColorOutput "Latest version: $LatestVersion" "Green"
    
    # Сравнение версий - преобразуем в числа для корректного сравнения
    $CurrentVerNum = try { [version]$CurrentVersion } catch { [version]"0.0.0" }
    $LatestVerNum = try { [version]$LatestVersion } catch { [version]"0.0.0" }
    
    Write-ColorOutput "Comparing: $LatestVersion vs $CurrentVersion" "Cyan"
    Write-ColorOutput "As numbers: $LatestVerNum vs $CurrentVerNum" "Cyan"
    
    if ($LatestVerNum -le $CurrentVerNum) {
        Write-ColorOutput "You have the latest version! ($CurrentVersion)" "Green"
        exit 0
    }
    
    Write-ColorOutput "UPDATE AVAILABLE: $LatestVersion -> $CurrentVersion" "Yellow"
    
    if ($CheckOnly) {
        Write-ColorOutput "Update available: $LatestVersion (current: $CurrentVersion)" "Yellow"
        exit 0
    }
    
    Write-ColorOutput "Downloading update..." "Yellow"
    
    # Скачивание архива
    $TempZip = Join-Path $env:TEMP "generator_update_$(Get-Random).zip"
    
    try {
        $WebClient = New-Object System.Net.WebClient
        $WebClient.Headers.Add("User-Agent", "PowerShell-AutoUpdate")
        $WebClient.DownloadFile($DownloadUrl, $TempZip)
        
        Write-ColorOutput "Download complete. Extracting..." "Green"
        
        # Файлы которые НЕ надо удалять при обновлении (защищенные)
        $ProtectedFiles = @("config.json", "start.bat")
        
        # Распаковка новых файлов
        Write-ColorOutput "Extracting new files..." "Green"
        
        # Определение способа распаковки
        $ExtractDir = Join-Path $env:TEMP "generator_extract_$(Get-Random)"
        New-Item -ItemType Directory -Path $ExtractDir -Force | Out-Null
        
        # PowerShell 5.1 doesn't have Expand-Archive with -Force for existing files
        # Using .NET for extraction
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $Zip = [System.IO.Compression.ZipFile]::OpenRead($TempZip)
        
        $ExtractedFiles = @()
        
        foreach ($Entry in $Zip.Entries) {
            # Пропускаем папки
            if ($Entry.FullName.EndsWith('/')) { continue }
            
            # Пропускаем первую папку (имя репозитория)
            $PathParts = $Entry.FullName -split '[/\\]'
            if ($PathParts.Count -le 1) { continue }
            
            # Берем все кроме первой папки
            $RelativePath = $PathParts[1..($PathParts.Count-1)] -join '/'
            
            # Пропускаем .git и другие служебные папки
            if ($RelativePath -match '^(\.git|__|\.)') { continue }
            
            $DestPath = Join-Path $ExtractDir $RelativePath
            
            # Создаем директорию если нужно
            $DestDir = Split-Path $DestPath
            if (-not (Test-Path $DestDir)) {
                New-Item -ItemType Directory -Path $DestDir -Force | Out-Null
            }
            
            # Копируем файл
            $Entry.ExtractToFile($DestPath, $true)
            $ExtractedFiles += $RelativePath
        }
        
        $Zip.Dispose()
        
        Write-ColorOutput "Extracted $($ExtractedFiles.Count) files" "Cyan"
        
        # Создание резервной копии
        $BackupDir = Join-Path $ScriptDir "backup_$((Get-Date).ToString('yyyyMMdd_HHmmss'))"
        Write-ColorOutput "Creating backup in: $BackupDir" "Yellow"
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
        
        # Резервное копирование защищенных файлов
        foreach ($Protected in $ProtectedFiles) {
            $Src = Join-Path $ScriptDir $Protected
            if (Test-Path $Src) {
                Copy-Item -Path $Src -Destination $BackupDir -Force
                Write-ColorOutput "  Backed up: $Protected" "Cyan"
            }
        }
        
        # Резервное копирование ВСЕХ остальных файлов
        Get-ChildItem -Path $ScriptDir -File | Where-Object {
            $ProtectedFiles -notcontains $_.Name -and $_.Name -ne "update.ps1"
        } | ForEach-Object {
            Copy-Item -Path $_.FullName -Destination $BackupDir -Force
            Write-ColorOutput "  Backed up: $($_.Name)" "Cyan"
        }
        
        Get-ChildItem -Path $ScriptDir -Directory | Where-Object {
            $_.Name -ne "backup_*" -and $_.Name -ne "icons"
        } | ForEach-Object {
            $DestBackup = Join-Path $BackupDir $_.Name
            Copy-Item -Path $_.FullName -Destination $DestBackup -Recurse -Force
            Write-ColorOutput "  Backed up folder: $($_.Name)" "Cyan"
        }
        
        # Удаление старых файлов (кроме защищенных)
        Write-ColorOutput "Removing old files..." "Yellow"
        Get-ChildItem -Path $ScriptDir -File | Where-Object {
            $ProtectedFiles -notcontains $_.Name -and $_.Name -ne "update.ps1"
        } | ForEach-Object {
            Write-ColorOutput "  Deleting: $($_.Name)" "Gray"
            Remove-Item $_.FullName -Force
        }
        
        # Удаление старых папок (кроме backup, icons и zimbra-extension)
        Get-ChildItem -Path $ScriptDir -Directory | Where-Object {
            $_.Name -ne "backup_*" -and $_.Name -ne "icons" -and $_.Name -ne "zimbra-extension"
        } | ForEach-Object {
            Write-ColorOutput "  Deleting folder: $($_.Name)" "Gray"
            Remove-Item $_.FullName -Recurse -Force
        }
        
        # Копирование новых файлов
        Write-ColorOutput "Installing new files..." "Green"
        Get-ChildItem -Path $ExtractDir -File | ForEach-Object {
            $Dest = Join-Path $ScriptDir $_.Name
            Copy-Item -Path $_.FullName -Destination $Dest -Force
            Write-ColorOutput "  Installed: $($_.Name)" "Green"
        }
        
        # Копирование новых папок
        Get-ChildItem -Path $ExtractDir -Directory | ForEach-Object {
            $Dest = Join-Path $ScriptDir $_.Name
            Copy-Item -Path $_.FullName -Destination $Dest -Recurse -Force
            Write-ColorOutput "  Installed folder: $($_.Name)" "Green"
        }
        
        # Восстановление защищенных файлов
        Write-ColorOutput "Restoring protected files..." "Yellow"
        foreach ($Protected in $ProtectedFiles) {
            $Src = Join-Path $BackupDir $Protected
            $Dest = Join-Path $ScriptDir $Protected
            if (Test-Path $Src) {
                Copy-Item -Path $Src -Destination $Dest -Force
                Write-ColorOutput "  Restored: $Protected" "Green"
            }
        }
        
        # Очистка
        Remove-Item $TempZip -Force -ErrorAction SilentlyContinue
        Remove-Item $ExtractDir -Recurse -Force -ErrorAction SilentlyContinue
        
        $Zip.Dispose()
        
        # Восстановление защищенных файлов
        Write-ColorOutput "Restoring protected files..." "Yellow"
        Get-ChildItem -Path $BackupDir | ForEach-Object {
            $Dest = Join-Path $ScriptDir $_.Name
            Copy-Item -Path $_.FullName -Destination $Dest -Force
            Write-ColorOutput "  Restored: $($_.Name)" "Green"
        }
        
        # Очистка
        Remove-Item $TempZip -Force -ErrorAction SilentlyContinue
        Remove-Item $ExtractDir -Recurse -Force -ErrorAction SilentlyContinue
        
        Write-ColorOutput "=======================================" "Green"
        Write-ColorOutput "Update completed successfully!" "Green"
        Write-ColorOutput "New version: $LatestVersion" "Green"
        Write-ColorOutput "Restart the generator to apply changes" "Yellow"
        Write-ColorOutput "=======================================" "Green"
        
    } catch {
        Write-ColorOutput "Error during update: $($_.Exception.Message)" "Red"
        
        # Очистка при ошибке
        if (Test-Path $TempZip) { Remove-Item $TempZip -Force }
        if (Test-Path $ExtractDir) { Remove-Item $ExtractDir -Recurse -Force }
        
        exit 1
    }
    
} catch {
    # Проверяем, может это 404 (репозиторий не найден)
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-ColorOutput "Repository not found: $Repo" "Red"
        Write-ColorOutput "Please check the repository name in config.json" "Yellow"
    } elseif ($_.Exception.Response.StatusCode -eq 403) {
        Write-ColorOutput "Rate limit exceeded. Try again later." "Red"
    } else {
        Write-ColorOutput "Error checking for updates: $($_.Exception.Message)" "Red"
    }
    exit 1
}