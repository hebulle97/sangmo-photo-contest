// 관리자 프론트엔드 스크립트
const socket = io();

let currentGroups = [];
let currentFinalists = [];
let currentSettings = {};
let currentVotingState = {};
let selectedCategory = 'ALL';

// DOM 요소 캐시
const groupsTableBody = document.getElementById('groupsTableBody');
const finalistsList = document.getElementById('finalistsList');
const votingStatusBadge = document.getElementById('votingStatusBadge');
const adminTimer = document.getElementById('adminTimer');
const totalVotersCount = document.getElementById('totalVotersCount');
const publicUrlInput = document.getElementById('publicUrlInput');

const btnStartVote = document.getElementById('btnStartVote');
const btnExtendVote = document.getElementById('btnExtendVote');
const btnEndVote = document.getElementById('btnEndVote');
const btnShowQr = document.getElementById('btnShowQr');
const btnCopyUrl = document.getElementById('btnCopyUrl');
const btnSaveFinalists = document.getElementById('btnSaveFinalists');

const groupModal = document.getElementById('groupModal');
const groupForm = document.getElementById('groupForm');
const btnOpenAddModal = document.getElementById('btnOpenAddModal');
const btnCloseModal = document.getElementById('btnCloseModal');
const btnCancelModal = document.getElementById('btnCancelModal');
const modalTitle = document.getElementById('modalTitle');

const formRegistered = document.getElementById('formRegistered');
const formAttended = document.getElementById('formAttended');
const previewRate = document.getElementById('previewRate');
const previewScore = document.getElementById('previewScore');

const qrModal = document.getElementById('qrModal');
const btnCloseQrModal = document.getElementById('btnCloseQrModal');
const modalQrImage = document.getElementById('modalQrImage');
const modalQrUrl = document.getElementById('modalQrUrl');
const inlineQrImage = document.getElementById('inlineQrImage');
const btnBackupData = document.getElementById('btnBackupData');
const restoreFileInput = document.getElementById('restoreFileInput');

// 토스트 알림창 함수 (브라우저 alert 팝업창 완전 차단)
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

// 브라우저 기본 경고창(alert) 팝업을 토스트로 전면 대체 (팝업 차단)
window.alert = function(msg) {
  showToast(msg, 'info');
};

// 로그인 팝업 없이 즉시 접근 가능하도록 인증 토큰 기본 설정
sessionStorage.setItem('sangmo_admin_token', 'sangmo_admin_authorized');

// 백업 다운로드
btnBackupData.addEventListener('click', () => {
  window.location.href = '/api/backup';
});

// 백업 복원
restoreFileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (!confirm('선택한 백업 파일로 시스템 데이터를 복원하시겠습니까?\n현재 데이터가 백업 내용으로 대체됩니다.')) {
    restoreFileInput.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const parsed = JSON.parse(event.target.result);
      const res = await fetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      });
      const result = await res.json();
      if (result.success) {
        alert('데이터 복원이 성공적으로 완료되었습니다!');
        fetchState();
      } else {
        alert('복원 실패: ' + (result.error || '오류 발생'));
      }
    } catch (err) {
      alert('백업 파일 읽기 오류: ' + err.message);
    }
  };
  reader.readAsText(file);
});

const imagePreviewModal = document.getElementById('imagePreviewModal');
const btnClosePreviewModal = document.getElementById('btnClosePreviewModal');
const fullPreviewImage = document.getElementById('fullPreviewImage');
const fullPreviewCaption = document.getElementById('fullPreviewCaption');

