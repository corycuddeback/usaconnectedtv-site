<#
.SYNOPSIS
    Deploys usaconnectedtv.com by pushing main to GitHub, which triggers GitHub Pages.

.DESCRIPTION
    1. Syncs local main with GitHub (fast-forward only).
    2. Commits any local changes (requires -Message).
    3. Pushes main.
    4. Waits for the "pages-build-deployment" run for that commit to finish.
    5. Checks that the live site responds.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1 -DryRun
    powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1 -Message "Update pricing section"
#>
param(
    [string]$Message,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$SiteUrl = 'https://usaconnectedtv.com'
$Workflow = 'pages-build-deployment'

function Find-Exe($name, $fallback) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    if (Test-Path $fallback) { return $fallback }
    throw "$name not found. Install it with: winget install $name"
}
$git = Find-Exe 'git' 'C:\Program Files\Git\cmd\git.exe'
$gh = Find-Exe 'gh' 'C:\Program Files\GitHub CLI\gh.exe'
# gh shells out to git, so make sure git is on PATH even in shells opened before it was installed.
$env:Path = (Split-Path $git -Parent) + ';' + $env:Path
$Repo = 'corycuddeback/usaconnectedtv-site'

function Git {
    & $git @args
    if ($LASTEXITCODE -ne 0) { throw "git $($args -join ' ') failed (exit $LASTEXITCODE)" }
}

function Step($text) { Write-Host "`n==> $text" -ForegroundColor Cyan }

Set-Location (Split-Path $PSScriptRoot -Parent)

& $gh auth status *> $null
if ($LASTEXITCODE -ne 0) { throw 'Not signed in to GitHub. Run: gh auth login' }

$branch = (& $git rev-parse --abbrev-ref HEAD).Trim()
if ($branch -ne 'main') { throw "On branch '$branch'. Switch to main before deploying." }

Step 'Syncing with GitHub'
Git fetch origin main --quiet
$behind = [int](& $git rev-list --count HEAD..origin/main)
if ($behind -gt 0) {
    Write-Host "Local main is $behind commit(s) behind GitHub; fast-forwarding."
    $dirty = & $git status --porcelain
    if ($dirty) { Git stash push --include-untracked --quiet -m 'deploy.ps1 autostash' }
    Git merge --ff-only origin/main --quiet
    if ($dirty) { Git stash pop --quiet }
}

$changes = & $git status --porcelain
if ($changes) {
    Step 'Uncommitted changes'
    $changes | ForEach-Object { Write-Host "  $_" }
    if (-not $Message) { throw 'There are uncommitted changes. Re-run with -Message "describe the change" to commit them.' }
    if (-not $DryRun) {
        Git add -A
        Git commit -m $Message --quiet
    }
}

$ahead = [int](& $git rev-list --count origin/main..HEAD)
if ($ahead -eq 0 -and -not ($changes -and $DryRun)) {
    Write-Host "`nNothing to deploy: GitHub main already matches local main." -ForegroundColor Yellow
    exit 0
}

Step 'Commits to deploy'
& $git log --oneline origin/main..HEAD
if ($changes -and $DryRun) { Write-Host "  (plus a new commit: '$Message')" }

if ($DryRun) {
    Write-Host "`nDry run: nothing was committed or pushed." -ForegroundColor Yellow
    exit 0
}

Step 'Pushing to GitHub'
Git push origin main --quiet
$sha = (& $git rev-parse HEAD).Trim()
Write-Host "Pushed $($sha.Substring(0,7))"

Step 'Waiting for GitHub Pages deployment'
$runId = $null
for ($i = 0; $i -lt 30 -and -not $runId; $i++) {
    Start-Sleep -Seconds 5
    $runs = & $gh run list --repo $Repo --workflow $Workflow --branch main --limit 10 --json databaseId,headSha | ConvertFrom-Json
    $match = $runs | Where-Object { $_.headSha -eq $sha } | Select-Object -First 1
    if ($match) { $runId = $match.databaseId }
}
if (-not $runId) { throw 'No Pages deployment started within 2.5 minutes. Check the Actions tab on GitHub.' }

& $gh run watch $runId --repo $Repo --exit-status --interval 5
if ($LASTEXITCODE -ne 0) { throw "Pages deployment failed. See: gh run view $runId --repo $Repo --log-failed" }

Step 'Checking live site'
try {
    $resp = Invoke-WebRequest "$SiteUrl/?deploy=$($sha.Substring(0,7))" -UseBasicParsing -TimeoutSec 30
    Write-Host "$SiteUrl responded $($resp.StatusCode)."
} catch {
    throw "Deployment finished but $SiteUrl did not respond: $($_.Exception.Message)"
}

Write-Host "`nDeployed $($sha.Substring(0,7)) to $SiteUrl" -ForegroundColor Green
Write-Host 'GitHub Pages caching can delay changes by a few minutes; hard-refresh (Ctrl+F5) if you still see the old version.'
