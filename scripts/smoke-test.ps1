#!/usr/bin/env pwsh
# scripts/smoke-test.ps1
# Production Docker smoke test — verifies all critical endpoints respond correctly
# Usage: ./scripts/smoke-test.ps1 [-ApiUrl http://localhost:4000] [-WebUrl http://localhost:3000]

param(
  [string]$ApiUrl = $env:API_URL ?? "http://localhost:4000",
  [string]$WebUrl = $env:WEB_URL ?? "http://localhost:3000"
)

$ErrorActionPreference = "Stop"
$failed = 0
$passed = 0

function Test-Endpoint {
  param([string]$Label, [string]$Url, [int]$ExpectedStatus = 200, [string]$ExpectedBody = "")
  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    $status = $response.StatusCode
    if ($status -eq $ExpectedStatus) {
      if ($ExpectedBody -and -not ($response.Content -match $ExpectedBody)) {
        Write-Host "  [FAIL] $Label — status $status OK but body missing '$ExpectedBody'" -ForegroundColor Red
        $script:failed++
      } else {
        Write-Host "  [PASS] $Label ($status)" -ForegroundColor Green
        $script:passed++
      }
    } else {
      Write-Host "  [FAIL] $Label — expected $ExpectedStatus got $status" -ForegroundColor Red
      $script:failed++
    }
  } catch {
    $msg = $_.Exception.Message
    # 401 on protected endpoints is expected behaviour
    if ($msg -match "401" -and $ExpectedStatus -eq 401) {
      Write-Host "  [PASS] $Label (401 expected)" -ForegroundColor Green
      $script:passed++
    } elseif ($msg -match "404" -and $ExpectedStatus -eq 404) {
      Write-Host "  [PASS] $Label (404 expected)" -ForegroundColor Green
      $script:passed++
    } else {
      Write-Host "  [FAIL] $Label — $msg" -ForegroundColor Red
      $script:failed++
    }
  }
}

Write-Host "`nTrackfluence Production Smoke Test" -ForegroundColor Cyan
Write-Host "API: $ApiUrl   Web: $WebUrl`n"

Write-Host "── API Health ────────────────────────────────────" -ForegroundColor DarkCyan
Test-Endpoint "Health check"        "$ApiUrl/api/v1/health"         200 '"status"'
Test-Endpoint "Swagger docs HTML"   "$ApiUrl/api/docs"              200

Write-Host "`n── Auth endpoints ────────────────────────────────" -ForegroundColor DarkCyan
Test-Endpoint "Auth register (empty→400)" "$ApiUrl/api/v1/auth/register" 400
Test-Endpoint "Auth login (empty→401)"    "$ApiUrl/api/v1/auth/login"    401

Write-Host "`n── Protected endpoints return 401 ───────────────" -ForegroundColor DarkCyan
Test-Endpoint "GET /api/v1/creators"               "$ApiUrl/api/v1/creators"               401
Test-Endpoint "GET /api/v1/campaigns"              "$ApiUrl/api/v1/campaigns"              401
Test-Endpoint "GET /api/v1/revenue-intelligence/dashboard" "$ApiUrl/api/v1/revenue-intelligence/dashboard" 401
Test-Endpoint "GET /api/v1/admin/users"            "$ApiUrl/api/v1/admin/users"            401
Test-Endpoint "GET /api/v1/audit/logs"             "$ApiUrl/api/v1/audit/logs"             401

Write-Host "`n── Web pages ─────────────────────────────────────" -ForegroundColor DarkCyan
Test-Endpoint "Web root"       "$WebUrl/"          200
Test-Endpoint "Web /login"     "$WebUrl/login"     200
Test-Endpoint "Web /register"  "$WebUrl/register"  200
Test-Endpoint "Web /portal"    "$WebUrl/portal"    200

Write-Host "`n──────────────────────────────────────────────────"
Write-Host "Results: $passed passed, $failed failed" -ForegroundColor ($failed -eq 0 ? "Green" : "Red")

if ($failed -gt 0) {
  exit 1
}