// 시간 포맷팅 mm:ss
function formatTime(seconds) {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.max(0, seconds) % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// 1. 초기 데이터 로드 (캐시 완전 방지)
async function fetchState() {
  try {
    const res = await fetch(`/api/state?t=${Date.now()}`, { cache: 'no-store' });
    const data = await res.json();
    currentSettings = data.settings;
    currentGroups = data.groups;
    currentFinalists = data.finalists;
    currentVotingState = data.votingState;

    updateUI();
  } catch (err) {
    console.error('상태 로드 에러:', err);
  }
}

// UI 갱신 함수
function updateUI() {
  // 주소 표시
  const pubUrl = currentSettings.publicUrl || currentSettings.tunnelUrl || window.location.origin;
  publicUrlInput.value = `${pubUrl.replace(/\/$/, '')}/vote`;

  // 인라인 QR 코드 갱신 (투표 재시작 시마다 새 회차 QR 코드로 즉시 갱신)
  if (inlineQrImage) {
    fetch(`/api/qr?url=${encodeURIComponent(pubUrl)}&t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d && d.qrDataUrl) inlineQrImage.src = d.qrDataUrl;
      })
      .catch(() => {});
  }
  if (qrModal && qrModal.classList.contains('active')) {
    loadQrCode(currentQrType);
  }

  // 투표 상태 배지
  const status = currentVotingState.status;
  if (status === 'active') {
    votingStatusBadge.className = 'badge badge-rose';
    votingStatusBadge.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 투표 진행 중 (5분)';
    btnStartVote.disabled = true;
    btnStartVote.innerHTML = '<i class="fa-solid fa-hourglass-half"></i> 투표 진행 중';
  } else if (status === 'ended') {
    votingStatusBadge.className = 'badge badge-purple';
    votingStatusBadge.innerHTML = '<i class="fa-solid fa-flag-checkered"></i> 투표 마감 완료';
    btnStartVote.disabled = false;
    btnStartVote.innerHTML = '<i class="fa-solid fa-play"></i> 5분 현장 투표 시작하기';
  } else {
    votingStatusBadge.className = 'badge badge-gold';
    votingStatusBadge.innerHTML = '<i class="fa-solid fa-circle-dot"></i> 대기 상태';
    btnStartVote.disabled = false;
    btnStartVote.innerHTML = '<i class="fa-solid fa-play"></i> 5분 현장 투표 시작하기';
  }

  // 타이머 & 참여자
  adminTimer.textContent = formatTime(currentVotingState.remainingSeconds);
  totalVotersCount.innerHTML = `${currentVotingState.totalVoters || 0}<span style="font-size:1.1rem; color:#94a3b8;">명</span>`;

  // 단체 테이블 렌더링
  renderGroupsTable();

  // 본선 5개 후보 슬롯 렌더링
  renderFinalistsSlots();
}

// 본선 후보 5개 슬롯 렌더링
function renderFinalistsSlots() {
  finalistsList.innerHTML = '';

  for (let slot = 1; slot <= 5; slot++) {
    const currentCandidate = currentGroups.find(g => g.isFinalist && g.candidateNumber === slot);
    
    const card = document.createElement('div');
    card.style.background = '#ffffff';
    card.style.border = currentCandidate ? '2px solid #f59e0b' : '1px dashed #cbd5e1';
    card.style.borderRadius = '12px';
    card.style.padding = '14px';
    card.style.position = 'relative';
    card.style.overflow = 'hidden';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.justifyContent = 'space-between';
    card.style.minHeight = '340px';
    card.style.boxShadow = '0 2px 6px rgba(0,0,0,0.04)';

    if (currentCandidate) {
      card.innerHTML = `
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span class="badge badge-gold" style="font-size:0.85rem; font-weight:800;">기호 ${slot}번</span>
            <span style="font-size:0.8rem; font-weight:800; color:#3b82f6;">득표: ${currentCandidate.photo2VoteCount || 0}표</span>
          </div>
          <div style="position:relative; width:100%; height:120px; border-radius:8px; overflow:hidden; margin-bottom:10px; background:#f1f5f9; cursor:pointer;" onclick="previewImage('${currentCandidate.photo2Url}', '기호 ${slot}번: ${currentCandidate.name}')">
            <img src="${currentCandidate.photo2Url}" style="width:100%; height:100%; object-fit:cover;">
          </div>
          <div style="font-weight:800; font-size:0.95rem; line-height:1.3; height:2.6em; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; margin-bottom:4px; color:#0f172a;" title="${currentCandidate.photo2Title}">
            "${currentCandidate.photo2Title || '활동사진'}"
          </div>
          <div style="font-size:0.8rem; color:#64748b; height:1.4em; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-bottom:10px;" title="${currentCandidate.name} (${currentCandidate.category})">
            ${currentCandidate.name} <span style="color:#94a3b8;">(${currentCandidate.category})</span>
          </div>
        </div>
        <div style="width:100%; overflow:hidden;">
          <select class="form-control candidate-select" data-slot="${slot}" style="width:100%; max-width:100%; padding:7px 8px; font-size:0.8rem; text-overflow:ellipsis; white-space:nowrap; overflow:hidden; background:#f8fafc; border:1px solid #cbd5e1; cursor:pointer;">
            ${renderGroupOptions(currentCandidate.id)}
          </select>
        </div>
      `;
    } else {
      card.innerHTML = `
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span class="badge" style="background:#e2e8f0; color:#475569; font-size:0.85rem;">기호 ${slot}번 (미지정)</span>
          </div>
          <div style="height:120px; background:#f1f5f9; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-size:0.85rem; margin-bottom:10px; border:1px dashed #cbd5e1;">
            후보를 선택해 주세요
          </div>
          <div style="height:2.6em; margin-bottom:4px; color:#cbd5e1; font-size:0.95rem;">-</div>
          <div style="height:1.4em; margin-bottom:10px; color:#cbd5e1; font-size:0.8rem;">-</div>
        </div>
        <div style="width:100%; overflow:hidden;">
          <select class="form-control candidate-select" data-slot="${slot}" style="width:100%; max-width:100%; padding:7px 8px; font-size:0.8rem; text-overflow:ellipsis; white-space:nowrap; overflow:hidden; background:#f8fafc; border:1px solid #cbd5e1; cursor:pointer;">
            <option value="">-- 후보 단체 선택 --</option>
            ${renderGroupOptions(null)}
          </select>
        </div>
      `;
    }

    finalistsList.appendChild(card);
  }

  // 드롭다운 변경 시 즉시 카드 갱신 및 자동 저장
  document.querySelectorAll('.candidate-select').forEach(sel => {
    sel.addEventListener('change', async (e) => {
      const slot = parseInt(e.target.dataset.slot);
      const chosenGroupId = e.target.value;

      // 중복 체크
      if (chosenGroupId) {
        const selects = document.querySelectorAll('.candidate-select');
        for (const other of selects) {
          if (other !== e.target && other.value === chosenGroupId) {
            alert('이미 다른 기호 번호에 선택된 단체입니다. 서로 다른 단체를 지정해 주세요.');
            e.target.value = '';
            return;
          }
        }
      }

      // 즉시 로컬 데이터 갱신
      currentGroups.forEach(g => {
        if (g.candidateNumber === slot) {
          g.isFinalist = false;
          g.candidateNumber = null;
        }
        if (g.id === chosenGroupId) {
          g.isFinalist = true;
          g.candidateNumber = slot;
        }
      });

      // 카드 다시 렌더링
      renderFinalistsSlots();
      renderGroupsTable();

      // 서버 자동 저장
      const finalistMap = {};
      currentGroups.forEach(g => {
        if (g.isFinalist && g.candidateNumber) {
          finalistMap[g.id] = g.candidateNumber;
        }
      });

      try {
        await fetch('/api/finalists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ finalistMap })
        });
      } catch (err) {
        console.error('후보 자동 저장 실패:', err);
      }
    });
  });
}

function renderGroupOptions(selectedId) {
  let html = '<option value="">-- 후보 단체 선택 --</option>';
  currentGroups.forEach(g => {
    const isSelected = g.id === selectedId ? 'selected' : '';
    // 간결하게 줄여서 셀렉트 박스 텍스트 정돈
    const shortCategory = g.category === '평신도사도직협의회' ? '평협' : (g.category === '꾸리아(레지오마리애)' ? '레지오' : g.category);
    html += `<option value="${g.id}" ${isSelected}>[${shortCategory}] ${g.name} - ${g.photo2Title}</option>`;
  });
  return html;
}

// 단체 목록 테이블 렌더링
function renderGroupsTable() {
  const filtered = selectedCategory === 'ALL'
    ? currentGroups
    : currentGroups.filter(g => g.category === selectedCategory);

  groupsTableBody.innerHTML = '';

  if (filtered.length === 0) {
    groupsTableBody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:30px; color:#94a3b8;">등록된 단체가 없습니다.</td></tr>`;
    return;
  }

  filtered.forEach(g => {
    const tr = document.createElement('tr');
    const isAttFull = g.attendanceRate >= 100;

    tr.innerHTML = `
      <td><span class="badge ${getCategoryBadgeClass(g.category)}">${g.category}</span></td>
      <td><strong>${g.name}</strong></td>
      <td>${g.registeredCount}명</td>
      <td>${g.attendedCount}명</td>
      <td>
        <span style="font-weight:800; ${isAttFull ? 'color:#059669;' : 'color:#334155;'}">
          ${g.attendanceRate}%
          ${isAttFull ? '<i class="fa-solid fa-crown text-gold" title="출석 100%"></i>' : ''}
        </span>
      </td>
      <td style="font-weight:900; color:#1d4ed8; font-size:1.05rem;">
        ${g.photo1Score.toFixed(1)}점
      </td>
      <td>
        <img src="${g.photo1Url}" class="thumb-img" alt="사진1" loading="lazy" decoding="async" onerror="this.src='/assets/church_exterior.jpg'" onclick="previewImage('${g.photo1Url}', '${g.name} 단체사진')">
      </td>
      <td>
        <div style="display:flex; align-items:center; gap:8px;">
          <img src="${g.photo2Url}" class="thumb-img" alt="사진2" loading="lazy" decoding="async" onerror="this.src='/assets/IMG_1274.JPG'" onclick="previewImage('${g.photo2Url}', '${g.name}: ${g.photo2Title}')">
          <div>
            <div style="font-weight:700; font-size:0.85rem;">${g.photo2Title}</div>
            <div style="font-size:0.75rem; color:#64748b;">${g.photo2Desc || ''}</div>
          </div>
        </div>
      </td>
      <td>
        ${g.isFinalist 
          ? `<span class="badge badge-gold font-bold">기호 ${g.candidateNumber}번 (${g.photo2VoteCount || 0}표)</span>` 
          : `<span style="color:#94a3b8; font-size:0.8rem;">기본점수(${g.photo2Score || 20}점)</span>`}
      </td>
      <td style="font-weight:900; color:#b45309; font-size:1.1rem;">
        ${g.finalTotalScore.toFixed(1)}점
      </td>
      <td>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-outline" style="padding:4px 8px; font-size:0.8rem;" onclick="editGroup('${g.id}')">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn btn-danger" style="padding:4px 8px; font-size:0.8rem;" onclick="deleteGroup('${g.id}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    `;
    groupsTableBody.appendChild(tr);
  });
}

function getCategoryBadgeClass(category) {
  switch (category) {
    case '사목평의회': return 'badge-gold';
    case '평신도사도직협의회': return 'badge-blue';
    case '꾸리아(레지오마리애)': return 'badge-purple';
    default: return 'badge-green';
  }
}

// 사진 크게 보기
window.previewImage = function(url, caption) {
  fullPreviewImage.src = url;
  fullPreviewCaption.textContent = caption || '';
  imagePreviewModal.classList.add('active');
};

function closePhotoPreview() {
  imagePreviewModal.classList.remove('active');
}

btnClosePreviewModal.addEventListener('click', closePhotoPreview);

const btnBottomClosePreview = document.getElementById('btnBottomClosePreview');
if (btnBottomClosePreview) {
  btnBottomClosePreview.addEventListener('click', closePhotoPreview);
}

// 배경 클릭 시 닫기
imagePreviewModal.addEventListener('click', (e) => {
  if (e.target === imagePreviewModal || e.target.classList.contains('modal-overlay')) {
    closePhotoPreview();
  }
});

// 사진 자체 클릭 시 닫기
fullPreviewImage.addEventListener('click', closePhotoPreview);

// ESC 키로 모든 열린 모달 닫기
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closePhotoPreview();
    if (groupModal) groupModal.classList.remove('active');
    if (qrModal) qrModal.classList.remove('active');
  }
});

