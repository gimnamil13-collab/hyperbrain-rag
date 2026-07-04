# Wait for Next.js dev server, then open browser exactly once per session.
$lock = Join-Path $env:TEMP "hyperbrain_rag_browser.lock"
if (Test-Path $lock) { exit 0 }

$url = "http://localhost:3000"
for ($i = 0; $i -lt 45; $i++) {
    try {
        $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
        if ($r.StatusCode -eq 200) {
            New-Item -Path $lock -ItemType File -Force | Out-Null
            Start-Process $url
            exit 0
        }
    } catch {}
    Start-Sleep -Seconds 2
}
