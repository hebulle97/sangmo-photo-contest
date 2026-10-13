const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const QRCode = require('qrcode');
const fs = require('fs');

const dataManager = require('./dataManager');
const { TunnelManager, getLocalIpAddress } = require('./tunnelManager');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;
const tunnelManager = new TunnelManager(PORT, (newUrl) => {
  dataManager.updateSettings({
    tunnelUrl: newUrl,
    publicUrl: newUrl
  });
  io.emit('settings_updated', dataManager.getSettings());
});

// 미들웨어
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads'), {
  maxAge: '7d',
  immutable: true
}));
app.use(express.static(path.join(__dirname, 'public')));

// 파일 업로드 설정 (사진 1, 사진 2)
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = 'contest_' + Date.now() + '_' + Math.round(Math.random() * 1e9) + ext;
    cb(null, uniqueName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB까지 허용
});

// 타이머 변수
let timerInterval = null;
let currentRemainingSeconds = 0;

function startServerTimer(seconds) {
  if (timerInterval) clearInterval(timerInterval);

  currentRemainingSeconds = seconds;
  dataManager.updateRemainingSeconds(currentRemainingSeconds);

  timerInterval = setInterval(() => {
    currentRemainingSeconds--;
    dataManager.updateRemainingSeconds(currentRemainingSeconds);

    io.emit('timer_tick', {
      remainingSeconds: currentRemainingSeconds,
      totalDuration: dataManager.getSettings().voteDurationSeconds
    });

    if (currentRemainingSeconds <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      console.log('[투표 마감] 5분 카운트다운이 종료되었습니다.');
      const result = dataManager.endVoting();
      io.emit('voting_ended', {
        status: 'ended',
        finalists: dataManager.getFinalists(),
        totalVoters: result.totalVoters
      });
    }
  }, 1000);
}

// -------------------------------------------------------------
// 웹 페이지 라우트
// -------------------------------------------------------------
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/screen', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'screen.html'));
});

app.get('/vote', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'vote.html'));
});

app.get('/result', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'result.html'));
});

app.get('/', (req, res) => {
  // 모바일 사용자는 /vote로 이동, 아니면 대시보드
  const userAgent = req.headers['user-agent'] || '';
  if (/mobile|android|iphone|ipad|ipod/i.test(userAgent)) {
    return res.redirect('/vote');
  }
  res.redirect('/admin');
});

// -------------------------------------------------------------
// API 엔드포인트
// -------------------------------------------------------------

// 클라이언트 IP 추출 함수 (프록시/터널 고려)
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || req.ip || 'unknown-ip';
}

// 1. 전체 상태 조회
app.get('/api/state', (req, res) => {
  const store = dataManager.getStore();
  const settings = dataManager.getSettings();
  const finalists = dataManager.getFinalists();

  res.json({
    settings,
    votingState: store.votingState,
    groups: store.groups,
    finalists,
    currentIp: getClientIp(req)
  });
});

// 2. QR 코드 이미지 생성 API
app.get('/api/qr', async (req, res) => {
  const settings = dataManager.getSettings();
  const targetUrl = req.query.url || settings.publicUrl || settings.tunnelUrl || `http://${getLocalIpAddress()}:${PORT}/vote`;
  const voteUrl = targetUrl.endsWith('/vote') ? targetUrl : `${targetUrl.replace(/\/$/, '')}/vote`;

  try {
    const qrDataUrl = await QRCode.toDataURL(voteUrl, {
      margin: 2,
      width: 400,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });
    res.json({ qrDataUrl, voteUrl });
  } catch (err) {
    res.status(500).json({ error: 'QR 코드 생성 실패' });
  }
});