// 출석률 및 사진1 점수 실시간 미리보기 계산
function calcRateAndScore() {
  const reg = Math.max(1, parseInt(formRegistered.value) || 1);
  const att = Math.max(0, parseInt(formAttended.value) || 0);
  const rate = Math.min(100, (att / reg) * 100);
  const score = (rate * 0.5).toFixed(1);

  previewRate.textContent = `${rate.toFixed(1)}%`;
  previewScore.textContent = `${score} 점 (50점 만점)`;
}
formRegistered.addEventListener('input', calcRateAndScore);
formAttended.addEventListener('input', calcRateAndScore);

// 모달 폼 및 파일 선택창 완전 초기화 (이전/삭제된 게시물의 파일이나 텍스트가 남는 현상 원천 차단)
function resetGroupFormState() {
  if (groupForm) groupForm.reset();
  const idInput = document.getElementById('groupId');
  const p1Input = document.getElementById('formPhoto1');
  const p2Input = document.getElementById('formPhoto2');
  const p1Box = document.getElementById('currentPhoto1Box');
  const p2Box = document.getElementById('currentPhoto2Box');

  if (idInput) idInput.value = '';
  if (p1Input) p1Input.value = '';
  if (p2Input) p2Input.value = '';
  if (p1Box) p1Box.style.display = 'none';
  if (p2Box) p2Box.style.display = 'none';
}

