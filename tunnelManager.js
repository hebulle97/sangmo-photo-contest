const os = require('os');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { spawn } = require('child_process');
const localtunnel = require('localtunnel');

// 로컬 사설 IP 주소 감지
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

class TunnelManager {
  constructor(port = 3000, onUpdate = null) {
    this.port = port;
    this.publicUrl = null;
    this.activeTunnelType = null;
    this.cloudflaredProcess = null;
    this.localtunnelInstance = null;
    this.onUpdate = onUpdate;
    this.isRestarting = false;
  }

  getLocalUrl() {
    const ip = getLocalIpAddress();
    return `http://${ip}:${this.port}`;
  }

  async startTunnel() {
    this.stop();
    console.log('[터널] 무료 공개 URL 생성을 시도합니다...');

    // 1. Cloudflare Quick Tunnel 시도
    try {
      const cfUrl = await this.startCloudflared();
      if (cfUrl) {
        this.publicUrl = cfUrl;
        this.activeTunnelType = 'Cloudflare Tunnel';
        console.log(`[터널 완료] Cloudflare URL 생성 성공: ${cfUrl}`);
        if (this.onUpdate) this.onUpdate(cfUrl);
        return cfUrl;
      }
    } catch (err) {
      console.warn('[터널] Cloudflare 오류, localtunnel로 전환:', err.message);
    }

    // 2. localtunnel 시도
    try {
      const ltUrl = await this.startLocaltunnel();
      if (ltUrl) {
        this.publicUrl = ltUrl;
        this.activeTunnelType = 'Localtunnel';
        console.log(`[터널 완료] Localtunnel URL 생성 성공: ${ltUrl}`);
        if (this.onUpdate) this.onUpdate(ltUrl);
        return ltUrl;
      }
    } catch (err) {
      console.error('[터널] Localtunnel 생성 실패:', err.message);
    }

    // 터널 실패 시 로컬 Wi-Fi IP 사용
    const localUrl = this.getLocalUrl();
    this.publicUrl = localUrl;
    this.activeTunnelType = '로컬 Wi-Fi IP';
    console.log(`[터널 안내] 외부 터널 미연결, 로컬 Wi-Fi 주소 사용: ${localUrl}`);
    if (this.onUpdate) this.onUpdate(localUrl);
    return localUrl;
  }

  async startCloudflared() {
    if (process.platform !== 'win32') {
      return null;
    }
    const binPath = path.join(__dirname, 'cloudflared.exe');

    if (!fs.existsSync(binPath)) {
      console.log('[터널] Cloudflare 바이너리 다운로드 중...');
      const downloadSuccess = await this.downloadFile(
        'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe',
        binPath
      );
      if (!downloadSuccess) return null;
    }

    return new Promise((resolve) => {
      try {
        const proc = spawn(binPath, ['tunnel', '--url', `http://localhost:${this.port}`]);
        this.cloudflaredProcess = proc;

        let resolved = false;
        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve(null);
          }
        }, 15000);

        const checkOutput = (data) => {
          const text = data.toString();
          const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
          if (match && !resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve(match[0]);
          }
        };

        proc.stdout.on('data', checkOutput);
        proc.stderr.on('data', checkOutput);

        proc.on('close', (code) => {
          console.log(`[터널] Cloudflare 프로세스 종료됨 (코드: ${code})`);
          if (!this.isRestarting) {
            // 예기치 않게 닫힌 경우 5초 후 자동 재시작
            setTimeout(() => {
              if (!this.cloudflaredProcess || this.cloudflaredProcess.killed) {
                console.log('[터널] Cloudflare 터널 자동 재연결 시도...');
                this.startTunnel();
              }
            }, 5000);
          }
        });

        proc.on('error', () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve(null);
          }
        });
      } catch (e) {
        resolve(null);
      }
    });
  }

  async startLocaltunnel() {
    return new Promise(async (resolve) => {
      try {
        const tunnel = await localtunnel({ port: this.port });
        this.localtunnelInstance = tunnel;
        tunnel.on('close', () => {
          console.log('[터널] localtunnel 닫힘');
        });
        resolve(tunnel.url);
      } catch (e) {
        resolve(null);
      }
    });
  }

  downloadFile(url, dest) {
    return new Promise((resolve) => {
      const file = fs.createWriteStream(dest);
      const req = https.get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return this.downloadFile(res.headers.location, dest).then(resolve);
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.unlink(dest, () => {});
          return resolve(false);
        }
        res.pipe(file);
        file.on('finish', () => {
          file.close(() => resolve(true));
        });
      });
      req.on('error', () => {
        file.close();
        fs.unlink(dest, () => {});
        resolve(false);
      });
      req.setTimeout(10000, () => {
        req.abort();
        file.close();
        fs.unlink(dest, () => {});
        resolve(false);
      });
    });
  }

  stop() {
    this.isRestarting = true;
    if (this.cloudflaredProcess) {
      try { this.cloudflaredProcess.kill(); } catch (e) {}
      this.cloudflaredProcess = null;
    }
    if (this.localtunnelInstance) {
      try { this.localtunnelInstance.close(); } catch (e) {}
      this.localtunnelInstance = null;
    }
    this.isRestarting = false;
  }
}

module.exports = {
  TunnelManager,
  getLocalIpAddress
};
