const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

// 기본 성당 단체 샘플 데이터 (초기 상태에서 즉시 시연 및 사용 가능하도록 구성)
const INITIAL_DATA = {
  settings: {
    title: "상모성당 설립 25주년 기념 사진 콘테스트",
    subtitle: "25살 상모성당의 현재상을 담는 전신자 참여 화보형 기념서 제작 프로젝트",
    voteDurationSeconds: 300, // 5분
    votesPerUser: 2,          // 기안서 기준 1인 2표제
    defaultPhoto2Score: 20,   // 본선 외 기본 점수
    tunnelUrl: "",
    publicUrl: "",
    localIp: "",
    adminId: "admin",         // 관리자 접속 ID
    adminPw: "sangmo25"        // 관리자 접속 비밀번호 (상모성당 25주년)
  },
  votingState: {
    status: "ready", // ready, active, ended, announced
    remainingSeconds: 300,
    startTime: null,
    endTime: null,
    totalVoters: 0,
    voters: {} // { [clientKey]: { ip, candidateIds: [], time } }
  },
  groups: [
    {
      id: "grp-1",
      category: "꾸리아(레지오마리애)",
      name: "평화의 모후 Pr.",
      registeredCount: 12,
      attendedCount: 12,
      attendanceRate: 100,
      photo1Score: 50,
      photo1Url: "/assets/church_exterior.jpg",
      photo2Url: "/assets/IMG_1274.JPG",
      photo2Title: "성모님의 품 안에서 한마음",
      photo2Desc: "야외 회합 후 함께 나눈 따뜻한 은총의 미소",
      isFinalist: true,
      candidateNumber: 1,
      photo2VoteCount: 0,
      photo2Score: 0,
      finalTotalScore: 50,
      createdAt: new Date().toISOString()
    },
    {
      id: "grp-2",
      category: "평신도사도직협의회",
      name: "전례위원회 제대회",
      registeredCount: 15,
      attendedCount: 14,
      attendanceRate: 93.3,
      photo1Score: 46.7,
      photo1Url: "/assets/IMG_1275.JPG",
      photo2Url: "/assets/IMG_1276.JPG",
      photo2Title: "사탄아 물러가라! 제대의 빛",
      photo2Desc: "대축일 전례를 정성껏 준비하며 나눈 환희의 순간",
      isFinalist: true,
      candidateNumber: 2,
      photo2VoteCount: 0,
      photo2Score: 0,
      finalTotalScore: 46.7,
      createdAt: new Date().toISOString()
    },
    {
      id: "grp-3",
      category: "구역·반",
      name: "2구역 3반",
      registeredCount: 10,
      attendedCount: 10,
      attendanceRate: 100,
      photo1Score: 50,
      photo1Url: "/assets/IMG_1277.JPG",
      photo2Url: "/assets/IMG_1278.JPG",
      photo2Title: "이웃과 함께 빚는 사랑의 떡",
      photo2Desc: "반모임 후 활짝 웃는 우리 동네 신자들의 얼굴",
      isFinalist: true,
      candidateNumber: 3,
      photo2VoteCount: 0,
      photo2Score: 0,
      finalTotalScore: 50,
      createdAt: new Date().toISOString()
    },
    {
      id: "grp-4",
      category: "사목평의회",
      name: "총구역협의회",
      registeredCount: 16,
      attendedCount: 15,
      attendanceRate: 93.8,
      photo1Score: 46.9,
      photo1Url: "/assets/IMG_1279.JPG",
      photo2Url: "/assets/IMG_1280.JPG",
      photo2Title: "열정의 구역장·반장단 연수",
      photo2Desc: "상모성당 25년의 터전을 함께 일구어온 든든한 일꾼들",
      isFinalist: true,
      candidateNumber: 4,
      photo2VoteCount: 0,
      photo2Score: 0,
      finalTotalScore: 46.9,
      createdAt: new Date().toISOString()
    },
    {
      id: "grp-5",
      category: "구역·반",
      name: "5구역 1반",
      registeredCount: 8,
      attendedCount: 7,
      attendanceRate: 87.5,
      photo1Score: 43.8,
      photo1Url: "/assets/1630420707040.jpg",
      photo2Url: "/assets/church_exterior.jpg",
      photo2Title: "우리 반은 사랑이 넘쳐요",
      photo2Desc: "성경 통독 모임 후 기쁨의 손하트",
      isFinalist: true,
      candidateNumber: 5,
      photo2VoteCount: 0,
      photo2Score: 0,
      finalTotalScore: 43.8,
      createdAt: new Date().toISOString()
    },
    {
      id: "grp-6",
      category: "꾸리아(레지오마리애)",
      name: "은총의 모후 Pr.",
      registeredCount: 9,
      attendedCount: 9,
      attendanceRate: 100,
      photo1Score: 50,
      photo1Url: "/assets/IMG_1274.JPG",
      photo2Url: "/assets/IMG_1275.JPG",
      photo2Title: "묵주기도 10만 단 봉헌의 날",
      photo2Desc: "성모의 밤 촛불 아래 모인 단원들의 감사",
      isFinalist: false,
      candidateNumber: null,
      photo2VoteCount: 0,
      photo2Score: 20,
      finalTotalScore: 70,
      createdAt: new Date().toISOString()
    },
    {
      id: "grp-7",
      category: "평신도사도직협의회",
      name: "사회복지위원회 나눔회",
      registeredCount: 14,
      attendedCount: 13,
      attendanceRate: 92.9,
      photo1Score: 46.4,
      photo1Url: "/assets/IMG_1276.JPG",
      photo2Url: "/assets/IMG_1277.JPG",
      photo2Title: "따뜻한 도시락 나눔의 기쁨",
      photo2Desc: "소외된 이웃을 찾아가 전하는 예수님의 사랑",
      isFinalist: false,
      candidateNumber: null,
      photo2VoteCount: 0,
      photo2Score: 20,
      finalTotalScore: 66.4,
      createdAt: new Date().toISOString()
    }
  ]
};