// 단체 등록 모달 열기
btnOpenAddModal.addEventListener('click', () => {
  resetGroupFormState();
  modalTitle.textContent = '단체 출품작 신규 등록';
  calcRateAndScore();
  groupModal.classList.add('active');
});

btnCloseModal.addEventListener('click', () => {
  resetGroupFormState();
  groupModal.classList.remove('active');
});
btnCancelModal.addEventListener('click', () => {
  resetGroupFormState();
  groupModal.classList.remove('active');
});

// 단체 수정 모달 열기 (항상 파일 입력창을 먼저 비우고 서버 최신 데이터를 반영)
window.editGroup = async function(id) {
  resetGroupFormState();

  try {
    const res = await fetch(`/api/state?t=${Date.now()}`, { cache: 'no-store' });
    const data = await res.json();
    if (data && Array.isArray(data.groups)) {
      currentGroups = data.groups;
      currentFinalists = data.finalists || [];
    }
  } catch (e) {
    // 네트워크 지연 시 현재 메모리 목록 사용
  }

  const g = currentGroups.find(item => item.id === id);
  if (!g) {
    showToast('이미 삭제되었거나 존재하지 않는 게시물입니다.', 'warning');
    updateUI();
    return;
  }

  modalTitle.textContent = `[${g.name}] 정보 수정`;
  document.getElementById('groupId').value = g.id;
  document.getElementById('formCategory').value = g.category || '구역·반';
  document.getElementById('formName').value = g.name || '';
  document.getElementById('formRegistered').value = g.registeredCount || 1;
  document.getElementById('formAttended').value = g.attendedCount || 0;
  document.getElementById('formPhoto2Title').value = g.photo2Title || '';
  document.getElementById('formPhoto2Desc').value = g.photo2Desc || '';

  const p1Box = document.getElementById('currentPhoto1Box');
  const p1Thumb = document.getElementById('currentPhoto1Thumb');
  const p2Box = document.getElementById('currentPhoto2Box');
  const p2Thumb = document.getElementById('currentPhoto2Thumb');

  if (p1Box && p1Thumb && g.photo1Url) {
    p1Thumb.src = g.photo1Url;
    p1Box.style.display = 'flex';
  }
  if (p2Box && p2Thumb && g.photo2Url) {
    p2Thumb.src = g.photo2Url;
    p2Box.style.display = 'flex';
  }

  calcRateAndScore();
  groupModal.classList.add('active');
};

