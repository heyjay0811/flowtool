/**
 * page.tsx — FlowTool 메인 페이지
 *
 * 데이터 계층: 프로젝트 > 카테고리 > 흐름도
 * 저장: LocalStorage (오프라인) + Supabase (로그인 시 동기화)
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
import {
  saveFlow, loadAllFlows, createNewFlow, deleteFlow,
  saveProject, loadAllProjects, createNewProject, deleteProject as deleteProjectLocal,
  saveCategory, loadAllCategories, createNewCategory, deleteCategory as deleteCategoryLocal,
  type FlowData, type ProjectData, type CategoryData,
} from "@/lib/storage";
import { saveFlowToCloud } from "@/lib/cloudStorage";

import styles from "./page.module.css";

/* ── 노드 배치 위치 계산 ──────────────────────────────────────────── */
function getNextPosition(nodes: Node[]) {
  if (nodes.length === 0) return { x: 200, y: 100 };
  const last = nodes[nodes.length - 1];
  return { x: last.position.x, y: last.position.y + 120 };
}

const DEFAULT_COLORS: Record<string, string> = {
  circle: "teal", rect: "blue", diamond: "orange", sticker: "yellow",
};
const DEFAULT_LABELS: Record<string, string> = {
  circle: "시작", rect: "단계", diamond: "조건?", sticker: "메모",
};

