@echo off
REM sync-to-philly-repo.cmd
REM =================================================================
REM Windows CMD equivalent of sync-to-philly-repo.sh. Same behaviour:
REM clones the monorepo + the target Philly repo, rsyncs (via
REM robocopy) the extracted standalone over the target, commits,
REM pushes.
REM
REM Usage:
REM   sync-to-philly-repo.cmd <PHILLY_REPO_URL> [BRANCH]
REM
REM Example:
REM   sync-to-philly-repo.cmd https://github.com/bongartzdiaz/DEUS-SHARED.git main
REM
REM Dependencies: git (shipped with Git for Windows). No bash, no
REM rsync, no curl — pure CMD + git + robocopy.
REM =================================================================

setlocal enabledelayedexpansion

set "PHILLY_URL=%~1"
set "TARGET_BRANCH=%~2"
if "%TARGET_BRANCH%"=="" set "TARGET_BRANCH=main"

if "%PHILLY_URL%"=="" (
    echo Usage: %~nx0 ^<PHILLY_REPO_URL^> [BRANCH]
    echo.
    echo Example: %~nx0 https://github.com/bongartzdiaz/DEUS-SHARED.git main
    exit /b 1
)

set "MONOREPO_URL=https://github.com/bongartzdiaz/juandiazllc.com"
set "MONOREPO_BRANCH=claude/ai-command-bar"
set "WORK_DIR=%TEMP%\philly-sync-%RANDOM%"

echo.
echo ===============================================================
echo  Syncing Philly CRM standalone -^> %PHILLY_URL% (%TARGET_BRANCH%)
echo  Workspace: %WORK_DIR%
echo ===============================================================

mkdir "%WORK_DIR%" || (echo Failed to create workspace & exit /b 1)

echo.
echo [1/5] Clone monorepo source
git clone --depth 1 --branch "%MONOREPO_BRANCH%" "%MONOREPO_URL%" "%WORK_DIR%\monorepo"
if errorlevel 1 (echo Monorepo clone failed & goto :cleanup_fail)

set "SOURCE_DIR=%WORK_DIR%\monorepo\apps\philly-standalone"
if not exist "%SOURCE_DIR%" (
    echo ERROR: %SOURCE_DIR% not found.
    goto :cleanup_fail
)

for /f %%i in ('git -C "%WORK_DIR%\monorepo" rev-parse --short HEAD') do set "SOURCE_SHA=%%i"

echo.
echo [2/5] Clone target Philly repo
git clone "%PHILLY_URL%" "%WORK_DIR%\target"
if errorlevel 1 (echo Target clone failed & goto :cleanup_fail)

echo.
echo [3/5] Check out target branch (%TARGET_BRANCH%)
pushd "%WORK_DIR%\target"
git show-ref --quiet "refs/remotes/origin/%TARGET_BRANCH%"
if errorlevel 1 (
    echo   Branch doesn't exist, creating
    git checkout -b "%TARGET_BRANCH%"
) else (
    git checkout "%TARGET_BRANCH%"
)

echo.
echo [4/5] Robocopy extracted standalone over target
REM /E      = copy all subdirectories (incl. empty)
REM /PURGE  = delete dest files/dirs not in source (like rsync --delete)
REM /XD     = exclude directories
REM /NFL /NDL /NP = quieter output
robocopy "%SOURCE_DIR%" "%WORK_DIR%\target" /E /PURGE /XD .git .github node_modules .next /NFL /NDL /NP
REM Robocopy exit codes 0-7 are all "success" (with different nuances).
REM 8+ is an error. Normalise anything <=7 to 0.
if %ERRORLEVEL% GEQ 8 (
    echo Robocopy reported error code %ERRORLEVEL%
    popd
    goto :cleanup_fail
)

echo.
echo [5/5] Commit and push
git add -A
git diff --cached --quiet
if errorlevel 1 (
    git commit -m "sync from juandiazllc.com monorepo (%SOURCE_SHA%)"
    if errorlevel 1 (echo Commit failed & popd & goto :cleanup_fail)
    git push origin "%TARGET_BRANCH%"
    if errorlevel 1 (echo Push failed & popd & goto :cleanup_fail)
    echo.
    echo ===============================================================
    echo  Pushed to %PHILLY_URL% on %TARGET_BRANCH%
    echo ===============================================================
) else (
    echo   No changes — target was already in sync.
)

popd
rmdir /s /q "%WORK_DIR%" 2>nul
exit /b 0

:cleanup_fail
rmdir /s /q "%WORK_DIR%" 2>nul
exit /b 1