// 브라우저단 고화질 사진 초고속 자동 압축 (10~30MB 대용량 사진을 0.1초 만에 ~200KB로 경량화하여 업로드 렉 원천 제거)
async function compressImageFile(file, maxDimension = 1440, quality = 0.82) {
  if (!file || !file.type || !file.type.startsWith('image/')) return file;
  if (file.size <= 300 * 1024) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file);
          const safeName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
          resolve(new File([blob], safeName, { type: 'image/jpeg', lastModified: Date.now() }));
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

// 단체 폼 제출 (중복 클릭 원천 차단 잠금 + 사진 초고속 압축 전송)
let isSubmittingGroup = false;
const btnSubmitGroup = document.getElementById('btnSubmitGroup');

groupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (isSubmittingGroup) return; // 이미 저장 중이면 추가 클릭 100% 차단

  isSubmittingGroup = true;
  if (btnSubmitGroup) {
    btnSubmitGroup.disabled = true;
    btnSubmitGroup.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 사진 최적화 및 저장 중...';
  }

  const id = document.getElementById('groupId').value;
  const formData = new FormData(groupForm);

  try {
    // 첨부된 사진이 있으면 브라우저에서 즉시 경량 압축 후 전송
    const p1Input = document.getElementById('formPhoto1');
    const p2Input = document.getElementById('formPhoto2');
    const [comp1, comp2] = await Promise.all([
      p1Input && p1Input.files[0] ? compressImageFile(p1Input.files[0]) : Promise.resolve(null),
      p2Input && p2Input.files[0] ? compressImageFile(p2Input.files[0]) : Promise.resolve(null)
    ]);
    if (comp1) formData.set('photo1', comp1, comp1.name);
    if (comp2) formData.set('photo2', comp2, comp2.name);

    let res;
    if (id) {
      res = await fetch(`/api/groups/${id}`, { method: 'PUT', body: formData });
    } else {
      res = await fetch('/api/groups', { method: 'POST', body: formData });
    }
    const result = await res.json();
    if (result.success) {
      resetGroupFormState();
      groupModal.classList.remove('active');
      showToast('단체 출품작이 정상적으로 저장되었습니다!', 'success');
      await fetchState();
    } else {
      showToast('저장 실패: ' + (result.error || '오류 발생'), 'error');
    }
  } catch (err) {
    showToast('네트워크 오류: ' + err.message, 'error');
  } finally {
    isSubmittingGroup = false;
    if (btnSubmitGroup) {
      btnSubmitGroup.disabled = false;
      btnSubmitGroup.innerHTML = '저장하기';
    }
  }
});