// 3. 단체 등록 (사진 1, 사진 2 업로드 지원)
app.post(
  '/api/groups',
  upload.fields([
    { name: 'photo1', maxCount: 1 },
    { name: 'photo2', maxCount: 1 }
  ]),
  (req, res) => {
    try {
      const { category, name, registeredCount, attendedCount, photo2Title, photo2Desc } = req.body;

      const photo1Url = req.files && req.files['photo1'] && req.files['photo1'][0]
        ? '/uploads/' + req.files['photo1'][0].filename
        : (req.body.photo1Url || '/assets/church_exterior.jpg');

      const photo2Url = req.files && req.files['photo2'] && req.files['photo2'][0]
        ? '/uploads/' + req.files['photo2'][0].filename
        : (req.body.photo2Url || '/assets/IMG_1274.JPG');

      const newGroup = dataManager.addGroup({
        category,
        name,
        registeredCount,
        attendedCount,
        photo1Url,
        photo2Url,
        photo2Title,
        photo2Desc
      });

      io.emit('groups_updated', dataManager.getGroups());
      res.json({ success: true, group: newGroup });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// 4. 단체 수정
app.put(
  '/api/groups/:id',
  upload.fields([
    { name: 'photo1', maxCount: 1 },
    { name: 'photo2', maxCount: 1 }
  ]),
  (req, res) => {
    try {
      const { id } = req.params;
      const updates = { ...req.body };

      if (req.files && req.files['photo1'] && req.files['photo1'][0]) {
        updates.photo1Url = '/uploads/' + req.files['photo1'][0].filename;
      }
      if (req.files && req.files['photo2'] && req.files['photo2'][0]) {
        updates.photo2Url = '/uploads/' + req.files['photo2'][0].filename;
      }

      const updated = dataManager.updateGroup(id, updates);
      if (!updated) return res.status(404).json({ error: '단체를 찾을 수 없습니다.' });

      io.emit('groups_updated', dataManager.getGroups());
      res.json({ success: true, group: updated });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// 5. 단체 삭제
app.delete('/api/groups/:id', (req, res) => {
  const { id } = req.params;
  dataManager.deleteGroup(id);
  io.emit('groups_updated', dataManager.getGroups());
  res.json({ success: true });
});

// 6. 본선 5개 후보 확정
app.post('/api/finalists', (req, res) => {
  const { finalistMap } = req.body; // { groupId: candidateNumber }
  const finalists = dataManager.setFinalists(finalistMap || {});
  io.emit('finalists_updated', finalists);
  res.json({ success: true, finalists });
});

// 7. 투표 시작 (5분 타이머 가동)
app.post('/api/voting/start', (req, res) => {
  const settings = dataManager.getSettings();
  const duration = parseInt(req.body.duration) || settings.voteDurationSeconds || 300;
  const votingState = dataManager.startVoting(duration);

  startServerTimer(duration);

  io.emit('voting_started', {
    status: 'active',
    duration,
    remainingSeconds: duration,
    finalists: dataManager.getFinalists()
  });

  res.json({ success: true, votingState });
});

// 8. 투표 시간 연장 (+60초)
app.post('/api/voting/extend', (req, res) => {
  const addSeconds = parseInt(req.body.seconds) || 60;
  const vState = dataManager.getVotingState();
  if (vState.status === 'active') {
    currentRemainingSeconds += addSeconds;
    dataManager.updateRemainingSeconds(currentRemainingSeconds);
    io.emit('timer_tick', {
      remainingSeconds: currentRemainingSeconds,
      totalDuration: dataManager.getSettings().voteDurationSeconds + addSeconds
    });
    res.json({ success: true, remainingSeconds: currentRemainingSeconds });
  } else {
    res.status(400).json({ error: '진행 중인 투표가 없습니다.' });
  }
});

// 9. 투표 즉시 마감
app.post('/api/voting/end', (req, res) => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  const result = dataManager.endVoting();
  io.emit('voting_ended', {
    status: 'ended',
    finalists: dataManager.getFinalists(),
    totalVoters: result.totalVoters
  });
  res.json({ success: true, result });
});

// 9-1. 현장 투표 내역만 초기화 (0표 리셋)
app.post('/api/voting/reset', (req, res) => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  currentRemainingSeconds = dataManager.getSettings().voteDurationSeconds || 300;
  const vState = dataManager.resetVotingOnly();

  io.emit('voting_reset', {
    votingState: vState,
    groups: dataManager.getGroups(),
    finalists: dataManager.getFinalists()
  });

  res.json({ success: true, votingState: vState });
});

// 10. 모바일 투표 제출 (IP당 1회, 1인 2표제)
app.post('/api/vote', (req, res) => {
  const ip = getClientIp(req);
  const { clientKey, candidateIds } = req.body;

  const result = dataManager.castVote({
    clientKey: clientKey || ('anon_' + ip),
    ip,
    candidateIds
  });

  if (!result.success) {
    return res.status(400).json(result);
  }

  // 실시간 득표수 브로드캐스트 (블라인드 페이지용)
  // 관리자와 스크린에 득표 현황을 실시간 전송
  const finalists = dataManager.getFinalists();
  io.emit('vote_updated', {
    totalVoters: result.totalVoters,
    // 블라인드 정보 (기호번호나 단체명을 가린 상태와 원본 모두 관리자용/스크린용으로 준비)
    votes: finalists.map(f => ({
      id: f.id,
      candidateNumber: f.candidateNumber,
      voteCount: f.photo2VoteCount
    }))
  });

  res.json(result);
});

// 관리자 로그인 API
app.post('/api/login', (req, res) => {
  const { id, pw } = req.body;
  const settings = dataManager.getSettings();
  if (id === settings.adminId && pw === settings.adminPw) {
    res.json({ success: true, token: 'sangmo_admin_authenticated' });
  } else {
    res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 일치하지 않습니다.' });
  }
});

// 전체 데이터 백업 다운로드
app.get('/api/backup', (req, res) => {
  const store = dataManager.getStore();
  res.setHeader('Content-disposition', `attachment; filename=sangmo_contest_backup_${Date.now()}.json`);
  res.setHeader('Content-type', 'application/json');
  res.send(JSON.stringify(store, null, 2));
});

// 백업 데이터 복원
app.post('/api/restore', express.json({ limit: '50mb' }), (req, res) => {
  try {
    const restored = dataManager.restoreData(req.body);
    io.emit('state_reset', restored);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 11. 최종 시상 및 종합 결과 조회
app.get('/api/awards', (req, res) => {
  const awards = dataManager.calculateAwards();
  res.json(awards);
});

// 12. 관리자 설정 저장 및 터널 URL 갱신
app.post('/api/settings', (req, res) => {
  const updated = dataManager.updateSettings(req.body);
  io.emit('settings_updated', updated);
  res.json({ success: true, settings: updated });
});

// 터널 수동 재연결 / 주소 새로고침 API
app.post('/api/tunnel/refresh', async (req, res) => {
  try {
    const cloudPublicUrl = process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_URL;
    if (cloudPublicUrl) {
      dataManager.updateSettings({
        tunnelUrl: cloudPublicUrl,
        publicUrl: cloudPublicUrl
      });
      io.emit('settings_updated', dataManager.getSettings());
      return res.json({ success: true, url: cloudPublicUrl });
    }

    console.log('[관리자 요청] 무료 터널 주소 재발급 중...');
    const newTunnelUrl = await tunnelManager.startTunnel();
    if (newTunnelUrl) {
      dataManager.updateSettings({
        tunnelUrl: newTunnelUrl,
        publicUrl: newTunnelUrl
      });
      io.emit('settings_updated', dataManager.getSettings());
      res.json({ success: true, url: newTunnelUrl });
    } else {
      res.status(500).json({ success: false, error: '터널 생성 실패' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 13. 모든 데이터 초기화 (리셋)
app.post('/api/reset', (req, res) => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  const resetData = dataManager.resetAll();
  io.emit('state_reset', resetData);
  res.json({ success: true });
});

// -------------------------------------------------------------
// 서버 실행 및 터널 자동 활성화
// -------------------------------------------------------------
server.listen(PORT, async () => {
  const localIp = getLocalIpAddress();
  const localUrl = `http://${localIp}:${PORT}`;
  console.log(`\n======================================================`);
  console.log(`[상모성당 사진 콘테스트 시스템 가동]`);
  console.log(`* 로컬 주소: http://localhost:${PORT}`);
  console.log(`* 관리자 페이지: http://localhost:${PORT}/admin`);
  console.log(`* 대형스크린 화면: http://localhost:${PORT}/screen`);
  console.log(`* 신자 모바일 투표: ${localUrl}/vote`);
  console.log(`======================================================\n`);

  // 초기 설정에 로컬 IP 등록
  dataManager.updateSettings({
    localIp: localIp,
    publicUrl: localUrl
  });

  // 클라우드 호스팅 환경(Render, Railway, Glitch 등) 감지
  const cloudPublicUrl = process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_URL;
  if (cloudPublicUrl) {
    console.log(`[클라우드 서버 모드] 영구 고정 도메인 감지: ${cloudPublicUrl}`);
    dataManager.updateSettings({
      tunnelUrl: cloudPublicUrl,
      publicUrl: cloudPublicUrl
    });
    io.emit('settings_updated', dataManager.getSettings());
    console.log(`\n>>> [클라우드 고정 주소 완료] 스마트폰 접속 주소: ${cloudPublicUrl}/vote <<<\n`);
    return;
  }

  // 백그라운드에서 접속 방식 A (무료 외부 터널) 자동 실행
  try {
    const publicTunnelUrl = await tunnelManager.startTunnel();
    if (publicTunnelUrl) {
      dataManager.updateSettings({
        tunnelUrl: publicTunnelUrl,
        publicUrl: publicTunnelUrl
      });
      io.emit('settings_updated', dataManager.getSettings());
      console.log(`\n>>> [접속 방식 A 완료] 스마트폰 접속 무료 주소: ${publicTunnelUrl}/vote <<<\n`);
    }
  } catch (err) {
    console.error('터널 초기화 에러:', err.message);
  }
});

// 프로세스 종료 시 자원 해제
process.on('SIGINT', () => {
  tunnelManager.stop();
  process.exit();
});