class DataManager {
  constructor() {
    this.ensureDataDir();
    this.data = this.loadData();
  }

  ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  loadData() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('데이터 로드 실패, 기본값 사용:', err.message);
    }
    this.saveData(INITIAL_DATA);
    return JSON.parse(JSON.stringify(INITIAL_DATA));
  }

  saveData(data = this.data) {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('데이터 저장 오류:', err.message);
    }
  }

  getStore() {
    return this.data;
  }

  getSettings() {
    return this.data.settings;
  }

  updateSettings(newSettings) {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.saveData();
    return this.data.settings;
  }

  getGroups() {
    return this.data.groups;
  }

  addGroup({ category, name, registeredCount, attendedCount, photo1Url, photo2Url, photo2Title, photo2Desc }) {
    const reg = Math.max(1, parseInt(registeredCount) || 1);
    const att = Math.max(0, parseInt(attendedCount) || 0);
    const rate = Math.min(100, (att / reg) * 100);
    const photo1Score = parseFloat((rate * 0.5).toFixed(1)); // 50점 만점

    const newGroup = {
      id: 'grp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      category: category || '구역·반',
      name: (name || '새 단체').trim(),
      registeredCount: reg,
      attendedCount: att,
      attendanceRate: parseFloat(rate.toFixed(1)),
      photo1Score,
      photo1Url: photo1Url || '/assets/church_exterior.jpg',
      photo2Url: photo2Url || '/assets/IMG_1274.JPG',
      photo2Title: (photo2Title || '활동의 한순간').trim(),
      photo2Desc: (photo2Desc || '').trim(),
      isFinalist: false,
      candidateNumber: null,
      photo2VoteCount: 0,
      photo2Score: this.data.settings.defaultPhoto2Score || 20,
      finalTotalScore: parseFloat((photo1Score + (this.data.settings.defaultPhoto2Score || 20)).toFixed(1)),
      createdAt: new Date().toISOString()
    };

    this.data.groups.push(newGroup);
    this.saveData();
    return newGroup;
  }

  updateGroup(id, updates) {
    const idx = this.data.groups.findIndex(g => g.id === id);
    if (idx === -1) return null;

    const g = this.data.groups[idx];
    if (updates.name !== undefined) g.name = updates.name.trim();
    if (updates.category !== undefined) g.category = updates.category;
    if (updates.registeredCount !== undefined) g.registeredCount = Math.max(1, parseInt(updates.registeredCount) || 1);
    if (updates.attendedCount !== undefined) g.attendedCount = Math.max(0, parseInt(updates.attendedCount) || 0);

    const rate = Math.min(100, (g.attendedCount / g.registeredCount) * 100);
    g.attendanceRate = parseFloat(rate.toFixed(1));
    g.photo1Score = parseFloat((rate * 0.5).toFixed(1));

    if (updates.photo1Url !== undefined) g.photo1Url = updates.photo1Url;
    if (updates.photo2Url !== undefined) g.photo2Url = updates.photo2Url;
    if (updates.photo2Title !== undefined) g.photo2Title = updates.photo2Title.trim();
    if (updates.photo2Desc !== undefined) g.photo2Desc = updates.photo2Desc.trim();

    g.finalTotalScore = parseFloat((g.photo1Score + (g.photo2Score || 0)).toFixed(1));

    this.saveData();
    return g;
  }

  deleteGroup(id) {
    this.data.groups = this.data.groups.filter(g => g.id !== id);
    this.saveData();
    return true;
  }

  // 본선 5개 후보 지정 (후보 번호 1~5번)
  setFinalists(finalistMap) {
    // finalistMap: { [groupId]: candidateNumber(1..5) }
    this.data.groups.forEach(g => {
      if (finalistMap[g.id]) {
        g.isFinalist = true;
        g.candidateNumber = parseInt(finalistMap[g.id]);
      } else {
        g.isFinalist = false;
        g.candidateNumber = null;
      }
    });
    this.saveData();
    return this.getFinalists();
  }

  getFinalists() {
    return this.data.groups
      .filter(g => g.isFinalist && g.candidateNumber)
      .sort((a, b) => a.candidateNumber - b.candidateNumber);
  }

  // 투표 관련 상태
  getVotingState() {
    return this.data.votingState;
  }

  startVoting(durationSeconds = 300) {
    this.data.votingState = {
      status: 'active',
      remainingSeconds: durationSeconds,
      startTime: Date.now(),
      endTime: Date.now() + durationSeconds * 1000,
      totalVoters: 0,
      voters: {}
    };

    // 득표수 초기화
    this.data.groups.forEach(g => {
      g.photo2VoteCount = 0;
    });

    this.saveData();
    return this.data.votingState;
  }

  updateRemainingSeconds(seconds) {
    if (this.data.votingState) {
      this.data.votingState.remainingSeconds = seconds;
    }
  }

  // 투표 처리 (1인 2표제 지원 및 접속 IP / 고유키 중복 검증)
  castVote({ clientKey, ip, candidateIds }) {
    if (this.data.votingState.status !== 'active') {
      return { success: false, message: '현재 투표 진행 시간이 아닙니다.' };
    }

    if (this.data.votingState.remainingSeconds <= 0) {
      return { success: false, message: '투표가 마감되었습니다.' };
    }

    // 중복 투표 검증 (기기 고유 식별자 기반)
    const voters = this.data.votingState.voters;
    if (voters[clientKey]) {
      return { success: false, message: '이미 투표에 참여하셨습니다. (1인 1회 제한)' };
    }

    const requiredCount = this.data.settings.votesPerUser || 2;
    if (!Array.isArray(candidateIds) || candidateIds.length !== requiredCount) {
      return { success: false, message: `정확히 ${requiredCount}개의 후보를 선택해야 합니다.` };
    }

    // 중복 선택 방지
    const uniqueIds = Array.from(new Set(candidateIds));
    if (uniqueIds.length !== requiredCount) {
      return { success: false, message: '서로 다른 후보를 선택해 주세요.' };
    }

    // 후보 득표 증가
    let validCount = 0;
    for (const cId of uniqueIds) {
      const target = this.data.groups.find(g => g.id === cId && g.isFinalist);
      if (target) {
        target.photo2VoteCount = (target.photo2VoteCount || 0) + 1;
        validCount++;
      }
    }

    if (validCount !== requiredCount) {
      return { success: false, message: '유효하지 않은 후보가 포함되어 있습니다.' };
    }

    // 투표자 기록
    voters[clientKey] = {
      ip,
      candidateIds: uniqueIds,
      time: new Date().toISOString()
    };
    this.data.votingState.totalVoters = Object.keys(voters).length;

    this.saveData();
    return {
      success: true,
      message: '투표가 성공적으로 완료되었습니다!',
      totalVoters: this.data.votingState.totalVoters
    };
  }

  // 투표 마감 및 [사진 2] 점수 자동 환산
  // 1위 50점, 2위 45점, 3위 40점, 4위 35점, 5위 30점 (본선 외 기본 점수 부여)
  endVoting() {
    this.data.votingState.status = 'ended';
    this.data.votingState.remainingSeconds = 0;

    const finalists = this.getFinalists();
    // 득표수 내림차순 정렬 (득표수 동률 시 실제 참가 인원수 많은 순)
    finalists.sort((a, b) => {
      if (b.photo2VoteCount !== a.photo2VoteCount) {
        return b.photo2VoteCount - a.photo2VoteCount;
      }
      return b.attendedCount - a.attendedCount;
    });

    const rankScores = [50, 45, 40, 35, 30];
    finalists.forEach((group, index) => {
      const score = rankScores[index] !== undefined ? rankScores[index] : 30;
      group.photo2Score = score;
      group.finalTotalScore = parseFloat((group.photo1Score + score).toFixed(1));
    });

    // 본선에 오르지 못한 일반 단체는 기본 점수 부여
    const defaultScore = this.data.settings.defaultPhoto2Score || 20;
    this.data.groups.forEach(group => {
      if (!group.isFinalist) {
        group.photo2Score = defaultScore;
        group.finalTotalScore = parseFloat((group.photo1Score + defaultScore).toFixed(1));
      }
    });

    this.saveData();
    return {
      finalists,
      totalVoters: this.data.votingState.totalVoters
    };
  }

  // 단체 및 사진 정보는 보존하고 오직 투표 내역만 0표/05:00으로 초기화
  resetVotingOnly() {
    const duration = this.data.settings.voteDurationSeconds || 300;
    this.data.votingState = {
      status: 'ready',
      remainingSeconds: duration,
      startTime: null,
      endTime: null,
      totalVoters: 0,
      voters: {}
    };

    const defaultScore = this.data.settings.defaultPhoto2Score || 20;
    this.data.groups.forEach(g => {
      g.photo2VoteCount = 0;
      g.photo2Score = defaultScore;
      g.finalTotalScore = parseFloat((g.photo1Score + defaultScore).toFixed(1));
    });

    this.saveData();
    return this.data.votingState;
  }

  // 최종 결과 및 시상 집계 계산 (기안서 5번 시상 내역 및 동률 처리 원칙 반영)
  calculateAwards() {
    // 동률 처리 원칙:
    // 최종 합산 점수가 동일한 경우, 실제 참가 인원수가 더 많은 팀을 우선 선정
    const allGroups = [...this.data.groups].sort((a, b) => {
      if (b.finalTotalScore !== a.finalTotalScore) {
        return b.finalTotalScore - a.finalTotalScore;
      }
      // 동점 시 참가 인원수 우선
      if (b.attendedCount !== a.attendedCount) {
        return b.attendedCount - a.attendedCount;
      }
      // 그 다음 등록 인원수 우선
      return b.registeredCount - a.registeredCount;
    });

    // 시상 내역 분류
    // 1. 대상 (1팀): 종합 합산 점수 전체 1위 (현금 300,000원)
    const grandPrize = allGroups.length > 0 ? allGroups[0] : null;
    const awardedIds = new Set();
    if (grandPrize) awardedIds.add(grandPrize.id);

    // 부문 분류:
    // A부문: 위원회 / 단체 / 레지오 (사목평의회, 평신도사도직협의회, 꾸리아(레지오마리애))
    // B부문: 구역 / 반
    const isGroupCategory = (cat) => cat !== '구역·반';

    const groupDivision = allGroups.filter(g => isGroupCategory(g.category) && !awardedIds.has(g.id));
    const districtDivision = allGroups.filter(g => !isGroupCategory(g.category) && !awardedIds.has(g.id));

    // 2. 최우수상 (2팀): 위원회/단체 부문 1위, 구역/반 부문 1위 (각 200,000원)
    const topGroupPrize = groupDivision.length > 0 ? groupDivision[0] : null;
    if (topGroupPrize) awardedIds.add(topGroupPrize.id);

    const topDistrictPrize = districtDivision.length > 0 ? districtDivision[0] : null;
    if (topDistrictPrize) awardedIds.add(topDistrictPrize.id);

    // 3. 우수상 (2팀): 위원회/단체 부문 2위, 구역/반 부문 2위 (각 150,000원)
    const remainingGroup = allGroups.filter(g => isGroupCategory(g.category) && !awardedIds.has(g.id));
    const remainingDistrict = allGroups.filter(g => !isGroupCategory(g.category) && !awardedIds.has(g.id));

    const secondGroupPrize = remainingGroup.length > 0 ? remainingGroup[0] : null;
    if (secondGroupPrize) awardedIds.add(secondGroupPrize.id);

    const secondDistrictPrize = remainingDistrict.length > 0 ? remainingDistrict[0] : null;
    if (secondDistrictPrize) awardedIds.add(secondDistrictPrize.id);

    // 4. 화합상 (다수): 사진 1 출석률 100%를 달성하여 성실히 출품한 모임 (상위 수상팀 제외 전 모임) (각 100,000원)
    const harmonyPrizes = allGroups.filter(g => {
      return !awardedIds.has(g.id) && g.attendanceRate >= 100;
    });

    return {
      grandPrize,         // 대상 (30만원)
      topGroupPrize,      // 최우수상 - 위원회/단체/레지오 (20만원)
      topDistrictPrize,   // 최우수상 - 구역/반 (20만원)
      secondGroupPrize,   // 우수상 - 위원회/단체/레지오 (15만원)
      secondDistrictPrize,// 우수상 - 구역/반 (15만원)
      harmonyPrizes,      // 화합상 (각 10만원)
      ranking: allGroups  // 전체 종합 순위표
    };
  }

  restoreData(importedData) {
    if (!importedData || !importedData.groups) {
      throw new Error('유효한 백업 데이터 형식이 아닙니다.');
    }
    this.data = importedData;
    this.saveData();
    return this.data;
  }

  resetAll() {
    this.data = JSON.parse(JSON.stringify(INITIAL_DATA));
    this.saveData();
    return this.data;
  }
}

module.exports = new DataManager();