// 단체 삭제
window.deleteGroup = async function(id) {
  if (!confirm('정말 이 단체를 삭제하시겠습니까?')) return;
  try {
    const res = await fetch(`/api/groups/${id}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) {
      currentGroups = currentGroups.filter(item => item.id !== id);
      resetGroupFormState();
      updateUI();
      showToast('단체가 삭제되었습니다.', 'info');
      await fetchState();
    }
  } catch (err) {
    showToast('삭제 오류: ' + err.message, 'error');
  }
};

// 후보 번호 저장
btnSaveFinalists.addEventListener('click', async () => {
  const selects = document.querySelectorAll('.candidate-select');
  const finalistMap = {};
  const chosenIds = new Set();

  for (const sel of selects) {
    const slot = parseInt(sel.dataset.slot);
    const groupId = sel.value;
    if (groupId) {
      if (chosenIds.has(groupId)) {
        alert('동일한 단체가 여러 번 후보로 선택되었습니다. 서로 다른 단체를 지정해 주세요.');
        return;
      }
      chosenIds.add(groupId);
      finalistMap[groupId] = slot;
    }
  }

  try {
    const res = await fetch('/api/finalists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ finalistMap })
    });
    const result = await res.json();
    if (result.success) {
      alert('본선 후보 5개가 성공적으로 설정되었습니다!');
      fetchState();
    }
  } catch (err) {
    alert('후보 설정 오류: ' + err.message);
  }
});

// 필터 버튼 클릭
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => {
      b.classList.remove('btn-dark', 'active');
      b.classList.add('btn-outline');
    });
    btn.classList.add('btn-dark', 'active');
    btn.classList.remove('btn-outline');

    selectedCategory = btn.dataset.category;
    renderGroupsTable();
  });
});

// 투표 시작
btnStartVote.addEventListener('click', async () => {
  if (currentFinalists.length < 5) {
    if (!confirm(`현재 본선 후보가 ${currentFinalists.length}개 설정되어 있습니다. 그래도 투표를 시작하시겠습니까?`)) {
      return;
    }
  }

  const existingVoters = currentVotingState.totalVoters || 0;
  if (existingVoters > 0 || currentVotingState.status === 'ended') {
    if (!confirm('기존 내역을 초기화하고 투표를 재시작하시겠습니까?')) {
      return;
    }
  } else {
    if (!confirm('5분 현장 투표를 시작하시겠습니까?')) {
      return;
    }
  }

  try {
    const res = await fetch('/api/voting/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration: 300 })
    });
    const result = await res.json();
    if (result.success) {
      fetchState();
    }
  } catch (err) {
    alert('투표 시작 오류: ' + err.message);
  }
});

// 투표 시간 연장 (+1분)
btnExtendVote.addEventListener('click', async () => {
  if (currentVotingState.status !== 'active') {
    alert('현재 진행 중인 투표가 없습니다. 투표가 시작된 후에 시간을 연장할 수 있습니다.');
    return;
  }
  try {
    const res = await fetch('/api/voting/extend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seconds: 60 })
    });
    const result = await res.json();
    if (result.success) {
      // 타이머 하이라이트 애니메이션
      adminTimer.style.transition = 'color 0.2s, transform 0.2s';
      adminTimer.style.color = '#10b981';
      adminTimer.style.transform = 'scale(1.15)';
      setTimeout(() => {
        adminTimer.style.color = '#fbbf24';
        adminTimer.style.transform = 'scale(1)';
      }, 400);
    } else {
      alert(result.error || '시간 연장에 실패했습니다.');
    }
  } catch (err) {
    alert('시간 연장 오류: ' + err.message);
  }
});

// 투표 즉시 마감
btnEndVote.addEventListener('click', async () => {
  if (!confirm('투표를 지금 즉시 마감하시겠습니까?')) return;
  try {
    const res = await fetch('/api/voting/end', { method: 'POST' });
    const result = await res.json();
    if (result.success) {
      fetchState();
    }
  } catch (err) {
    alert('마감 오류: ' + err.message);
  }
});

// 현장 투표 내역 초기화 (0표 리셋)
const btnResetVote = document.getElementById('btnResetVote');
if (btnResetVote) {
  btnResetVote.addEventListener('click', async () => {
    const msg = "정말 현장 투표 내역을 초기화하시겠습니까?\n\n* 등록된 단체 및 사진은 100% 안전하게 유지됩니다.\n* 오직 득표수(0표)와 참여자 수(0명)만 초기화되어 투표 시작 전 대기 상태(05:00)로 돌아갑니다.";
    if (!confirm(msg)) return;

    try {
      const res = await fetch('/api/voting/reset', { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        alert('현장 투표 내역이 깨끗하게 초기화되었습니다. (0표 / 대기 상태)');
        fetchState();
      } else {
        alert('초기화 실패: ' + (result.error || '오류'));
      }
    } catch (err) {
      alert('초기화 오류: ' + err.message);
    }
  });
}

let currentQrType = 'tunnel';

async function loadQrCode(type = currentQrType) {
  currentQrType = type;
  try {
    let url = '';
    if (type === 'local') {
      const ip = currentSettings.localIp || window.location.hostname;
      url = `http://${ip}:3000/vote`;
    } else {
      url = currentSettings.publicUrl || currentSettings.tunnelUrl || window.location.origin;
    }
    const res = await fetch(`/api/qr?url=${encodeURIComponent(url)}&t=${Date.now()}`, { cache: 'no-store' });
    const data = await res.json();
    modalQrImage.src = data.qrDataUrl;
    modalQrUrl.textContent = data.voteUrl;
  } catch (err) {
    alert('QR 코드 생성 오류: ' + err.message);
  }
}

