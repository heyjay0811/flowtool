/**
 * electron/main.js — Electron 메인 프로세스
 *
 * 기능:
 *   - 프레임리스 창 (커스텀 타이틀바)
 *   - 압정 버튼 → 항상 위 고정 (Always on Top) 토글
 *   - 접기/펼치기 → 창 높이 40px ↔ 전체 크기 토글
 *   - 기본 창 크기: 370×750 (PC 사이드패널 모드)
 *   - Next.js 앱 로드 (개발: localhost:3001, 프로덕션: 빌드된 앱)
 */
const { app, BrowserWindow, ipcMain, screen, Menu } = require("electron");
const path = require("path");
const fs   = require("fs");

/**
 * out/index.html 이 있으면 정적 모드 (next build 완료 상태)
 * 없으면 개발 모드 (next dev 서버가 필요)
 */
const outIndexPath = path.join(__dirname, "../out/index.html");
const isStaticBuild = fs.existsSync(outIndexPath);

/* 기본 Electron 메뉴바(File/Edit/View...) 제거 */
Menu.setApplicationMenu(null);

/** 접힌 상태의 창 높이 (타이틀바만 보임) */
const COLLAPSED_HEIGHT = 42;

/** 기본 창 너비/높이 (CSS 픽셀 기준 — scaleFactor는 createWindow에서 적용) */
const CSS_WIDTH  = 430;   /* CSS 픽셀 */
const CSS_HEIGHT = 800;   /* CSS 픽셀 */

let mainWindow;

/**
 * 메인 창 생성
 */
function createWindow() {
  /* DPI 스케일 팩터 반영: Electron width/height는 물리 픽셀 기준 */
  const { workAreaSize, scaleFactor } = screen.getPrimaryDisplay();
  const DEFAULT_WIDTH  = Math.round(CSS_WIDTH  * scaleFactor);
  const DEFAULT_HEIGHT = Math.round(CSS_HEIGHT * scaleFactor);

  /* ── 창 위치/크기 복원 ─────────────────────────────────────────── */
  /* 마지막으로 저장된 창 위치/크기를 불러옴. 없으면 기본값(우측 상단) 사용 */
  const boundsFile = path.join(app.getPath("userData"), "window-bounds.json");
  let savedBounds = null;
  try {
    if (fs.existsSync(boundsFile)) {
      savedBounds = JSON.parse(fs.readFileSync(boundsFile, "utf8"));
    }
  } catch (_) { /* 파싱 실패 시 기본값 사용 */ }

  const x = savedBounds?.x ?? workAreaSize.width - DEFAULT_WIDTH - 10;
  const y = savedBounds?.y ?? 10;
  const w = savedBounds?.width  ?? DEFAULT_WIDTH;
  const h = savedBounds?.height ?? DEFAULT_HEIGHT;

  mainWindow = new BrowserWindow({
    width:  w,
    height: h,
    x,
    y,

    /* 네이티브 프레임 허용 → 창 드래그/이동 항상 가능 */
    frame: true,
    transparent: false,

    /* 항상 위 고정 (기본값: false) */
    alwaysOnTop: false,

    /* 창 크기 조절 허용 */
    resizable: true,
    minWidth: Math.round(300 * scaleFactor),
    minHeight: COLLAPSED_HEIGHT,

    /* 보안 설정 */
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },

    icon: path.join(__dirname, "../public/icons/icon.ico"),
    backgroundColor: "#0f1117",
    title: "FlowTool",
  });

  /* ── URL 로드 ──────────────────────────────────────────────────── */
  if (isStaticBuild) {
    mainWindow.loadFile(outIndexPath);
  } else {
    mainWindow.loadURL("http://localhost:3001");
  }

  /* ── 창 위치/크기 자동 저장 ──────────────────────────────────── */
  /* 창 이동/리사이즈 완료 시 마다 저장 */
  const saveBounds = () => {
    if (!mainWindow || mainWindow.isMinimized()) return;
    try {
      fs.writeFileSync(boundsFile, JSON.stringify(mainWindow.getBounds()), "utf8");
    } catch (_) {}
  };
  mainWindow.on("moved",   saveBounds);
  mainWindow.on("resized", saveBounds);
  mainWindow.on("close",   saveBounds);

  /* Chromium 기본 우클릭 메뉴 차단 */
  mainWindow.webContents.on("context-menu", (e) => e.preventDefault());
}

/* ── Antigravity → FlowTool 흐름도 수신 파일 감시 ──────────────────
 *
 * Antigravity(AI)가  flowtool-incoming.json 파일에 흐름도 데이터를 쓰면
 * 이 감시자가 변경을 감지하고, IPC로 렌더러에 전달합니다.
 * 렌더러는 해당 데이터를 캔버스에 자동으로 불러옵니다.
 *
 * 파일 경로: <프로젝트루트>/flowtool-incoming.json
 */
const INCOMING_FILE = path.join(__dirname, "../flowtool-incoming.json");

/**
 * 파일을 읽어 JSON 파싱 후 렌더러로 IPC 전송
 */
function sendIncomingFlow() {
  if (!mainWindow) return;
  try {
    const raw  = fs.readFileSync(INCOMING_FILE, "utf8");
    const data = JSON.parse(raw);
    mainWindow.webContents.send("incoming-flow", data);
    console.log("[FlowTool] Antigravity에서 흐름도를 받았습니다:", data.title ?? "(제목 없음)");
  } catch (e) {
    console.warn("[FlowTool] incoming-flow 파싱 실패:", e.message);
  }
}

/* 파일 감시 시작 (파일이 없어도 감시 시작, 생성 시 동작) */
let watcherTimer = null;
try {
  fs.watch(path.dirname(INCOMING_FILE), (eventType, filename) => {
    /* flowtool-incoming.json 파일이 변경되거나 생성될 때만 처리 */
    if (filename !== "flowtool-incoming.json") return;
    /* 연속 이벤트 디바운스 (100ms) */
    clearTimeout(watcherTimer);
    watcherTimer = setTimeout(sendIncomingFlow, 100);
  });
} catch (_) {}

// ── 앱 이벤트 ────────────────────────────────────────────────────────
app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ── IPC 핸들러 (렌더러 → 메인 통신) ────────────────────────────────

/**
 * 압정 토글 (항상 위 고정 on/off)
 * 렌더러에서 window.electronAPI.togglePin() 호출
 */
ipcMain.handle("toggle-pin", () => {
  const current = mainWindow.isAlwaysOnTop();
  mainWindow.setAlwaysOnTop(!current);
  return !current; /* 새 상태 반환 */
});

/**
 * 접기/펼치기 토글
 * 접힌 상태: 높이 42px (타이틀바만)
 * 펼친 상태: 기본 높이 750px 복원
 */
ipcMain.handle("toggle-collapse", (_, isCollapsed) => {
  const [currentWidth] = mainWindow.getSize();
  if (isCollapsed) {
    /* 접기 → 타이틀바만 표시 */
    mainWindow.setSize(currentWidth, COLLAPSED_HEIGHT);
    mainWindow.setResizable(false);
  } else {
    /* 펼치기 → 기본 높이 복원 */
    mainWindow.setSize(currentWidth, Math.round(CSS_HEIGHT * screen.getPrimaryDisplay().scaleFactor));
    mainWindow.setResizable(true);
  }
  return isCollapsed;
});

/**
 * 창 닫기
 */
ipcMain.handle("close-window", () => {
  mainWindow.close();
});

/**
 * 창 최소화
 */
ipcMain.handle("minimize-window", () => {
  mainWindow.minimize();
});
