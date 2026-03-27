/**
 * TitleBar.tsx — Electron 전용 커스텀 타이틀바
 *
 * Electron 환경(window.electronAPI 존재)에서만 렌더링됩니다.
 * 브라우저/PWA 환경에서는 null 반환으로 완전히 숨겨집니다.
 *
 * 버튼:
 *   📌 압정 — 항상 위 고정 토글
 *   ▲/▼ 접기/펼치기 — 창 높이 토글
 *   ─ 최소화
 *   ✕ 닫기
 *
 * 드래그 영역: -webkit-app-region: drag 로 창 이동 가능
 */
"use client";

import { useEffect, useState } from "react";
import styles from "./TitleBar.module.css";

/* window.electronAPI 타입 선언 */
declare global {
  interface Window {
    electronAPI?: {
      togglePin: () => Promise<boolean>;
      toggleCollapse: (isCollapsed: boolean) => Promise<boolean>;
      closeWindow: () => void;
      minimizeWindow: () => void;
      isElectron: boolean;
    };
  }
}

export default function TitleBar() {
  const [isElectron, setIsElectron] = useState(false);
  const [isPinned,   setIsPinned]   = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  /* Electron 환경 감지 (클라이언트에서만) */
  useEffect(() => {
    setIsElectron(!!window.electronAPI?.isElectron);
  }, []);

  /* Electron이 아니면 타이틀바 숨김 */
  if (!isElectron) return null;

  /* ── 압정 토글 ────────────────────────────────────────────────── */
  const handlePin = async () => {
    const newState = await window.electronAPI!.togglePin();
    setIsPinned(newState);
  };

  /* ── 접기/펼치기 ──────────────────────────────────────────────── */
  const handleCollapse = async () => {
    const next = !isCollapsed;
    await window.electronAPI!.toggleCollapse(next);
    setIsCollapsed(next);
  };

  return (
    <div className={`${styles.bar} ${isCollapsed ? styles.collapsed : ""}`}>
      {/* 드래그 영역 (창 이동) */}
      <div className={styles.drag}>
        <span className={styles.appIcon}>⬡</span>
        <span className={styles.appTitle}>FlowTool</span>
      </div>

      {/* 컨트롤 버튼들 */}
      <div className={styles.controls}>
        {/* 압정 버튼 */}
        <button
          className={`${styles.btn} ${isPinned ? styles.btnActive : ""}`}
          onClick={handlePin}
          title={isPinned ? "항상 위 고정 해제" : "항상 위 고정"}
        >
          📌
        </button>

        {/* 접기/펼치기 버튼 */}
        <button
          className={styles.btn}
          onClick={handleCollapse}
          title={isCollapsed ? "펼치기" : "접기"}
        >
          {isCollapsed ? "▼" : "▲"}
        </button>

        {/* 최소화 */}
        <button
          className={styles.btn}
          onClick={() => window.electronAPI!.minimizeWindow()}
          title="최소화"
        >
          ─
        </button>

        {/* 닫기 */}
        <button
          className={`${styles.btn} ${styles.btnClose}`}
          onClick={() => window.electronAPI!.closeWindow()}
          title="닫기"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
