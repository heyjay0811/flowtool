/**
 * electron/preload.js — IPC 브릿지 (메인 ↔ 렌더러 통신)
 *
 * contextBridge를 통해 렌더러(Next.js)에서
 * window.electronAPI.xxx() 형태로 Electron API를 안전하게 호출할 수 있습니다.
 *
 * 보안: contextIsolation=true 상태에서 필요한 API만 노출합니다.
 */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  /**
   * 압정 토글 (항상 위 고정 on/off)
   * @returns {Promise<boolean>} 새 핀 상태 (true=고정됨)
   */
  togglePin: () => ipcRenderer.invoke("toggle-pin"),

  /**
   * 접기/펼치기 토글
   * @param {boolean} isCollapsed true=접기, false=펼치기
   * @returns {Promise<boolean>}
   */
  toggleCollapse: (isCollapsed) => ipcRenderer.invoke("toggle-collapse", isCollapsed),

  /**
   * 창 닫기
   */
  closeWindow: () => ipcRenderer.invoke("close-window"),

  /**
   * 창 최소화
   */
  minimizeWindow: () => ipcRenderer.invoke("minimize-window"),

  /**
   * Electron 환경인지 확인 (런타임 분기 처리용)
   */
  isElectron: true,

  /**
   * Antigravity → FlowTool 흐름도 수신 이벤트 리스너
   * flowtool-incoming.json 파일이 변경되면 main.js가 이 이벤트를 발생시킴
   * @param {function} callback - 흐름도 데이터(FlowData)를 받는 콜백
   */
  onIncomingFlow: (callback) =>
    ipcRenderer.on("incoming-flow", (_event, data) => callback(data)),
});
