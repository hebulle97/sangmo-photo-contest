// 신자 모바일 현장 투표 프론트엔드 스크립트
const socket = io();

// 사용자 고유 클라이언트 식별자 (로컬스토리지 보관)
let clientKey = localStorage.getItem('sangmo_contest_client_key');
if (!clientKey) {
  clientKey = 'device_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  localStorage.setItem('sangmo_contest_client_key', clientKey);
}

let hasVotedLocally = localStorage.getItem('sangmo_contest_voted') === 'true';
let finalists = [];
let votingState = {};
let selectedCandidates = new Set(); // 1인 2표제 선택 후보 ID

// DOM 캐시
const mobileTimer = document.getElementById('mobileTimer');
const selectionStatus = document.getElementById('selectionStatus');
const candidatesContainer = document.getElementById('candidatesContainer');
const btnSubmitVote = document.getElementById('btnSubmitVote');
const noticeBanner = document.getElementById('noticeBanner');

const mobilePreviewModal = document.getElementById('mobilePreviewModal');
const btnCloseMobilePreview = document.getElementById('btnCloseMobilePreview');
const mobilePreviewImg = document.getElementById('mobilePreviewImg');
const mobilePreviewText = document.getElementById('mobilePreviewText');

const completedModal = document.getElementById('completedModal');
const completedTitle = document.getElementById('completedTitle');
// 토스트 알림 함수 (모바일 브라우저 팝업 완전 차단)
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast-item ${type}`;
  let icon = '<i class="fa-solid fa-circle-info" style="color:#3b82f6;"></i>';
  if (type === 'success') icon = '<i class="fa-solid fa-circle-check" style="color:#10b981;"></i>';
  if (type === 'error') icon = '<i class="fa-solid fa-circle-exclamation" style="color:#ef4444;"></i>';
  if (type === 'warning') icon = '<i class="fa-solid fa-triangle-exclamation" style="color:#f59e0b;"></i>';
  toast.innerHTML = `${icon}<span>${message.replace(/\n/g, '<br>')}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastSlideOut 0.3s forwards';
    setTimeout(() => toast.remove(), 300);
  }, 2600);
}

// 브라우저 경고창(alert) 팝업을 토스트로 전면 대체
window.alert = function(msg) {
  showToast(msg, 'warning');
};

function formatTime(seconds) {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.max(0, seconds) % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// 1. 상태 가져오기
async function initVotePage() {
  try {
    const res = await fetch('/api/state');
    const data = await res.json();
    finalists = data.finalists || [];
    votingState = data.votingState || {};

    // 이미 투표했는지 체크
    if (votingState.voters && (votingState.voters[clientKey] || (data.currentIp && Object.values(votingState.voters).some(v => v.ip === data.currentIp)))) {
      hasVotedLocally = true;
      localStorage.setItem('sangmo_contest_voted', 'true');
    }

    renderPage();
  } catch (err) {
    console.error('초기 로드 에러:', err);
  }
}

// 페이지 렌더링
function renderPage() {
  mobileTimer.textContent = formatTime(votingState.remainingSeconds);

  // 이미 투표 완료한 경우
  if (hasVotedLocally) {
    showNoticeBanner('success', '이미 투표에 참여하셨습니다. (1인 1회 제한)');
    btnSubmitVote.disabled = true;
    btnSubmitVote.textContent = '투표 참여 완료됨';
    renderCandidateCards(false);
    return;
  }

  // 투표 상태에 따른 분기
  if (votingState.status === 'ready') {
    showNoticeBanner('warning', '현재 투표 준비 중입니다. 잠시 후 5분 타이머와 함께 투표가 시작됩니다!');
    btnSubmitVote.disabled = true;
    btnSubmitVote.textContent = '투표 시작 대기 중...';
    renderCandidateCards(false);
  } else if (votingState.status === 'ended' || (votingState.remainingSeconds <= 0 && votingState.status === 'active')) {
    showNoticeBanner('danger', '5분 투표 시간이 마감되었습니다. 참여해 주셔서 감사합니다.');
    btnSubmitVote.disabled = true;
    btnSubmitVote.textContent = '투표 마감됨';
    renderCandidateCards(false);
  } else {
    // 투표 진행 중
    noticeBanner.style.display = 'none';
    renderCandidateCards(true);
    updateSubmitButton();
  }
}

function showNoticeBanner(type, message) {
  noticeBanner.style.display = 'block';
  if (type === 'success') {
    noticeBanner.style.background = '#dcfce7';
    noticeBanner.style.color = '#15803d';
  } else if (type === 'danger') {
    noticeBanner.style.background = '#fee2e2';
    noticeBanner.style.color = '#b91c1c';
  } else {
    noticeBanner.style.background = '#fef3c7';
    noticeBanner.style.color = '#b45309';
  }
  noticeBanner.textContent = message;
}

// 5개 후보 카드 렌더링
function renderCandidateCards(canSelect) {
  if (!finalists || finalists.length === 0) {
    candidatesContainer.innerHTML = '<div style="text-align:center; padding:30px; color:#64748b;">본선 후보가 아직 설정되지 않았습니다.</div>';
    return;
  }

  candidatesContainer.innerHTML = finalists.map(f => {
    const isSelected = selectedCandidates.has(f.id);

    return `
      <div class="mobile-card ${isSelected ? 'selected' : ''}" data-id="${f.id}">
        <div class="check-circle">
          ${isSelected ? '<i class="fa-solid fa-check"></i>' : ''}
        </div>

        <div style="position:relative; width:100%; height:220px; background:#000;">
          <img src="${f.photo2Url}" style="width:100%; height:100%; object-fit:cover;" alt="${f.photo2Title}">
          <button class="btn btn-dark" style="position:absolute; bottom:10px; right:10px; padding:6px 12px; font-size:0.75rem; border-radius:999px; background:rgba(0,0,0,0.6);" onclick="event.stopPropagation(); openPhotoPreview('${f.photo2Url}', '기호 ${f.candidateNumber}번: ${f.photo2Title}')">
            <i class="fa-solid fa-magnifying-glass-plus"></i> 사진 확대
          </button>
          <div style="position:absolute; top:12px; left:12px; background:rgba(0,0,0,0.7); backdrop-filter:blur(4px); padding:4px 12px; border-radius:999px; border:1px solid #f59e0b;">
            <span style="color:#fbbf24; font-weight:900; font-size:0.95rem;">기호 ${f.candidateNumber}번</span>
          </div>
        </div>

        <div style="padding: 14px 16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span class="badge badge-blue" style="font-size:0.78rem;">${f.category}</span>
            <span style="font-size:0.85rem; color:#64748b; font-weight:700;">${f.name}</span>
          </div>
          <h3 style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin-bottom: 4px;">
            "${f.photo2Title}"
          </h3>
          <p style="font-size: 0.84rem; color: #64748b; line-height: 1.4;">
            ${f.photo2Desc || ''}
          </p>
        </div>
      </div>
    `;
  }).join('');

  if (canSelect) {
    document.querySelectorAll('.mobile-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        toggleSelection(id);
      });
    });
  }
}