export default function HomePage() {
  /* ── 현재 캔버스 상태 ────────────────────────────────────────────── */
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [flowId, setFlowId]     = useState<string>("");
  const [title, setTitle]       = useState<string>("새 흐름도");
  const [editingTitle, setEditingTitle] = useState(false);

  /* ── 계층 데이터 상태 ─────────────────────────────────────────────── */
  const [allFlows,    setAllFlows]    = useState<FlowData[]>([]);
  const [projects,    setProjects]    = useState<ProjectData[]>([]);
  const [categories,  setCategories]  = useState<CategoryData[]>([]);

  /* ── UI 상태 ──────────────────────────────────────────────────────── */
  const [toast,          setToast]          = useState<string | null>(null);
  const [isPinned,       setIsPinned]       = useState(false);
  const [hasElectronAPI, setHasElectronAPI] = useState(false);

  /* ── 초기화 ─────────────────────────────────────────────────────── */
  useEffect(() => {
    setHasElectronAPI(!!(window as any).electronAPI);
  }, []);

  /* ── 로컬스토리지에서 전체 로드 ─────────────────────────────────── */
  useEffect(() => {
    const flows = loadAllFlows().sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    setAllFlows(flows);
    setProjects(loadAllProjects().sort((a, b) => a.sortOrder - b.sortOrder));
    setCategories(loadAllCategories().sort((a, b) => a.sortOrder - b.sortOrder));

    if (flows.length > 0) {
      const recent = flows[0];
      setFlowId(recent.id);
      setTitle(recent.title);
      setNodes(recent.nodes);
      setEdges(recent.edges);
    } else {
      const nf = createNewFlow();
      setFlowId(nf.id);
      setTitle(nf.title);
      saveFlow(nf);
      setAllFlows([nf]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── 자동 저장 ──────────────────────────────────────────────────── */
  useEffect(() => {
    if (!flowId) return;
    // 현재 흐름도의 projectId/categoryId 보존
    const existing = allFlows.find(f => f.id === flowId);
    const flow: FlowData = {
      id: flowId, title, nodes, edges,
      updatedAt: new Date().toISOString(),
      projectId: existing?.projectId,
      categoryId: existing?.categoryId,
    };
    saveFlow(flow);
    saveFlowToCloud({ id: flowId, title, nodes, edges,
      projectId: flow.projectId, categoryId: flow.categoryId });
  }, [nodes, edges, flowId, title]); // eslint-disable-line

  /* ── 흐름도 목록 갱신 ───────────────────────────────────────────── */
  const refreshFlows = useCallback(() => {
    setAllFlows(loadAllFlows().sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ));
  }, []);

  /* ── Electron 수신 ──────────────────────────────────────────────── */
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.onIncomingFlow) return;
    api.onIncomingFlow((flow: FlowData) => {
      if (!flow?.nodes) return;
      setNodes(flow.nodes);
      setEdges(flow.edges ?? []);
      if (flow.title) setTitle(flow.title);
      if (flow.id)    setFlowId(flow.id);
      showToast("🎉 Antigravity에서 흐름도를 받았습니다!");
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── 토스트 ─────────────────────────────────────────────────────── */
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  /* ── 압정 ────────────────────────────────────────────────────────── */
  const handlePin = async () => {
    if (!window.electronAPI) return;
    const next = await window.electronAPI.togglePin();
    setIsPinned(next);
  };

  /* ── 엣지 연결 ──────────────────────────────────────────────────── */
  const onConnect = useCallback((params: Connection) => {
    setEdges(eds => addEdge({ ...params, animated: false }, eds));
  }, [setEdges]);

  /* ── 노드 추가 ──────────────────────────────────────────────────── */
  const handleAddNode = useCallback((type: "circle" | "rect" | "diamond" | "sticker") => {
    const newNode: Node = {
      id: crypto.randomUUID(), type,
      position: getNextPosition(nodes),
      data: { label: DEFAULT_LABELS[type] ?? type, color: DEFAULT_COLORS[type] ?? "blue" },
    };
    setNodes(nds => [...nds, newNode]);
  }, [nodes, setNodes]);

  /* ── 연결점 노드 추가 ───────────────────────────────────────────── */
  const handleAddConnector = useCallback((linkedFlowId: string, linkedFlowTitle: string) => {
    const newNode: Node = {
      id: crypto.randomUUID(), type: "connector",
      position: getNextPosition(nodes),
      data: { label: "A", linkedFlowId, linkedFlowTitle },
    };
    setNodes(nds => [...nds, newNode]);
  }, [nodes, setNodes]);

  /* ── 흐름도 전환 ────────────────────────────────────────────────── */
  const switchToFlow = useCallback((targetId: string) => {
    if (targetId === flowId) return;
    const target = loadAllFlows().find(f => f.id === targetId);
    if (!target) return;
    setFlowId(target.id);
    setTitle(target.title);
    setNodes(target.nodes);
    setEdges(target.edges);
    refreshFlows();
  }, [flowId, setNodes, setEdges, refreshFlows]);

  const handleConnectorClick = useCallback((linkedFlowId: string) => {
    switchToFlow(linkedFlowId);
  }, [switchToFlow]);

  /* ── 흐름도 CRUD ─────────────────────────────────────────────────── */
  const handleCreateFlow = useCallback((projectId?: string, categoryId?: string) => {
    const nf = createNewFlow("새 흐름도", projectId, categoryId);
    saveFlow(nf);
    setFlowId(nf.id);
    setTitle(nf.title);
    setNodes([]);
    setEdges([]);
    refreshFlows();
  }, [setNodes, setEdges, refreshFlows]);

  const handleDeleteFlow = useCallback((id: string) => {
    deleteFlow(id);
    const remaining = loadAllFlows();
    setAllFlows(remaining);
    if (id === flowId) {
      if (remaining.length > 0) {
        const next = remaining[0];
        setFlowId(next.id); setTitle(next.title);
        setNodes(next.nodes); setEdges(next.edges);
      } else {
        const nf = createNewFlow(); saveFlow(nf);
        setFlowId(nf.id); setTitle(nf.title); setNodes([]); setEdges([]);
        setAllFlows([nf]);
      }
    }
  }, [flowId, setNodes, setEdges]);

  const handleRenameFlow = useCallback((id: string, newTitle: string) => {
    const all = loadAllFlows();
    const target = all.find(f => f.id === id);
    if (!target) return;
    const updated = { ...target, title: newTitle };
    saveFlow(updated);
    if (id === flowId) setTitle(newTitle);
    refreshFlows();
  }, [flowId, refreshFlows]);

  /* ── 프로젝트 CRUD ──────────────────────────────────────────────── */
  const handleCreateProject = useCallback((name: string) => {
    const p = createNewProject(name);
    saveProject(p);
    setProjects(loadAllProjects().sort((a, b) => a.sortOrder - b.sortOrder));
  }, []);

  const handleDeleteProject = useCallback((id: string) => {
    deleteProjectLocal(id);
    setProjects(loadAllProjects().sort((a, b) => a.sortOrder - b.sortOrder));
    setCategories(loadAllCategories().sort((a, b) => a.sortOrder - b.sortOrder));
    refreshFlows();
  }, [refreshFlows]);

  const handleRenameProject = useCallback((id: string, name: string) => {
    const all = loadAllProjects();
    const p = all.find(x => x.id === id);
    if (!p) return;
    saveProject({ ...p, name });
    setProjects(loadAllProjects().sort((a, b) => a.sortOrder - b.sortOrder));
  }, []);

  /* ── 카테고리 CRUD ──────────────────────────────────────────────── */
  const handleCreateCategory = useCallback((projectId: string, name: string) => {
    const c = createNewCategory(projectId, name);
    saveCategory(c);
    setCategories(loadAllCategories().sort((a, b) => a.sortOrder - b.sortOrder));
  }, []);

  const handleDeleteCategory = useCallback((id: string) => {
    deleteCategoryLocal(id);
    setCategories(loadAllCategories().sort((a, b) => a.sortOrder - b.sortOrder));
    refreshFlows();
  }, [refreshFlows]);

  const handleRenameCategory = useCallback((id: string, name: string) => {
    const all = loadAllCategories();
    const c = all.find(x => x.id === id);
    if (!c) return;
    saveCategory({ ...c, name });
    setCategories(loadAllCategories().sort((a, b) => a.sortOrder - b.sortOrder));
  }, []);

  /* ── 노드 CRUD ──────────────────────────────────────────────────── */
  const handleDeleteNode = useCallback((id: string) => {
    setNodes(nds => nds.filter(n => n.id !== id));
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
  }, [setNodes, setEdges]);

  const handleNodeColorChange = useCallback((nodeId: string, color: string) => {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, color } } : n));
  }, [setNodes]);

  /* ── Antigravity 전달 ───────────────────────────────────────────── */
  const handleSendToAI = useCallback(async () => {
    const mermaid = exportToMermaid(nodes, edges);
    try {
      await navigator.clipboard.writeText(mermaid);
      showToast("✅ 클립보드에 복사됐습니다!");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = mermaid;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      showToast("✅ 복사됐습니다! Antigravity에 붙여넣기 하세요.");
    }
  }, [nodes, edges, showToast]);

  /* ── 새 흐름도 (툴바 버튼) ─────────────────────────────────────── */
  const handleNew = useCallback(() => {
    if (nodes.length > 0 && !confirm("새 흐름도를 만들면 현재 내용이 초기화됩니다.")) return;
    handleCreateFlow();
  }, [nodes.length, handleCreateFlow]);

  /* ── 렌더 ────────────────────────────────────────────────────────── */
  return (
    <div className={styles.app}>
      <div className={styles.content}>

        {/* ════════ 사이드패널 ════════ */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <span className={styles.appIcon}>⧡</span>
            <span className={styles.appTitle}>FlowTool</span>
            {hasElectronAPI && (
              <button
                className={`${styles.pinBtn} ${isPinned ? styles.pinActive : ""}`}
                onClick={handlePin}
                title={isPinned ? "항상 위 고정 해제" : "항상 위 고정"}
              >📌</button>
            )}
            <button className={styles.newBtn} onClick={handleNew} title="새 흐름도">＋</button>
          </div>

          <div className={styles.panelContent}>
            <WizardPanel
              nodes={nodes}
              onAddNode={handleAddNode}
              onDeleteNode={handleDeleteNode}
              projects={projects}
              categories={categories}
              allFlows={allFlows}
              activeFlowId={flowId}
              onSwitchFlow={switchToFlow}
              onCreateFlow={handleCreateFlow}
              onDeleteFlow={handleDeleteFlow}
              onAddConnector={handleAddConnector}
              onCreateProject={handleCreateProject}
              onDeleteProject={handleDeleteProject}
              onRenameProject={handleRenameProject}
              onCreateCategory={handleCreateCategory}
              onDeleteCategory={handleDeleteCategory}
              onRenameCategory={handleRenameCategory}
              onRenameFlow={handleRenameFlow}
            />
          </div>

          <AuthBar />
        </aside>

        {/* ════════ 메인 캔버스 ════════ */}
        <main className={styles.main}>
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
              <button className={styles.titleBtn} onClick={() => setEditingTitle(true)} title="제목 편집">
                {title}<span className={styles.titleEditIcon}>✏️</span>
              </button>
            )}
            <span className={styles.nodeCount}>
              {nodes.length}개 노드 · {edges.length}개 연결
            </span>
          </div>

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

          <div className={styles.toolbar}>
            <button className={styles.sendBtn} onClick={handleSendToAI}>
              📋 Antigravity에 전달
            </button>
            <div className={styles.toolbarRight}>
              <button className={styles.toolbarBtn} onClick={handleNew} title="새 흐름도">
                🗒 새로 만들기
              </button>
            </div>
          </div>
        </main>

        {toast && <div className={styles.toast}>{toast}</div>}
      </div>
    </div>
  );
}
