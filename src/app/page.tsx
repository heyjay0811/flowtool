/**
 * page.tsx — 흐름도 앱 메인 페이지
 *
 * 레이아웃:
 *   ┌──────────────┬──────────────────────────┐
 *   │  사이드패널  │         캔버스            │
 *   │  (위자드 탭) │   (React Flow)            │
 *   ├──────────────┴──────────────────────────┤
 *   │    하단 툴바 (전달/저장/제목 편집)        │
 *   └─────────────────────────────────────────┘
 *
 * 기능:
 *   - 위자드 모드: 버튼으로 노드 추가
 *   - Mermaid 전달: "Antigravity에 전달" → 클립보드 복사
 *   - LocalStorage 자동 저장
 */
"use client";

import { useState, useCallback, useEffect } from "react";
import {
  addEdge, useNodesState, useEdgesState,
  type Node, type Edge, type Connection,
} from "@xyflow/react";
import { ReactFlowProvider } from "@xyflow/react";

import FlowCanvas  from "@/components/FlowCanvas";
import WizardPanel from "@/components/WizardPanel";
import AuthBar     from "@/components/AuthBar";
import { exportToMermaid } from "@/lib/exportMermaid";
import { saveFlow, loadAllFlows, createNewFlow, deleteFlow, type FlowData } from "@/lib/storage";
import { saveFlowToCloud } from "@/lib/cloudStorage";

import styles from "./page.module.css";

/* ── 노드 배치 위치 계산 ──────────────────────────────────────────── */
function getNextPosition(nodes: Node[]) {
  // 가장 아래 노드 아래에 배치
  if (nodes.length === 0) return { x: 200, y: 100 };
  const lastNode = nodes[nodes.length - 1];
  return { x: lastNode.position.x, y: lastNode.position.y + 120 };
}

/* ── 노드 타입별 기본 색상 ────────────────────────────────────────── */
const DEFAULT_COLORS: Record<string, string> = {
  circle: "teal", rect: "blue", diamond: "orange", sticker: "yellow",
};

/* ── 기본 라벨 ────────────────────────────────────────────────────── */
const DEFAULT_LABELS: Record<string, string> = {
  circle: "시작", rect: "단계", diamond: "조건?", sticker: "메모",
};

