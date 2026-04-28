$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Add-Type -AssemblyName System.Web.Extensions

# Отключаем системный прокси для HTTP-запросов
function Disable-Proxy {
    $webClient = New-Object System.Net.WebClient
    $webClient.Proxy = $null
    return $webClient
}

# Используем WebClient вместо Invoke-RestMethod для Max API
$webClient = New-Object System.Net.WebClient
$webClient.Headers.Add("Content-Type", "application/json")

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
            $path = $request.Url.LocalPath
            if ($path -eq "" -or $path -eq "/") { $path = "generator_new.html" }

            Write-Host "[$($request.HttpMethod)] $path" -ForegroundColor Cyan
            Write-Host "Method is POST? $($request.HttpMethod -eq 'POST')" -ForegroundColor DarkGray
            Write-Host "Path is '/send-to-max'? $($path -eq '/send-to-max')" -ForegroundColor DarkGray

            if ($request.HttpMethod -eq "POST" -and $path -eq "/send-to-max") {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $body = $reader.ReadToEnd()
                $reader.Close()
                Write-Host "Body: $body" -ForegroundColor Gray

                $response.Headers.Add("Access-Control-Allow-Origin", "*")
                $response.ContentType = "application/json; charset=utf-8"

                try {
                    $jsonBody = $body | ConvertFrom-Json
                    $maxToken = $jsonBody.token
                    $maxText = $jsonBody.text

                    Write-Host "Sending to Max API..." -ForegroundColor Yellow

                    $maxUrl = "https://platform-api.max.ru/messages?user_id=103942412"
                    
                    # Формируем payload для Max API
                    $maxPayload = @{text = $maxText}
                    $maxBody = $maxPayload | ConvertTo-Json -Compress
                    Write-Host "Payload: $maxBody" -ForegroundColor DarkYellow
                    Write-Host "URL: $maxUrl" -ForegroundColor DarkYellow
                    Write-Host "Sending request to Max API..." -ForegroundColor DarkYellow
                    
                    # Пробуем curl.exe с записью в файл
                    $curlPath = (Get-Command curl.exe -ErrorAction SilentlyContinue).Source
                    $maxResponse = $null
                    $tempJson = [System.IO.Path]::GetTempFileName() + ".json"
                    $tempResponse = [System.IO.Path]::GetTempFileName()
                    
                    if ($curlPath) {
                        Write-Host "Using curl.exe with file..." -ForegroundColor Cyan
                        try {
                            # Записываем JSON в файл
                            [System.IO.File]::WriteAllText($tempJson, $maxBody, [System.Text.Encoding]::UTF8)
                            
                            # curl с файлом и Authorization header
                            $curlCmd = "curl.exe -s --data-binary `"@$tempJson`" -H `"Content-Type: application/json`" -H `"Authorization: $maxToken`" `"$maxUrl`" -o `"$tempResponse`""
                            Write-Host "curl cmd: $curlCmd" -ForegroundColor Gray
                            $null = Invoke-Expression $curlCmd
                            
                            if (Test-Path $tempResponse) {
                                $maxResponse = [System.IO.File]::ReadAllText($tempResponse, [System.Text.Encoding]::UTF8)
                            }
                            
                            Write-Host "curl response: $maxResponse" -ForegroundColor Gray
                        } catch {
                            Write-Host "curl failed: $($_.Exception.Message)" -ForegroundColor Yellow
                            $maxResponse = $null
                        } finally {
                            Remove-Item $tempJson -Force -EA SilentlyContinue
                            Remove-Item $tempResponse -Force -EA SilentlyContinue
                        }
                    }
                    
                    # Fallback: WebClient
                    if (-not $maxResponse) {
                        Write-Host "Using WebClient..." -ForegroundColor Cyan
                        $wc = New-Object System.Net.WebClient
                        $wc.Proxy = $null
                        $wc.Encoding = [System.Text.Encoding]::UTF8
                        $wc.Headers.Add("Content-Type", "application/json")
                        $wc.Headers.Add("Authorization", $maxToken)
                        try {
                            $maxResponse = $wc.UploadString($maxUrl, "POST", $maxBody)
                        } catch {
                            throw "Connection failed: $($_.Exception.Message)"
                        } finally {
                            $wc.Dispose()
                        }
                    }
                    
                    Write-Host "Max Response: $maxResponse" -ForegroundColor Green
                    
                    # Парсим ответ Max API
                    try {
                        $maxResponseObj = $maxResponse | ConvertFrom-Json
                        
                        # Проверяем ответ Max API
                        if ($maxResponseObj.message) {
                            $msgId = $maxResponseObj.message.body.mid
                            Write-Host "Max OK, msg_id=$msgId" -ForegroundColor Green
                            $resultJson = @{success=$true;message="OK";message_id=$msgId} | ConvertTo-Json
                        } else {
                            throw "Max API Error: $($maxResponseObj.message)"
                        }
                    } catch {
                        Write-Host "JSON parse error. Raw response: $maxResponse" -ForegroundColor Red
                        throw "Max API returned non-JSON response: $maxResponse"
                    }
                    
                    $buffer = [System.Text.Encoding]::UTF8.GetBytes($resultJson)
                    $response.ContentLength64 = $buffer.Length
                    $response.OutputStream.Write($buffer, 0, $buffer.Length)
                } catch {
                    $errorMsg = $_.Exception.Message
                    if ($_.Exception.InnerException) {
                        $errorMsg += " | Inner: $($_.Exception.InnerException.Message)"
                    }
                    Write-Host "Max ERROR: $errorMsg" -ForegroundColor Red
                    $resultJson = @{success=$false;error=$errorMsg} | ConvertTo-Json
                    $buffer = [System.Text.Encoding]::UTF8.GetBytes($resultJson)
                    $response.StatusCode = 500
                    $response.ContentLength64 = $buffer.Length
                    $response.OutputStream.Write($buffer, 0, $buffer.Length)
                }
                $response.Close()
                continue
            }

            if ($request.HttpMethod -eq "POST" -and $path -eq "/send-to-zimbra") {
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

            if ($request.HttpMethod -eq "GET" -and $path -eq "/poll-zimbra") {
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
            if ($request.HttpMethod -eq "GET" -and $path -eq "/check-update") {
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
                                
                                # Version comparison
                                try {
                                    $currentVer = [version]$currentVersion
                                    $latestVer = [version]$latestVersion
                                    $updateAvailable = $latestVer -gt $currentVer
                                } catch {
                                    $updateAvailable = $latestVersion -ne $currentVersion
                                }
                                
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

            if ($request.HttpMethod -eq "POST" -and $path -eq "/do-update") {
                $response.Headers.Add("Access-Control-Allow-Origin", "*")
                $response.ContentType = "application/json; charset=utf-8"

                try {
                    $updateScript = Join-Path (Get-Location) "update.ps1"
                    
                    if (Test-Path $updateScript) {
                        Write-Host "Starting auto-update..." -ForegroundColor Yellow
                        
                        $job = Start-Job -ScriptBlock {
                            param($ScriptPath)
                            try {
                                & $ScriptPath 2>&1 | Out-String
                                return @{success=$true;output="Done"}
                            } catch {
                                return @{success=$false;error=$_.Exception.Message;output=$_.ScriptStackTrace}
                            }
                        } -ArgumentList $updateScript
                        
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
