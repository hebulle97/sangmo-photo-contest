@echo off
chcp 65001 > nul
title 상모성당 설립 25주년 기념 사진 콘테스트 시스템

echo ================================================================
echo    [천주교대구대교구 상모성당] 설립 25주년 기념 사진 콘테스트
echo    현장 모바일 투표 및 관리자 시스템을 시작합니다...
echo ================================================================
echo.

:: Node.js 설치 확인
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [경고] Node.js가 설치되어 있지 않습니다.
    echo https://nodejs.org 에서 Node.js LTS 버전을 설치해 주세요.
    pause
    exit /b
)

:: 패키지 설치 확인 (node_modules가 없는 경우 자동 설치)
if not exist node_modules (
    echo [안내] 처음 실행 감지: 필요한 라이브러리를 설치합니다...
    call npm install
)

echo.
echo [1/2] 웹 서버를 구동하고 있습니다...
echo [2/2] 관리자 화면이 브라우저에서 자동으로 열립니다.
echo.
echo * 관리자 초기 아이디: admin
echo * 관리자 초기 비밀번호: sangmo25
echo.

start "" http://localhost:3000/admin
node server.js

pause
