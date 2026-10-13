// 최종 결과 및 시상 페이지 프론트엔드 스크립트
const grandPrizeSection = document.getElementById('grandPrizeSection');
const majorPrizesSection = document.getElementById('majorPrizesSection');
const harmonyPrizesList = document.getElementById('harmonyPrizesList');
const rankingTableBody = document.getElementById('rankingTableBody');
const btnFireConfetti = document.getElementById('btnFireConfetti');
const btnFullscreen = document.getElementById('btnFullscreen');

// 폭죽 효과 함수
function triggerConfetti() {
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.6 }
  });
  setTimeout(() => {
    confetti({
      particleCount: 80,
      angle: 60,
      spread: 55,
      origin: { x: 0 }
    });
    confetti({
      particleCount: 80,
      angle: 120,
      spread: 55,
      origin: { x: 1 }
    });
  }, 300);
}

btnFireConfetti.addEventListener('click', triggerConfetti);

// 전체화면 토글
btnFullscreen.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => alert(err.message));
  } else {
    document.exitFullscreen();
  }
});

async function loadAwards() {
  try {
    const res = await fetch('/api/awards');
    const data = await res.json();
    renderAwards(data);
    triggerConfetti();
  } catch (err) {
    console.error('시상 데이터 로드 에러:', err);
  }
}