// 후보 선택/해제 토글 (1인 2표제)
function toggleSelection(id) {
  if (selectedCandidates.has(id)) {
    selectedCandidates.delete(id);
  } else {
    if (selectedCandidates.size >= 2) {
      alert('1인 2표제입니다. 최대 2개 작품까지만 선택하실 수 있습니다.');
      return;
    }
    selectedCandidates.add(id);
  }

  updateSubmitButton();
  renderCandidateCards(true);
}

// 하단 제출 버튼 상태 업데이트
function updateSubmitButton() {
  const count = selectedCandidates.size;
  selectionStatus.textContent = `2개 중 ${count}개 선택`;

  if (count === 2) {
    btnSubmitVote.disabled = false;
    btnSubmitVote.className = 'btn btn-gold';
    btnSubmitVote.innerHTML = '<i class="fa-solid fa-paper-plane"></i> 선택한 2개 작품으로 투표 완료하기 (2/2)';
  } else {
    btnSubmitVote.disabled = true;
    btnSubmitVote.className = 'btn btn-primary';
    btnSubmitVote.textContent = `마음에 드는 2개 작품을 선택해 주세요 (${count}/2)`;
  }
}

// 투표 제출
btnSubmitVote.addEventListener('click', async () => {
  if (selectedCandidates.size !== 2) {
    alert('반드시 2개의 후보를 선택해 주세요.');
    return;
  }

  if (!confirm('선택하신 2개 작품으로 투표를 제출하시겠습니까?\n제출 후에는 수정할 수 없습니다.')) {
    return;
  }

  try {
    const res = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientKey,
        candidateIds: Array.from(selectedCandidates)
      })
    });

    const result = await res.json();
    if (result.success) {
      hasVotedLocally = true;
      localStorage.setItem('sangmo_contest_voted', 'true');
      completedTitle.textContent = '투표가 완료되었습니다!';
      completedDesc.innerHTML = '신자님의 소중한 2표가 실시간으로 집계에 반영되었습니다.<br>대형 스크린을 주목해 주세요!';
      completedModal.classList.add('active');
    } else {
      alert('투표 실패: ' + (result.message || '오류 발생'));
    }
  } catch (err) {
    alert('네트워크 오류: ' + err.message);
  }
});

// 사진 확대 모달
window.openPhotoPreview = function(url, text) {
  mobilePreviewImg.src = url;
  mobilePreviewText.textContent = text || '';
  mobilePreviewModal.classList.add('active');
};
btnCloseMobilePreview.addEventListener('click', () => {
  mobilePreviewModal.classList.remove('active');
});
mobilePreviewModal.addEventListener('click', (e) => {
  if (e.target === mobilePreviewModal || e.target === mobilePreviewImg) {
    mobilePreviewModal.classList.remove('active');
  }
});

// 소켓 실시간 이벤트
socket.on('timer_tick', (data) => {
  votingState.remainingSeconds = data.remainingSeconds;
  mobileTimer.textContent = formatTime(data.remainingSeconds);
  if (data.remainingSeconds <= 0) {
    votingState.status = 'ended';
    renderPage();
  }
});

// 관리자가 투표를 시작하면 모바일 화면에서 자동으로 활성화!
socket.on('voting_started', (data) => {
  votingState.status = 'active';
  votingState.remainingSeconds = data.remainingSeconds;
  if (data.finalists) finalists = data.finalists;
  // 관리자가 새 투표를 열었으므로 로컬 투표 완료 상태 리셋
  hasVotedLocally = false;
  localStorage.removeItem('sangmo_contest_voted');
  selectedCandidates.clear();
  completedModal.classList.remove('active');
  renderPage();
});

socket.on('voting_ended', (data) => {
  votingState.status = 'ended';
  votingState.remainingSeconds = 0;
  renderPage();
});

socket.on('voting_reset', (data) => {
  votingState = data.votingState;
  hasVotedLocally = false;
  localStorage.removeItem('sangmo_contest_voted');
  selectedCandidates.clear();
  completedModal.classList.remove('active');
  renderPage();
});

// 초기화
initVotePage();