// QR 코드 모달 표시
btnShowQr.addEventListener('click', () => {
  loadQrCode('tunnel');
  qrModal.classList.add('active');
});
btnCloseQrModal.addEventListener('click', () => qrModal.classList.remove('active'));

// QR 탭 전환
const btnQrTabTunnel = document.getElementById('btnQrTabTunnel');
const btnQrTabLocal = document.getElementById('btnQrTabLocal');

if (btnQrTabTunnel && btnQrTabLocal) {
  btnQrTabTunnel.addEventListener('click', () => {
    btnQrTabTunnel.className = 'btn btn-dark active';
    btnQrTabLocal.className = 'btn btn-outline';
    loadQrCode('tunnel');
  });

  btnQrTabLocal.addEventListener('click', () => {
    btnQrTabLocal.className = 'btn btn-dark active';
    btnQrTabTunnel.className = 'btn btn-outline';
    loadQrCode('local');
  });
}

// 터널 주소 새로고침 (재발급) 함수
async function refreshTunnelAddress() {
  publicUrlInput.value = '새 인터넷 주소 발급 중... (약 5초)';
  try {
    const res = await fetch('/api/tunnel/refresh', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      alert('새로운 무료 인터넷 접속 주소가 정상 발급되었습니다!\n\n새 주소: ' + data.url);
      fetchState();
      if (qrModal.classList.contains('active')) {
        loadQrCode(currentQrType);
      }
    } else {
      alert('주소 새로고침 실패: ' + (data.error || '오류 발생'));
    }
  } catch (err) {
    alert('네트워크 오류: ' + err.message);
  }
}

