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
    
    # Сравнение версий (простое строковое сравнение для MVP)
    if ($LatestVersion -eq $CurrentVersion) {
        Write-ColorOutput "You have the latest version!" "Green"
        exit 0
    }
    
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
        
        # Создание резервной копии
        $BackupDir = Join-Path $ScriptDir "backup_$((Get-Date).ToString('yyyyMMdd_HHmmss'))"
        Write-ColorOutput "Creating backup in: $BackupDir" "Yellow"
        
        # Файлы которые НЕ надо удалять при обновлении (защищенные)
        $ProtectedFiles = @("config.json", "start.bat")
        $ProtectedDirs = @("backup_*")
        
        # Резервное копированиеprotected файлов
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
        foreach ($Protected in $ProtectedFiles) {
            $Src = Join-Path $ScriptDir $Protected
            if (Test-Path $Src) {
                Copy-Item -Path $Src -Destination $BackupDir -Force
                Write-ColorOutput "  Backed up: $Protected" "Cyan"
            }
        }
        
        # Удаление старых файлов (кроме защищенных)
        Write-ColorOutput "Removing old files..." "Yellow"
        Get-ChildItem -Path $ScriptDir -File | Where-Object {
            $ProtectedFiles -notcontains $_.Name
        } | ForEach-Object {
            Write-ColorOutput "  Deleting: $($_.Name)" "Gray"
            Remove-Item $_.FullName -Force
        }
        
        # Удаление старых папок (кроме backup и icons)
        Get-ChildItem -Path $ScriptDir -Directory | Where-Object {
            $_.Name -ne "backup_*" -and $_.Name -ne "icons"
        } | ForEach-Object {
            Write-ColorOutput "  Deleting folder: $($_.Name)" "Gray"
            Remove-Item $_.FullName -Recurse -Force
        }
        
        # Распаковка новых файлов
        Write-ColorOutput "Extracting new files..." "Green"
        
        # Определение способа распаковки
        $ExtractDir = Join-Path $env:TEMP "generator_extract_$(Get-Random)"
        New-Item -ItemType Directory -Path $ExtractDir -Force | Out-Null
        
        # PowerShell 5.1 doesn't have Expand-Archive with -Force for existing files
        # Using .NET for extraction
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $Zip = [System.IO.Compression.ZipFile]::OpenRead($TempZip)
        
        foreach ($Entry in $Zip.Entries) {
            $FullPath = Join-Path $ExtractDir $Entry.FullName
            
            # Пропускаем корневую папку в архиве
            if ($Entry.FullName -match '^[A-Za-z]:?[/\\]?$') { continue }
            
            # Извлекаем только первый уровень вложенности (имя репозитория)
            $PathParts = $Entry.FullName -split '[/\\]'
            if ($PathParts.Count -le 1) { continue }
            
            # Пропускаем папку репозитория
            if ($PathParts.Count -eq 2 -and $Entry.FullName.EndsWith('/')) { continue }
            
            # Файлы из вложенной папки (обычно repo-name/src/...)
            if ($PathParts.Count -ge 3) {
                # Пропускаем первые 2 папки (repo-name/ и branch-name/ или src/)
                $RelativePath = $PathParts[2..($PathParts.Count-1)] -join '/'
                $DestPath = Join-Path $ScriptDir $RelativePath
                
                # Создаем директорию если нужно
                $DestDir = Split-Path $DestPath
                if (-not (Test-Path $DestDir)) {
                    New-Item -ItemType Directory -Path $DestDir -Force | Out-Null
                }
                
                # Копируем файл
                if (-not $Entry.FullName.EndsWith('/')) {
                    $Entry.ExtractToFile($DestPath, $true)
                }
            }
        }
        
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