function renderAwards(data) {
  const {
    grandPrize,
    topPrizes = [],
    secondPrizes = [],
    topGroupPrize,
    topDistrictPrize,
    secondGroupPrize,
    secondDistrictPrize,
    harmonyPrizes = [],
    ranking = [],
    awardsConfig = {},
    prizes = {}
  } = data;

  const cfg = {
    grandTitle: awardsConfig.grandTitle || '종합 대상',
    grandPrize: awardsConfig.grandPrize || prizes.grand || '상금 현금 300,000원',
    topTitle: awardsConfig.topTitle || '최우수상',
    topCount: awardsConfig.topCount || 2,
    topPrize: awardsConfig.topPrize || prizes.topGroup || '현금 200,000원',
    secondTitle: awardsConfig.secondTitle || '우수상',
    secondCount: awardsConfig.secondCount || 2,
    secondPrize: awardsConfig.secondPrize || prizes.secondGroup || '현금 150,000원',
    harmonyTitle: awardsConfig.harmonyTitle || '화합상',
    harmonyPrize: awardsConfig.harmonyPrize || prizes.harmony || '각 100,000원'
  };

  // 1. 대상 렌더링 (대형 스크린 시원하게 꽉 채우기)
  if (grandPrize) {
    grandPrizeSection.innerHTML = `
      <div class="award-card award-grand" style="padding: 32px;">
        <div class="award-badge-ribbon" style="background:#f59e0b; color:#0f172a; font-size:1.15rem; padding: 8px 24px;">
          <i class="fa-solid fa-crown"></i> ${cfg.grandTitle} (${cfg.grandPrize})
        </div>
        <div style="display:grid; grid-template-columns: minmax(480px, 46%) 1fr; gap: 36px; align-items: center;">
          <div style="position:relative; border-radius:16px; overflow:hidden; border:3px solid #f59e0b; height:380px; box-shadow: 0 12px 30px rgba(0,0,0,0.5);">
            <img src="${grandPrize.photo2Url}" style="width:100%; height:100%; object-fit:cover;" alt="대상 작품">
            <div style="position:absolute; bottom:14px; left:14px; background:rgba(0,0,0,0.75); backdrop-filter:blur(6px); padding:6px 16px; border-radius:8px; color:#fbbf24; font-size:1rem; font-weight:800; border:1px solid rgba(245, 158, 11, 0.4);">
              [사진 2] ${grandPrize.photo2Title}
            </div>
          </div>
          <div>
            <div style="display:flex; align-items:center; gap:14px; margin-bottom:14px;">
              <span class="badge badge-gold" style="font-size:1.2rem; padding:8px 20px;">
                ${grandPrize.category}
              </span>
              <span style="font-size:1.2rem; color:#94a3b8; font-weight:800;">출석률: <strong style="color:#34d399;">${grandPrize.attendanceRate}%</strong></span>
            </div>
            <h2 style="font-size: 3.2rem; font-weight: 900; color: white; margin-bottom: 12px; letter-spacing: -0.02em;">
              ${grandPrize.name}
            </h2>
            <div style="font-size: 1.6rem; color: #fde047; font-weight: 900; margin-bottom: 22px;">
              "${grandPrize.photo2Title}"
            </div>
            <p style="font-size: 1.15rem; color: #cbd5e1; margin-bottom: 28px; line-height: 1.6;">
              ${grandPrize.photo2Desc || '상모성당 25주년의 기쁨과 일치를 가장 아름답게 표현한 영예의 대상 수상작'}
            </p>
            <div style="display: flex; gap: 24px; align-items: center; background: rgba(0,0,0,0.5); padding: 18px 26px; border-radius: 14px; border: 1px solid rgba(245, 158, 11, 0.4);">
              <div>
                <span style="font-size:0.92rem; color:#94a3b8;">사진 1 출석점수:</span>
                <strong style="font-size:1.4rem; color:#93c5fd; margin-left:6px;">${grandPrize.photo1Score.toFixed(1)}점</strong>
              </div>
              <div style="color:#64748b; font-size:1.3rem;">+</div>
              <div>
                <span style="font-size:0.92rem; color:#94a3b8;">사진 2 투표점수:</span>
                <strong style="font-size:1.4rem; color:#fcd34d; margin-left:6px;">${(grandPrize.photo2Score || 0).toFixed(1)}점</strong>
              </div>
              <div style="color:#64748b; font-size:1.3rem;">=</div>
              <div>
                <span style="font-size:0.92rem; color:#94a3b8;">최종 합산 총점:</span>
                <strong style="font-size:2.2rem; color:#fbbf24; margin-left:10px;">${grandPrize.finalTotalScore.toFixed(1)}점</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 2. 최우수상 & 우수상 헤더 및 카드 렌더링
  const actualTopList = (topPrizes && topPrizes.length > 0)
    ? topPrizes
    : [topGroupPrize, topDistrictPrize].filter(Boolean);

  const actualSecondList = (secondPrizes && secondPrizes.length > 0)
    ? secondPrizes
    : [secondGroupPrize, secondDistrictPrize].filter(Boolean);

  const elMajorTitle = document.getElementById('majorHeaderTitle');
  const elMajorSubtitle = document.getElementById('majorHeaderSubtitle');
  if (elMajorTitle) {
    elMajorTitle.innerHTML = `<i class="fa-solid fa-medal text-gold"></i> ${cfg.topTitle} & ${cfg.secondTitle}`;
  }
  if (elMajorSubtitle) {
    elMajorSubtitle.textContent = `상모성당 설립 25주년을 빛낸 영예의 ${cfg.topTitle} ${actualTopList.length}팀 및 ${cfg.secondTitle} ${actualSecondList.length}팀`;
  }

  const majorCards = [];
  actualTopList.forEach(g => {
    majorCards.push({
      title: cfg.topTitle,
      prize: cfg.topPrize,
      data: g,
      color: '#3b82f6'
    });
  });
  actualSecondList.forEach(g => {
    majorCards.push({
      title: cfg.secondTitle,
      prize: cfg.secondPrize,
      data: g,
      color: '#a855f7'
    });
  });

  majorPrizesSection.innerHTML = majorCards.map(item => {
    const g = item.data;
    if (!g) return '';
    return `
      <div class="award-card" style="border-color: ${item.color}; padding: 22px;">
        <div class="award-badge-ribbon" style="background:${item.color}; color:white; font-size:0.95rem; padding: 5px 14px;">
          ${item.prize}
        </div>
        <div style="font-size:1.15rem; font-weight:900; color:${item.color}; margin-bottom:6px; letter-spacing:-0.01em;">
          <i class="fa-solid fa-medal"></i> ${item.title}
        </div>
        <h3 style="font-size: 1.85rem; font-weight: 900; color: white; margin-bottom: 6px;">
          ${g.name}
        </h3>
        <div style="font-size:1.1rem; font-weight:800; color:var(--accent-gold-light); margin-bottom:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          "${g.photo2Title}"
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:16px;">
          <div style="position:relative; border-radius:10px; overflow:hidden; height:135px; border:1px solid #334155;">
            <img src="${g.photo1Url}" style="width:100%; height:100%; object-fit:cover;" alt="단체사진">
            <span style="position:absolute; bottom:6px; left:6px; background:rgba(0,0,0,0.7); font-size:0.75rem; color:#94a3b8; padding:2px 6px; border-radius:4px;">사진 1 단체</span>
          </div>
          <div style="position:relative; border-radius:10px; overflow:hidden; height:135px; border:1px solid #334155;">
            <img src="${g.photo2Url}" style="width:100%; height:100%; object-fit:cover;" alt="활동사진">
            <span style="position:absolute; bottom:6px; left:6px; background:rgba(0,0,0,0.7); font-size:0.75rem; color:#fbbf24; padding:2px 6px; border-radius:4px;">사진 2 활동</span>
          </div>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.4); padding:12px 16px; border-radius:10px; border:1px solid rgba(255,255,255,0.06);">
          <span style="font-size:0.9rem; color:#cbd5e1;">출석률: <strong style="color:#38bdf8; font-size:1.05rem;">${g.attendanceRate}%</strong></span>
          <span style="font-size:1.3rem; font-weight:900; color:#fbbf24;">총점 ${g.finalTotalScore.toFixed(1)}점</span>
        </div>
      </div>
    `;
  }).join('');

  // 3. 화합상 렌더링 및 헤더 문구 동적 연동
  const elHarmonyHeader = document.getElementById('harmonyHeaderTitle');
  if (elHarmonyHeader) {
    elHarmonyHeader.textContent = `${cfg.harmonyTitle} (출석률 100% 달성 모임 전원 수상 · ${cfg.harmonyPrize})`;
  }

  if (harmonyPrizes && harmonyPrizes.length > 0) {
    harmonyPrizesList.innerHTML = harmonyPrizes.map(g => `
      <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.4); padding: 16px; border-radius: 12px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <span class="badge badge-green" style="font-size:0.75rem; margin-bottom:4px;">${g.category}</span>
          <div style="font-size: 1.15rem; font-weight: 800; color: white;">${g.name}</div>
          <div style="font-size: 0.85rem; color: #a7f3d0; margin-top: 2px;">출석률 100% (${g.attendedCount}/${g.registeredCount}명 전원 참석)</div>
        </div>
        <div style="text-align:right;">
          <span class="badge badge-gold" style="font-size:0.85rem; font-weight:800;">${cfg.harmonyPrize}</span>
        </div>
      </div>
    `).join('');
  } else {
    harmonyPrizesList.innerHTML = `<div style="color:#94a3b8; padding:16px;">상위 수상작 외에 출석률 100%를 달성한 추가 단체가 없습니다.</div>`;
  }

  // 4. 전체 종합 순위표 렌더링
  if (ranking) {
    rankingTableBody.innerHTML = ranking.map((g, idx) => {
      const rank = idx + 1;
      const isTop3 = rank <= 3;
      return `
        <tr style="border-bottom: 1px solid var(--border-dark); ${isTop3 ? 'background: rgba(245, 158, 11, 0.08);' : ''}">
          <td style="font-weight:900; font-size:1.1rem; color:${rank === 1 ? '#f59e0b' : (rank === 2 ? '#93c5fd' : '#f8fafc')};">
            ${rank === 1 ? '<i class="fa-solid fa-trophy text-gold"></i> 1위' : `${rank}위`}
          </td>
          <td><span class="badge ${getCategoryBadge(g.category)}">${g.category}</span></td>
          <td style="font-weight:800; font-size:1.05rem;">${g.name}</td>
          <td>${g.registeredCount}명</td>
          <td style="font-weight:700; color:#38bdf8;">${g.attendedCount}명</td>
          <td style="font-weight:700;">${g.attendanceRate}%</td>
          <td style="font-weight:800; color:#93c5fd;">${g.photo1Score.toFixed(1)}점</td>
          <td style="font-weight:800; color:#fcd34d;">${(g.photo2Score || 0).toFixed(1)}점</td>
          <td style="font-weight:900; font-size:1.25rem; color:#fbbf24;">${g.finalTotalScore.toFixed(1)}점</td>
        </tr>
      `;
    }).join('');
  }
}

function getCategoryBadge(category) {
  switch (category) {
    case '사목평의회': return 'badge-gold';
    case '평신도사도직협의회': return 'badge-blue';
    case '꾸리아(레지오마리애)': return 'badge-purple';
    default: return 'badge-green';
  }
}

// 실시간 소켓 업데이트 연동
if (typeof io !== 'undefined') {
  const socket = io();
  socket.on('settings_updated', () => {
    loadAwards();
  });
  socket.on('vote_updated', () => {
    loadAwards();
  });
  socket.on('voting_status', () => {
    loadAwards();
  });
}

// 초기화
loadAwards();
