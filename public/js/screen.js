// 대형 스크린 프론트엔드 스크립트
const socket = io();

let finalists = [];
let votingState = {};
let settings = {};
let currentSlideIndex = 0;
let slideInterval = null;
let slideProgressInterval = null;
let slideSecondsLeft = 15;

// DOM 캐시
const screenTimer = document.getElementById('screenTimer');
const screenStatusBadge = document.getElementById('screenStatusBadge');
const screenQrImage = document.getElementById('screenQrImage');
const screenQrUrl = document.getElementById('screenQrUrl');
const screenVotersCount = document.getElementById('screenVotersCount');
const blindBarsContainer = document.getElementById('blindBarsContainer');
const blindStatusTitle = document.getElementById('blindStatusTitle');
const blindNotice = document.getElementById('blindNotice');
const rankScoreGuide = document.getElementById('rankScoreGuide');

const viewIntro = document.getElementById('viewIntro');
const viewVote = document.getElementById('viewVote');
const btnModeIntro = document.getElementById('btnModeIntro');
const btnModeVote = document.getElementById('btnModeVote');
const btnFullscreen = document.getElementById('btnFullscreen');

// 슬라이드 DOM
const introImage = document.getElementById('introImage');
const introCandidateNumber = document.getElementById('introCandidateNumber');
const introCategoryBadge = document.getElementById('introCategoryBadge');
const introGroupName = document.getElementById('introGroupName');
const introPhotoTitle = document.getElementById('introPhotoTitle');
const introPhotoDesc = document.getElementById('introPhotoDesc');
const introCounter = document.getElementById('introCounter');
const introSlideProgress = document.getElementById('introSlideProgress');
const btnPrevIntro = document.getElementById('btnPrevIntro');
const btnNextIntro = document.getElementById('btnNextIntro');

