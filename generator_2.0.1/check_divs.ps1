$content = Get-Content 'C:\Проекты\Генератор\generator_master\generator_new.html' -Raw -Encoding UTF8
$opens = ([regex]::Matches($content, '<div[\s>]')).Count
$closes = ([regex]::Matches($content, '</div>')).Count
Write-Output "Opens: $opens, Closes: $closes, Diff: $($opens - $closes)"