export default function HomePage() {
  /* ── 흐름도 상태 ──────────────────────────────────────────────── */
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [flowId, setFlowId]       = useState<string>("");
  const [title, setTitle]         = useState<string>("새 흐름도");
  const [editingTitle, setEditingTitle] = useState(false);

  /* ── 전체 흐름도 목록 (사이드바 탭 표시용) ──────────────────── */
  const [allFlows, setAllFlows] = useState<FlowData[]>([]);

  /* 흐름도 목록 동기화 (nodes/edges/title 변경 시마다 최신 목록 갱신) */
  const refreshAllFlows = useCallback(() => {
    setAllFlows(loadAllFlows().sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ));
  }, []);

  /* ── 토스트 ───────────────────────────────────────────────────── */
  const [toast, setToast] = useState<string | null>(null);

  /* 압정(항상 위 고정) 상태 */
  const [isPinned, setIsPinned] = useState(false);
  /* Electron preload 여부 (window.electronAPI 존재 확인) */
  const [hasElectronAPI, setHasElectronAPI] = useState(false);
  useEffect(() => {
    setHasElectronAPI(!!(window as any).electronAPI);
  }, []);

  /* 압정 토글 핸들러 */
  const handlePin = async () => {
    if (!window.electronAPI) return;
    const next = await window.electronAPI.togglePin();
    setIsPinned(next);
  };

  /* 토스트 표시 (2초 후 사라짐) */
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  /* ── 초기 로드 (LocalStorage에서 가장 최근 흐름도 불러오기) ──── */
  useEffect(() => {
    const all = loadAllFlows();
    setAllFlows(all.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    if (all.length > 0) {
      /* 가장 최근 수정된 흐름도 불러오기 */
      const recent = all.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0];
      setFlowId(recent.id);
      setTitle(recent.title);
      setNodes(recent.nodes);
      setEdges(recent.edges);
    } else {
      /* 새 흐름도 생성 */
      const newFlow = createNewFlow();
      setFlowId(newFlow.id);
      saveFlow(newFlow);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── 자동 저장 (노드/엣지 변경 시) ─────────────────────────────  /* 자동 저장 (노드/얣지 변경 시) — 로컬 + 클라우드 병렭 */
  useEffect(() => {
    if (!flowId) return;
    const flow: FlowData = { id: flowId, title, nodes, edges, updatedAt: new Date().toISOString() };
    saveFlow(flow); // 로컬스토리지
    saveFlowToCloud({ id: flowId, title, nodes, edges }); // 클라우드 (로그인 시만 동작)
  }, [nodes, edges, flowId, title]);

  /* ── Antigravity → FlowTool 흐름도 수신 ─────────────────────────
   *
   * Antigravity가 flowtool-incoming.json 파일을 쓰면 Electron main.js가
   * fs.watch로 감지 → IPC 이벤트 → 여기서 캔버스에 자동 불러오기
   */
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.onIncomingFlow) return; /* 브라우저 환경 무시 */

    api.onIncomingFlow((flow: FlowData) => {
      /* 빈 흐름도 방어 */
      if (!flow?.nodes) return;
      /* 캔버스에 즉시 반영 */
      setNodes(flow.nodes);
      setEdges(flow.edges ?? []);
      if (flow.title) setTitle(flow.title);
      if (flow.id)    setFlowId(flow.id);
      showToast("🎉 Antigravity에서 흐름도를 받았습니다!");
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── 엣지 연결 ────────────────────────────────────────────────── */
  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({ ...params, animated: false }, eds));
  }, [setEdges]);

  /* ── 노드 추가 (위자드 버튼) ──────────────────────────────────── */
  const handleAddNode = useCallback((type: "circle" | "rect" | "diamond" | "sticker") => {
    const position = getNextPosition(nodes);
    const newNode: Node = {
      id: crypto.randomUUID(),
      type,
      position,
      data: {
        label: DEFAULT_LABELS[type] ?? type,
        color: DEFAULT_COLORS[type] ?? "blue",
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [nodes, setNodes]);

  /* ── 연결점 노드 추가 ── linkedFlowId는 선택 후 업데이트 ──────── */
  const handleAddConnector = useCallback((linkedFlowId: string, linkedFlowTitle: string) => {
    const position = getNextPosition(nodes);
    const newNode: Node = {
      id: crypto.randomUUID(),
      type: "connector",
      position,
      data: { label: "A", linkedFlowId, linkedFlowTitle },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [nodes, setNodes]);

  /* ── 흐름도 전환 ── 현재 저장 후 대상 흐름도 로드 ──────────── */
  const switchToFlow = useCallback((targetFlowId: string) => {
    if (targetFlowId === flowId) return; /* 같은 흐름도면 무시 */
    const all = loadAllFlows();
    const target = all.find(f => f.id === targetFlowId);
    if (!target) return;
    setFlowId(target.id);
    setTitle(target.title);
    setNodes(target.nodes);
    setEdges(target.edges);
    refreshAllFlows();
  }, [flowId, setNodes, setEdges, refreshAllFlows]);

  /* ── 연결점 클릭 → 연결된 흐름도 전환 ───────────────────────── */
  const handleConnectorClick = useCallback((linkedFlowId: string) => {
    switchToFlow(linkedFlowId);
  }, [switchToFlow]);

  /* ── 새 흐름도 생성 ──────────────────────────────────────────── */
  const handleCreateFlow = useCallback(() => {
    const newFlow = createNewFlow("새 흐름도");
    saveFlow(newFlow);
    setFlowId(newFlow.id);
    setTitle(newFlow.title);
    setNodes([]);
    setEdges([]);
    refreshAllFlows();
  }, [setNodes, setEdges, refreshAllFlows]);

  /* ── 흐름도 삭제 ─────────────────────────────────────────────── */
  const handleDeleteFlow = useCallback((id: string) => {
    const { deleteFlow: del } = require("@/lib/storage");
    del(id);
    const remaining = loadAllFlows();
    setAllFlows(remaining);
    if (id === flowId && remaining.length > 0) {
      const next = remaining[0];
      setFlowId(next.id); setTitle(next.title);
      setNodes(next.nodes); setEdges(next.edges);
    }
  }, [flowId, setNodes, setEdges]);

  /* ── 노드 삭제 (사이드 패널 ✕ 버튼 또는 Delete 키) ──────────── */
  const handleDeleteNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  }, [setNodes, setEdges]);

  /* ── 노드 색상 변경 (우클릭 컨텍스트 메뉴) ───────────────────── */
  const handleNodeColorChange = useCallback((nodeId: string, color: string) => {
    setNodes((nds) =>
      nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, color } } : n)
    );
  }, [setNodes]);

  /* ── Antigravity 전달 (Mermaid 클립보드 복사) ─────────────────── */
  const handleSendToAI = useCallback(async () => {
    const mermaid = exportToMermaid(nodes, edges);
    try {
      await navigator.clipboard.writeText(mermaid);
      showToast("✅ Mermaid 텍스트가 클립보드에 복사됐습니다!");
    } catch {
      /* clipboard API 실패 시 fallback */
      const ta = document.createElement("textarea");
      ta.value = mermaid;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      showToast("✅ 복사됐습니다! Antigravity에 붙여넣기 하세요.");
    }
  }, [nodes, edges, showToast]);

  /* ── 전체 초기화 ──────────────────────────────────────────────── */
  const handleNew = useCallback(() => {
    if (nodes.length > 0 && !confirm("새 흐름도를 만들면 현재 내용이 초기화됩니다.")) return;
    const newFlow = createNewFlow();
    setFlowId(newFlow.id);
    setTitle(newFlow.title);
    setNodes([]);
    setEdges([]);
    saveFlow(newFlow);
  }, [nodes.length, setNodes, setEdges]);

  /* ── 렌더 ────────────────────────────────────────────────────── */
  return (
    <div className={styles.app}>
      {/* TitleBar 아래 본문: 사이드패널 + 캔버스를 row로 배치 */}
      <div className={styles.content}>

      {/* ════════ 사이드패널 ════════ */}
      <aside className={styles.sidebar}>
        {/* 패널 헤더 (앱 타이틀) */}
        <div className={styles.sidebarHeader}>
          <span className={styles.appIcon}>⧡</span>
          <span className={styles.appTitle}>FlowTool</span>
          {/* 압정 버튼 — Electron preload 연결 시에만 표시 */}
          {hasElectronAPI && (
            <button
              className={`${styles.pinBtn} ${isPinned ? styles.pinActive : ""}`}
              onClick={handlePin}
              title={isPinned ? "항상 위 고정 해제" : "항상 위 고정 (압정)"}
            >
              📌
            </button>
          )}
          <button className={styles.newBtn} onClick={handleNew} title="새 흐름도">＋</button>
        </div>

        {/* 위자드 패널 */}
        <div className={styles.panelContent}>
          <WizardPanel
            nodes={nodes}
            onAddNode={handleAddNode}
            onDeleteNode={handleDeleteNode}
            allFlows={allFlows}
            activeFlowId={flowId}
            onSwitchFlow={switchToFlow}
            onCreateFlow={handleCreateFlow}
            onDeleteFlow={handleDeleteFlow}
            onAddConnector={handleAddConnector}
          />
        </div>

        {/* 인증 상태 바 (가장 하단) */}
        <AuthBar />
      </aside>

      {/* ════════ 메인 캔버스 영역 ════════ */}
      <main className={styles.main}>

        {/* 상단 제목 바 */}
        <div className={styles.topBar}>
          {editingTitle ? (
            <input
              className={styles.titleInput}
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={e => { if (e.key === "Enter") setEditingTitle(false); }}
              autoFocus
            />
          ) : (
            <button
              className={styles.titleBtn}
              onClick={() => setEditingTitle(true)}
              title="클릭하여 제목 편집"
            >
              {title}
              <span className={styles.titleEditIcon}>✏️</span>
            </button>
          )}
          <span className={styles.nodeCount}>
            {nodes.length}개 노드 · {edges.length}개 연결
          </span>
        </div>

        {/* 캔버스 */}
        <div className={styles.canvasArea}>
          <ReactFlowProvider>
            <FlowCanvas
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeColorChange={handleNodeColorChange}
              onConnectorClick={handleConnectorClick}
            />
          </ReactFlowProvider>
        </div>

        {/* ════════ 하단 툴바 ════════ */}
        <div className={styles.toolbar}>
          {/* Antigravity 전달 (핵심 기능) */}
          <button className={styles.sendBtn} onClick={handleSendToAI}>
            📋 Antigravity에 전달
          </button>

          {/* 노드 수 표시 */}
          <div className={styles.toolbarRight}>
            <button
              className={styles.toolbarBtn}
              onClick={handleNew}
              title="새 흐름도"
            >
              🗒 새로 만들기
            </button>
          </div>
        </div>
      </main>

      {/* ════════ 토스트 알림 ════════ */}
      {toast && <div className={styles.toast}>{toast}</div>}
      </div>{/* /content */}
    </div>
  );
}