function formatTime(seconds) {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.max(0, seconds) % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// 1. 초기 상태 로드
async function initScreen() {
  try {
    const res = await fetch('/api/state');
    const data = await res.json();
    settings = data.settings;
    finalists = data.finalists || [];
    votingState = data.votingState || {};

    updateQrCode();
    updateScreenUI();

    // 본선 후보가 있으면 즉시 첫 번째 후보 사진 렌더링 및 슬라이드 시작!
    if (finalists && finalists.length > 0) {
      showIntroSlide(0);
      startSlideLoop();
    }
  } catch (err) {
    console.error('스크린 초기화 에러:', err);
  }
}

// QR 코드 로드
async function updateQrCode() {
  try {
    const res = await fetch('/api/qr');
    const data = await res.json();
    screenQrImage.src = data.qrDataUrl;
    screenQrUrl.textContent = data.voteUrl;
  } catch (err) {
    console.error('QR 로드 실패:', err);
  }
}

// UI 전체 갱신
function updateScreenUI() {
  screenTimer.textContent = formatTime(votingState.remainingSeconds);
  screenVotersCount.innerHTML = `${votingState.totalVoters || 0}<span style="font-size: 1.2rem; color: #94a3b8;">명</span>`;

  const isEnded = votingState.status === 'ended' || (votingState.remainingSeconds <= 0 && votingState.status !== 'ready');

  if (votingState.status === 'active') {
    screenStatusBadge.className = 'badge badge-rose';
    screenStatusBadge.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 투표 진행 중';
  } else if (isEnded) {
    screenStatusBadge.className = 'badge badge-purple';
    screenStatusBadge.innerHTML = '<i class="fa-solid fa-flag-checkered"></i> 5분 마감 완료 (결과 공개)';
  } else {
    screenStatusBadge.className = 'badge badge-gold';
    screenStatusBadge.innerHTML = '<i class="fa-solid fa-clock"></i> 투표 준비 중';
  }

  renderBlindBars(isEnded);
}

// 블라인드 막대 그래프 렌더링
// isEnded === false : 기호 번호 및 단체명 비공개 (물음표 또는 블라인드 A, B, C, D, E)
// isEnded === true : 기호 1~5번 및 단체명/작품명 화려하게 언베일 및 순위별 점수 노출
function renderBlindBars(isEnded) {
  if (!finalists || finalists.length === 0) {
    blindBarsContainer.innerHTML = '<div style="color:#94a3b8; text-align:center; padding:30px;">본선 후보가 설정되지 않았습니다.</div>';
    return;
  }

  // 총 득표수 계산 (최대 득표수 기준으로 프로그레스 바 계산)
  const maxVotes = Math.max(1, ...finalists.map(f => f.photo2VoteCount || 0));

  if (!isEnded) {
    // [마감 전: 블라인드 모드]
    blindStatusTitle.innerHTML = '<i class="fa-solid fa-eye-slash text-rose"></i> 5분 마감 전: 기호 비공개 블라인드 득표수 표출';
    blindNotice.textContent = '* 공정한 투표를 위해 5분 종료 전까지 후보 정보가 비공개되며 득표수만 실시간 변동됩니다.';
    rankScoreGuide.style.display = 'none';

    // 득표순 또는 임의 순서로 블라인드 카드 렌더링 (후보 식별 불가능하도록 슬롯 인덱스 기반)
    const blindLabels = ['후보작 A', '후보작 B', '후보작 C', '후보작 D', '후보작 E'];

    blindBarsContainer.innerHTML = finalists.map((f, idx) => {
      const votes = f.photo2VoteCount || 0;
      const pct = Math.round((votes / maxVotes) * 100);

      return `
        <div class="blind-bar-card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:10px;">
              <span class="badge badge-gold" style="font-size:0.95rem; padding:4px 12px;">
                <i class="fa-solid fa-shield-halved"></i> ${blindLabels[idx] || `후보 ${idx+1}`}
              </span>
              <span style="color:#94a3b8; font-size:0.85rem;">(5분 마감 시 기호 공개)</span>
            </div>
            <div style="font-size:1.4rem; font-weight:900; color:var(--accent-gold-light);">
              ${votes} <span style="font-size:0.85rem; color:#94a3b8;">표</span>
            </div>
          </div>
          <div class="bar-track" style="height:16px; margin-top:6px;">
            <div class="bar-fill" style="width: ${votes > 0 ? Math.max(8, pct) : 0}%;"></div>
          </div>
        </div>
      `;
    }).join('');

  } else {
    // [마감 후: 기호 및 단체명 전격 공개!]
    blindStatusTitle.innerHTML = '<i class="fa-solid fa-trophy text-gold"></i> 5분 마감! 기호 공개 및 최종 득표 순위 확정';
    blindNotice.textContent = '* 현장 투표 결과에 따라 1위부터 5위까지 사진 2 평가 점수(50점~30점)가 확정되었습니다.';
    rankScoreGuide.style.display = 'flex';

    // 최종 득표순으로 정렬
    const sortedFinalists = [...finalists].sort((a, b) => (b.photo2VoteCount || 0) - (a.photo2VoteCount || 0));
    const rankScores = [50, 45, 40, 35, 30];

    blindBarsContainer.innerHTML = sortedFinalists.map((f, idx) => {
      const votes = f.photo2VoteCount || 0;
      const pct = Math.round((votes / maxVotes) * 100);
      const score = rankScores[idx] || 30;
      const rankNum = idx + 1;

      return `
        <div class="blind-bar-card" style="border: 2px solid ${rankNum === 1 ? '#f59e0b' : '#334155'}; background: ${rankNum === 1 ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-dark-card)'};">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:12px;">
              <span class="badge ${rankNum === 1 ? 'badge-gold' : 'badge-blue'}" style="font-size:0.95rem; padding:4px 12px; font-weight:900;">
                ${rankNum}위 (기호 ${f.candidateNumber}번)
              </span>
              <img src="${f.photo2Url}" style="width:42px; height:32px; border-radius:4px; object-fit:cover; border:1px solid #475569;">
              <div>
                <div style="font-size:0.95rem; font-weight:800; color:white;">
                  "${f.photo2Title}" <span style="font-size:0.8rem; color:#94a3b8; font-weight:normal;">- ${f.name}</span>
                </div>
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:1.3rem; font-weight:900; color:var(--accent-gold-light);">
                ${votes} <span style="font-size:0.85rem; color:#94a3b8;">표</span>
                <span class="badge badge-gold" style="font-size:0.85rem; margin-left:8px;">${score}점</span>
              </div>
            </div>
          </div>
          <div class="bar-track" style="height:14px; margin-top:6px;">
            <div class="bar-fill" style="width: ${votes > 0 ? Math.max(8, pct) : 0}%; background: ${rankNum === 1 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #3b82f6, #60a5fa)'};"></div>
          </div>
        </div>
      `;
    }).join('');
  }
}

// -------------------------------------------------------------
// 후보 5편 순차 상영 모드 (기안서 3-2: 각 15초씩 순차 송출)
// -------------------------------------------------------------
function showIntroSlide(index) {
  if (!finalists || finalists.length === 0) return;
  currentSlideIndex = (index + finalists.length) % finalists.length;
  const f = finalists[currentSlideIndex];

  introImage.src = f.photo2Url;
  introCandidateNumber.textContent = `기호 ${f.candidateNumber}번`;
  introCategoryBadge.textContent = f.category;
  introGroupName.textContent = f.name;
  introPhotoTitle.textContent = `"${f.photo2Title}"`;
  introPhotoDesc.textContent = f.photo2Desc || '상모성당 25주년의 은총이 깃든 활동의 한 순간';
  introCounter.textContent = `${currentSlideIndex + 1} / ${finalists.length}`;

  // 프로그레스 바 리셋
  slideSecondsLeft = 15;
  introSlideProgress.style.width = '0%';
}

function startSlideLoop() {
  if (slideInterval) clearInterval(slideInterval);
  if (slideProgressInterval) clearInterval(slideProgressInterval);

  showIntroSlide(currentSlideIndex);

  let elapsed = 0;
  slideProgressInterval = setInterval(() => {
    elapsed += 0.1;
    const pct = (elapsed / 15) * 100;
    introSlideProgress.style.width = `${Math.min(100, pct)}%`;

    if (elapsed >= 15) {
      elapsed = 0;
      showIntroSlide(currentSlideIndex + 1);
    }
  }, 100);
}

function stopSlideLoop() {
  if (slideProgressInterval) clearInterval(slideProgressInterval);
  slideProgressInterval = null;
}

btnPrevIntro.addEventListener('click', () => {
  stopSlideLoop();
  showIntroSlide(currentSlideIndex - 1);
  startSlideLoop();
});
btnNextIntro.addEventListener('click', () => {
  stopSlideLoop();
  showIntroSlide(currentSlideIndex + 1);
  startSlideLoop();
});

// 모드 전환 버튼
btnModeIntro.addEventListener('click', () => {
  viewVote.style.display = 'none';
  viewIntro.style.display = 'grid';
  btnModeIntro.className = 'btn btn-gold';
  btnModeVote.className = 'btn btn-outline';
  btnModeVote.style.color = 'white';
  btnModeVote.style.borderColor = 'rgba(255,255,255,0.3)';
  startSlideLoop();
});

btnModeVote.addEventListener('click', () => {
  viewIntro.style.display = 'none';
  viewVote.style.display = 'grid';
  btnModeVote.className = 'btn btn-gold';
  btnModeIntro.className = 'btn btn-outline';
  btnModeIntro.style.color = 'white';
  btnModeIntro.style.borderColor = 'rgba(255,255,255,0.3)';
  stopSlideLoop();
});

// 전체화면 토글
btnFullscreen.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => alert(err.message));
  } else {
    document.exitFullscreen();
  }
});