const btnRefreshTunnel = document.getElementById('btnRefreshTunnel');
if (btnRefreshTunnel) {
  btnRefreshTunnel.addEventListener('click', refreshTunnelAddress);
}

const btnModalRefreshTunnel = document.getElementById('btnModalRefreshTunnel');
if (btnModalRefreshTunnel) {
  btnModalRefreshTunnel.addEventListener('click', refreshTunnelAddress);
}

// 주소 복사
btnCopyUrl.addEventListener('click', () => {
  navigator.clipboard.writeText(publicUrlInput.value);
  alert('접속 주소가 클립보드에 복사되었습니다:\n' + publicUrlInput.value);
});

// 소켓 실시간 이벤트 수신
socket.on('timer_tick', (data) => {
  adminTimer.textContent = formatTime(data.remainingSeconds);
  currentVotingState.remainingSeconds = data.remainingSeconds;
});

socket.on('vote_updated', (data) => {
  totalVotersCount.innerHTML = `${data.totalVoters || 0}<span style="font-size:1.1rem; color:#94a3b8;">명</span>`;
  if (data.votes) {
    data.votes.forEach(v => {
      const g = currentGroups.find(item => item.id === v.id);
      if (g) g.photo2VoteCount = v.voteCount;
    });
    renderFinalistsSlots();
    renderGroupsTable();
  }
});

socket.on('voting_started', () => fetchState());
socket.on('voting_ended', () => fetchState());
socket.on('voting_reset', () => fetchState());
socket.on('groups_updated', () => fetchState());
socket.on('finalists_updated', () => fetchState());
socket.on('settings_updated', () => fetchState());

// 초기 로드 (팝업 없이 바로 실행)
fetchState();
