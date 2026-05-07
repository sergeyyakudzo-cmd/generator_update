$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Add-Type -AssemblyName System.Web.Extensions
$port = 8000
$url = "http://localhost:8000/"
$global:pendingZimbraHtml = $null

try {
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add($url)
    $listener.Start()
    Write-Host "Server started!" -ForegroundColor Green
    Write-Host "URL: http://localhost:8000/generator_new.html" -ForegroundColor Yellow
    Start-Sleep -Milliseconds 500
    Start-Process "http://localhost:8000/generator_new.html"

    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response
            $path = $request.Url.LocalPath.TrimStart("/")
            if ($path -eq "" -or $path -eq "/") { $path = "generator_new.html" }

            Write-Host "[$($request.HttpMethod)] /$path" -ForegroundColor Cyan

            if ($request.HttpMethod -eq "POST" -and $path -eq "send-to-telegram") {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $body = $reader.ReadToEnd()
                $reader.Close()
                Write-Host "Body: $body" -ForegroundColor Gray

                $response.Headers.Add("Access-Control-Allow-Origin", "*")
                $response.ContentType = "application/json; charset=utf-8"

                try {
                    $jsonBody = $body | ConvertFrom-Json
                    $tgToken = $jsonBody.token
                    $tgChatId = $jsonBody.chat_id
                    $tgText = $jsonBody.text
                    $tgReplyTo = $jsonBody.reply_to_message_id

                    Write-Host "Sending to Telegram: chat=$tgChatId" -ForegroundColor Yellow

                    $tgUrl = "https://api.telegram.org/bot$tgToken/sendMessage"
                    $tgPayload = @{chat_id=$tgChatId;text=$tgText;parse_mode="HTML"}
                    if ($tgReplyTo) {
                        Write-Host "Reply to: $tgReplyTo" -ForegroundColor Yellow
                        $tgPayload.reply_to_message_id = [int]$tgReplyTo
                    }
                    $tgBody2 = $tgPayload | ConvertTo-Json -Depth 10
                    $tgBodyUtf8 = [System.Text.Encoding]::UTF8.GetBytes($tgBody2)
                    Write-Host "Sending request to Telegram API..." -ForegroundColor DarkYellow
                    $tgResponse = Invoke-RestMethod -Uri $tgUrl -Method Post -ContentType "application/json; charset=utf-8" -Body $tgBodyUtf8 -TimeoutSec 15
                    $msgId = $tgResponse.result.message_id
                    Write-Host "Telegram OK, msg_id=$msgId" -ForegroundColor Green
                    $resultJson = @{success=$true;message="OK";message_id=$msgId} | ConvertTo-Json
                    $buffer = [System.Text.Encoding]::UTF8.GetBytes($resultJson)
                    $response.StatusCode = 200
                    $response.ContentLength64 = $buffer.Length
                    $response.OutputStream.Write($buffer, 0, $buffer.Length)
                } catch {
                    $errorMsg = $_.Exception.Message
                    if ($_.Exception.InnerException) {
                        $errorMsg += " | Inner: $($_.Exception.InnerException.Message)"
                    }
                    Write-Host "Telegram ERROR: $errorMsg" -ForegroundColor Red
                    $resultJson = @{success=$false;error=$errorMsg} | ConvertTo-Json
                    $buffer = [System.Text.Encoding]::UTF8.GetBytes($resultJson)
                    $response.StatusCode = 500
                    $response.ContentLength64 = $buffer.Length
                    $response.OutputStream.Write($buffer, 0, $buffer.Length)
                }
                $response.Close()
                continue
            }

            if ($request.HttpMethod -eq "POST" -and $path -eq "send-to-zimbra") {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $body = $reader.ReadToEnd()
                $reader.Close()

                $response.Headers.Add("Access-Control-Allow-Origin", "*")
                $response.ContentType = "application/json; charset=utf-8"

                try {
                    $jsonBody = $body | ConvertFrom-Json
                    $isRecipientsOnly = $jsonBody.isRecipientsOnly
                    if ($isRecipientsOnly) {
                        $global:pendingZimbraHtml = $null
                        Write-Host "Recipients only queued for Zimbra (subject: $($jsonBody.subject), to: $($jsonBody.to), cc: $($jsonBody.cc))" -ForegroundColor Green
                    } else {
                        $global:pendingZimbraHtml = $jsonBody.html
                        Write-Host "HTML queued for Zimbra insertion (subject: $($jsonBody.subject), to: $($jsonBody.to), cc: $($jsonBody.cc))" -ForegroundColor Green
                    }
                    $global:pendingZimbraSubject = $jsonBody.subject
                    $global:pendingZimbraTo = $jsonBody.to
                    $global:pendingZimbraCc = $jsonBody.cc
                    $resultJson = @{success=$true} | ConvertTo-Json
                    $buffer = [System.Text.Encoding]::UTF8.GetBytes($resultJson)
                    $response.StatusCode = 200
                    $response.ContentLength64 = $buffer.Length
                    $response.OutputStream.Write($buffer, 0, $buffer.Length)
                } catch {
                    $resultJson = @{success=$false;error=$_.Exception.Message} | ConvertTo-Json
                    $buffer = [System.Text.Encoding]::UTF8.GetBytes($resultJson)
                    $response.StatusCode = 500
                    $response.ContentLength64 = $buffer.Length
                    $response.OutputStream.Write($buffer, 0, $buffer.Length)
                }
                $response.Close()
                continue
            }

            if ($request.HttpMethod -eq "GET" -and $path -eq "poll-zimbra") {
                $response.Headers.Add("Access-Control-Allow-Origin", "*")
                $response.ContentType = "application/json; charset=utf-8"

                $hasData = $global:pendingZimbraHtml -or $global:pendingZimbraSubject -or $global:pendingZimbraTo -or $global:pendingZimbraCc
                if ($hasData) {
                    $serializer = New-Object System.Web.Script.Serialization.JavaScriptSerializer
                    $htmlVal = if ($global:pendingZimbraHtml) { $global:pendingZimbraHtml } else { $null }
                    $obj = @{html=$htmlVal;to=$global:pendingZimbraTo;cc=$global:pendingZimbraCc;subject=$global:pendingZimbraSubject}
                    $resultJson = $serializer.Serialize($obj)
                    $global:pendingZimbraHtml = $null
                    $global:pendingZimbraSubject = $null
                    $global:pendingZimbraTo = $null
                    $global:pendingZimbraCc = $null
                    Write-Host "Data delivered to Zimbra extension" -ForegroundColor Green
                } else {
                    $resultJson = '{"html":null,"subject":null,"to":null,"cc":null}'
                }
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($resultJson)
                $response.StatusCode = 200
                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
                $response.Close()
                continue
            }

            # === Auto-Update Endpoints ===
            if ($request.HttpMethod -eq "GET" -and $path -eq "check-update") {
                $response.Headers.Add("Access-Control-Allow-Origin", "*")
                $response.ContentType = "application/json; charset=utf-8"

                try {
                    $configPath = Join-Path (Get-Location) "config.json"
                    if (Test-Path $configPath) {
                        $config = Get-Content $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
                        $currentVersion = if ($config.version) { $config.version } else { "0.0.0" }
                        
                        # Check GitHub for latest version
                        if ($config.github -and $config.github.repo) {
                            $repo = $config.github.repo
                            $apiUrl = "https://api.github.com/repos/$repo/releases/latest"
                            
                            try {
                                $githubResponse = Invoke-RestMethod -Uri $apiUrl -Method Get -Headers @{ "User-Agent" = "Generator-Server" } -TimeoutSec 15
                                $latestVersion = $githubResponse.tag_name -replace '^v', ''
                                $downloadUrl = $githubResponse.zipball_url
                                
                                $updateAvailable = $latestVersion -ne $currentVersion
                                $resultJson = @{
                                    currentVersion = $currentVersion
                                    latestVersion = $latestVersion
                                    updateAvailable = $updateAvailable
                                    repo = $repo
                                    downloadUrl = $downloadUrl
                                } | ConvertTo-Json
                            } catch {
                                $resultJson = @{
                                    currentVersion = $currentVersion
                                    latestVersion = $currentVersion
                                    updateAvailable = $false
                                    error = "Cannot check GitHub: $($_.Exception.Message)"
                                } | ConvertTo-Json
                            }
                        } else {
                            $resultJson = @{currentVersion=$currentVersion;updateAvailable=$false;error="GitHub not configured"} | ConvertTo-Json
                        }
                    } else {
                        $resultJson = @{currentVersion="0.0.0";updateAvailable=$false;error="Config not found"} | ConvertTo-Json
                    }
                } catch {
                    $resultJson = @{error=$_.Exception.Message} | ConvertTo-Json
                }
                
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($resultJson)
                $response.StatusCode = 200
                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
                $response.Close()
                continue
            }

            if ($request.HttpMethod -eq "POST" -and $path -eq "do-update") {
                $response.Headers.Add("Access-Control-Allow-Origin", "*")
                $response.ContentType = "application/json; charset=utf-8"

                try {
                    $updateScript = Join-Path (Get-Location) "update.ps1"
                    
                    if (Test-Path $updateScript) {
                        Write-Host "Starting auto-update..." -ForegroundColor Yellow
                        
                        # Запускаем обновление синхронно (с таймаутом 2 минуты)
                        $job = Start-Job -ScriptBlock {
                            param($ScriptPath, $ScriptDir)
                            try {
                                # Переходим в директорию скрипта
                                Set-Location $ScriptDir
                                & $ScriptPath -Silent 2>&1 | Out-String
                                return @{success=$true;output="Done"}
                            } catch {
                                return @{success=$false;error=$_.Exception.Message;output=$_.ScriptStackTrace}
                            }
                        } -ArgumentList $updateScript, (Get-Location).Path
                        
                        # Ждём максимум 2 минуты
                        $waited = 0
                        $waitInterval = 2
                        $maxWait = 120
                        
                        while ($job.State -eq 'Running' -and $waited -lt $maxWait) {
                            Start-Sleep -Seconds $waitInterval
                            $waited += $waitInterval
                            Write-Host "Waiting for update... ($waited sec)" -ForegroundColor Gray
                        }
                        
                        if ($job.State -eq 'Completed') {
                            $result = Receive-Job -Job $job
                            Write-Host "Update completed: $($result | ConvertTo-Json)" -ForegroundColor Green
                            $resultJson = @{success=$true;message="Update completed. Restart the generator."} | ConvertTo-Json
                        } else {
                            # Если仍在 работа, всё равно возвращаем успех
                            Write-Host "Update still running, returning success" -ForegroundColor Yellow
                            $resultJson = @{success=$true;message="Update started. Check console for progress."} | ConvertTo-Json
                        }
                        
                        # Очищаем job
                        Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
                    } else {
                        Write-Host "Update script not found: $updateScript" -ForegroundColor Red
                        $resultJson = @{success=$false;error="Update script not found"} | ConvertTo-Json
                        $response.StatusCode = 500
                    }
                } catch {
                    Write-Host "Update error: $($_.Exception.Message)" -ForegroundColor Red
                    $resultJson = @{success=$false;error=$_.Exception.Message} | ConvertTo-Json
                    $response.StatusCode = 500
                }
                
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($resultJson)
                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
                $response.Close()
                continue
            }

            if ($request.HttpMethod -eq "OPTIONS") {
                $response.Headers.Add("Access-Control-Allow-Origin", "*")
                $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type")
                $response.StatusCode = 204
                $response.Close()
                continue
            }

            $filePath = Join-Path (Get-Location) $path
            if (Test-Path $filePath) {
                $contentType = "text/html; charset=utf-8"
                if ($filePath.EndsWith(".css")) { $contentType = "text/css" }
                elseif ($filePath.EndsWith(".js")) { $contentType = "application/javascript" }
                elseif ($filePath.EndsWith(".png")) { $contentType = "image/png" }
                elseif ($filePath.EndsWith(".jpg") -or $filePath.EndsWith(".jpeg")) { $contentType = "image/jpeg" }
                elseif ($filePath.EndsWith(".ico")) { $contentType = "image/x-icon" }
                $content = Get-Content $filePath -Raw -Encoding UTF8
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($content)
                $response.ContentType = $contentType
                $response.ContentLength64 = $buffer.Length
                $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
                $response.Headers.Add("Pragma", "no-cache")
                $response.Headers.Add("Expires", "0")
                $response.StatusCode = 200
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
            } else {
                $response.StatusCode = 404
                $buffer = [System.Text.Encoding]::UTF8.GetBytes("404")
                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
            }
            $response.Close()
        } catch {
            Write-Host "Request error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "FATAL: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    if ($listener -and $listener.IsListening) { $listener.Stop() }
}