// -------------------------------------------------------------
// 웹소켓 실시간 이벤트 수신
// -------------------------------------------------------------
socket.on('timer_tick', (data) => {
  votingState.remainingSeconds = data.remainingSeconds;
  screenTimer.textContent = formatTime(data.remainingSeconds);

  if (data.remainingSeconds <= 0) {
    votingState.status = 'ended';
    updateScreenUI();
  }
});

socket.on('vote_updated', (data) => {
  votingState.totalVoters = data.totalVoters;
  screenVotersCount.innerHTML = `${data.totalVoters || 0}<span style="font-size: 1.2rem; color: #94a3b8;">명</span>`;

  if (data.votes) {
    data.votes.forEach(v => {
      const f = finalists.find(item => item.id === v.id);
      if (f) f.photo2VoteCount = v.voteCount;
    });
    const isEnded = votingState.status === 'ended' || votingState.remainingSeconds <= 0;
    renderBlindBars(isEnded);
  }
});

socket.on('voting_started', (data) => {
  votingState.status = 'active';
  votingState.remainingSeconds = data.remainingSeconds;
  finalists = data.finalists || finalists;
  updateScreenUI();
  // 자동으로 실시간 투표 뷰로 전환
  btnModeVote.click();
});

socket.on('voting_ended', (data) => {
  votingState.status = 'ended';
  votingState.remainingSeconds = 0;
  if (data.finalists) finalists = data.finalists;
  updateScreenUI();
});

socket.on('voting_reset', (data) => {
  votingState = data.votingState;
  finalists = data.finalists || finalists;
  updateScreenUI();
  btnModeIntro.click(); // 리셋 시 후보 소개 모드로 전환
});

socket.on('finalists_updated', (newFinalists) => {
  finalists = newFinalists;
  updateScreenUI();
});

socket.on('settings_updated', (newSettings) => {
  settings = newSettings;
  updateQrCode();
});

// 시작
initScreen();
