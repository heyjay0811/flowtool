/**
 * WizardPanel.tsx — 3단계 계층 사이드패널
 *
 * 구조:
 *   [프로젝트] ▾
 *     [카테고리] ▾
 *       ○ 흐름도 제목  ⊙ ✕
 *   [+ 새 프로젝트]
 *
 * 섹션:
 *   1. 계층 트리  — 프로젝트 > 카테고리 > 흐름도
 *   2. 노드 추가  — 시작/단계/분기/메모
 *   3. 노드 목록  — 현재 캔버스
 *   4. 사용 가이드
 */
"use client";

import { useState } from "react";
import { type Node, type Edge } from "@xyflow/react";
import { type FlowData, type ProjectData, type CategoryData } from "@/lib/storage";
import QuickBuilder from "./QuickBuilder";
import styles from "./Panel.module.css";

interface WizardPanelProps {
  /* ── 현재 캔버스 ────────────────────────────────────────────────── */
  nodes: Node[];
  onAddNode: (type: "circle" | "rect" | "diamond" | "sticker") => void;
  onDeleteNode: (id: string) => void;
  /** 키보드 빠른입력에서 노드+엣지 동시 추가 */
  onAddNodes: (newNodes: Node[], newEdges: Edge[]) => void;
  /* ── 계층 데이터 ────────────────────────────────────────────────── */
  projects: ProjectData[];
  categories: CategoryData[];
  allFlows: FlowData[];
  activeFlowId: string;
  /* ── 핸들러 ─────────────────────────────────────────────────────── */
  onSwitchFlow: (id: string) => void;
  onCreateFlow: (projectId?: string, categoryId?: string) => void;
  onDeleteFlow: (id: string) => void;
  onAddConnector: (linkedFlowId: string, linkedFlowTitle: string) => void;
  onCreateProject: (name: string) => void;
  onDeleteProject: (id: string) => void;
  onRenameProject: (id: string, name: string) => void;
  onCreateCategory: (projectId: string, name: string) => void;
  onDeleteCategory: (id: string) => void;
  onRenameCategory: (id: string, name: string) => void;
  onRenameFlow: (id: string, title: string) => void;
}

const NODE_META: Record<string, { icon: string; label: string; color: string }> = {
  circle:    { icon: "●",  label: "시작/종료", color: "#14b8a6" },
  rect:      { icon: "■",  label: "단계",      color: "#3b82f6" },
  diamond:   { icon: "◆",  label: "분기",      color: "#f97316" },
  sticker:   { icon: "📝", label: "메모",      color: "#fbbf24" },
  connector: { icon: "⊙",  label: "연결점",    color: "#a855f7" },
};

/** 인라인 편집 입력창 */
function InlineEdit({
  value, onConfirm, onCancel,
}: { value: string; onConfirm: (v: string) => void; onCancel: () => void }) {
  const [text, setText] = useState(value);
  return (
    <input
      className={styles.inlineEdit}
      value={text}
      autoFocus
      onChange={e => setText(e.target.value)}
      onBlur={() => onConfirm(text.trim() || value)}
      onKeyDown={e => {
        if (e.key === "Enter") onConfirm(text.trim() || value);
        if (e.key === "Escape") onCancel();
      }}
      onClick={e => e.stopPropagation()}
    />
  );
}

export default function WizardPanel({
  nodes, onAddNode, onDeleteNode, onAddNodes,
  projects, categories, allFlows, activeFlowId,
  onSwitchFlow, onCreateFlow, onDeleteFlow, onAddConnector,
  onCreateProject, onDeleteProject, onRenameProject,
  onCreateCategory, onDeleteCategory, onRenameCategory,
  onRenameFlow,
}: WizardPanelProps) {
  /** 현재 활성 탭: 흐름도 트리 or 키보드 빠른입력 */
  const [activeTab, setActiveTab] = useState<"tree" | "quick">("tree");
  /* ── 접힌 프로젝트/카테고리 트래킹 ────────────────────────────── */
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  /** 검색 필터 */
  const [search, setSearch] = useState("");

  /** 인라인 편집 상태: { type, id } */
  const [editing, setEditing] = useState<{ type: "project" | "category" | "flow"; id: string } | null>(null);

  /** 새 항목 입력 상태 */
  const [newProjectName, setNewProjectName] = useState("");
  const [addingCategory, setAddingCategory] = useState<string | null>(null); // projectId
  const [newCategoryName, setNewCategoryName] = useState("");

  const toggleProject = (id: string) =>
    setCollapsedProjects(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleCategory = (id: string) =>
    setCollapsedCategories(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  /* ── 흐름도 필터링 ─────────────────────────────────────────────── */
  const filtered = search
    ? allFlows.filter(f => f.title.toLowerCase().includes(search.toLowerCase()))
    : null; // null이면 계층 표시

  /* ── 미분류 흐름도 (projectId 없는 것) ───────────────────────── */
  const unclassifiedFlows = allFlows.filter(f => !f.projectId);

  return (
    <div className={styles.panel}>

      {/* ── 탭 전환 버튼 ─────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 4, marginBottom: 2 }}>
        <button
          onClick={() => setActiveTab("tree")}
          style={{
            flex: 1, padding: "6px 0", fontSize: 11, fontWeight: 700,
            borderRadius: 8, border: "1px solid var(--border)",
            background: activeTab === "tree" ? "var(--accent)" : "var(--bg-surface)",
            color: activeTab === "tree" ? "#fff" : "var(--text-secondary)",
            cursor: "pointer", transition: "all 0.15s",
          }}
        >📁 흐름도</button>
        <button
          onClick={() => setActiveTab("quick")}
          style={{
            flex: 1, padding: "6px 0", fontSize: 11, fontWeight: 700,
            borderRadius: 8, border: "1px solid var(--border)",
            background: activeTab === "quick" ? "var(--accent)" : "var(--bg-surface)",
            color: activeTab === "quick" ? "#fff" : "var(--text-secondary)",
            cursor: "pointer", transition: "all 0.15s",
          }}
        >⌨ 빠른입력</button>
      </div>

      {/* ── 빠른입력 탭 ──────────────────────────────────────────── */}
      {activeTab === "quick" && (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>⌨ 키보드 빠른 입력</p>
          <QuickBuilder
            nodes={nodes}
            onAddNodes={onAddNodes}
            onDeleteNode={onDeleteNode}
          />
        </div>
      )}

      {/* ── 흐름도 탭 ────────────────────────────────────────────── */}
      {activeTab === "tree" && <>

      {/* ── 검색창 ───────────────────────────────────────────────── */}
      <div className={styles.searchBox}>
        <span className={styles.searchIcon}>🔍</span>
        <input
          className={styles.searchInput}
          placeholder="흐름도 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className={styles.searchClear} onClick={() => setSearch("")}>✕</button>
        )}
      </div>

      {/* ── 1. 계층 트리 ─────────────────────────────────────────── */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>
          프로젝트
          <button className={styles.flowCreateBtn} onClick={() => setNewProjectName("NEW")} title="새 프로젝트">＋</button>
        </p>

        {/* 검색 결과 모드 */}
        {filtered && (
          <div className={styles.searchResultList}>
            {filtered.length === 0 && <p className={styles.empty}>검색 결과 없음</p>}
            {filtered.map(f => (
              <FlowItem
                key={f.id} flow={f} active={f.id === activeFlowId}
                editing={editing?.type === "flow" && editing.id === f.id}
                onSwitch={() => onSwitchFlow(f.id)}
                onStartEdit={() => setEditing({ type: "flow", id: f.id })}
                onConfirmEdit={v => { onRenameFlow(f.id, v); setEditing(null); }}
                onCancelEdit={() => setEditing(null)}
                onDelete={() => onDeleteFlow(f.id)}
                onAddConnector={() => onAddConnector(f.id, f.title)}
                showConnector={f.id !== activeFlowId}
              />
            ))}
          </div>
        )}

        {/* 계층 트리 모드 */}
        {!filtered && (
          <div className={styles.treeList}>

            {/* 미분류 흐름도 */}
            {unclassifiedFlows.length > 0 && (
              <div className={styles.unclassified}>
                <span className={styles.treeLabel}>📂 미분류</span>
                {unclassifiedFlows.map(f => (
                  <FlowItem
                    key={f.id} flow={f} active={f.id === activeFlowId}
                    editing={editing?.type === "flow" && editing.id === f.id}
                    onSwitch={() => onSwitchFlow(f.id)}
                    onStartEdit={() => setEditing({ type: "flow", id: f.id })}
                    onConfirmEdit={v => { onRenameFlow(f.id, v); setEditing(null); }}
                    onCancelEdit={() => setEditing(null)}
                    onDelete={() => onDeleteFlow(f.id)}
                    onAddConnector={() => onAddConnector(f.id, f.title)}
                    showConnector={f.id !== activeFlowId}
                    indent={1}
                  />
                ))}
              </div>
            )}

            {/* 프로젝트 목록 */}
            {projects.map(project => {
              const collapsed = collapsedProjects.has(project.id);
              const projCategories = categories.filter(c => c.projectId === project.id);
              const projFlows = allFlows.filter(f => f.projectId === project.id && !f.categoryId);

              return (
                <div key={project.id} className={styles.projectBlock}>
                  {/* 프로젝트 헤더 */}
                  <div className={styles.projectRow} onClick={() => toggleProject(project.id)}>
                    <span className={styles.treeArrow}>{collapsed ? "▸" : "▾"}</span>
                    {editing?.type === "project" && editing.id === project.id ? (
                      <InlineEdit
                        value={project.name}
                        onConfirm={v => { onRenameProject(project.id, v); setEditing(null); }}
                        onCancel={() => setEditing(null)}
                      />
                    ) : (
                      <span
                        className={styles.projectName}
                        onDoubleClick={e => { e.stopPropagation(); setEditing({ type: "project", id: project.id }); }}
                      >{project.name}</span>
                    )}
                    <button className={styles.treeAddBtn}
                      onClick={e => { e.stopPropagation(); setAddingCategory(project.id); setNewCategoryName(""); }}
                      title="카테고리 추가">+카테</button>
                    <button className={styles.treeAddBtn}
                      onClick={e => { e.stopPropagation(); onCreateFlow(project.id); }}
                      title="흐름도 추가">+흐름</button>
                    <button className={styles.flowDeleteBtn}
                      onClick={e => { e.stopPropagation(); if (confirm(`"${project.name}" 프로젝트를 삭제할까요?`)) onDeleteProject(project.id); }}
                      title="프로젝트 삭제">✕</button>
                  </div>

                  {/* 프로젝트 내용 (펼침 상태) */}
                  {!collapsed && (
                    <div className={styles.projectContent}>
                      {/* 새 카테고리 입력 */}
                      {addingCategory === project.id && (
                        <div className={styles.newItemRow}>
                          <input
                            className={styles.inlineEdit} autoFocus
                            value={newCategoryName}
                            onChange={e => setNewCategoryName(e.target.value)}
                            placeholder="카테고리 이름"
                            onKeyDown={e => {
                              if (e.key === "Enter" && newCategoryName.trim()) {
                                onCreateCategory(project.id, newCategoryName.trim());
                                setAddingCategory(null);
                              }
                              if (e.key === "Escape") setAddingCategory(null);
                            }}
                            onBlur={() => setAddingCategory(null)}
                          />
                        </div>
                      )}

                      {/* 카테고리 목록 */}
                      {projCategories.map(cat => {
                        const catCollapsed = collapsedCategories.has(cat.id);
                        const catFlows = allFlows.filter(f => f.categoryId === cat.id);
                        return (
                          <div key={cat.id} className={styles.categoryBlock}>
                            <div className={styles.categoryRow} onClick={() => toggleCategory(cat.id)}>
                              <span className={styles.treeArrow}>{catCollapsed ? "▸" : "▾"}</span>
                              {editing?.type === "category" && editing.id === cat.id ? (
                                <InlineEdit
                                  value={cat.name}
                                  onConfirm={v => { onRenameCategory(cat.id, v); setEditing(null); }}
                                  onCancel={() => setEditing(null)}
                                />
                              ) : (
                                <span
                                  className={styles.categoryName}
                                  onDoubleClick={e => { e.stopPropagation(); setEditing({ type: "category", id: cat.id }); }}
                                >{cat.name}</span>
                              )}
                              <button className={styles.treeAddBtn}
                                onClick={e => { e.stopPropagation(); onCreateFlow(project.id, cat.id); }}
                                title="흐름도 추가">+</button>
                              <button className={styles.flowDeleteBtn}
                                onClick={e => { e.stopPropagation(); onDeleteCategory(cat.id); }}
                                title="카테고리 삭제">✕</button>
                            </div>
                            {!catCollapsed && catFlows.map(f => (
                              <FlowItem
                                key={f.id} flow={f} active={f.id === activeFlowId}
                                editing={editing?.type === "flow" && editing.id === f.id}
                                onSwitch={() => onSwitchFlow(f.id)}
                                onStartEdit={() => setEditing({ type: "flow", id: f.id })}
                                onConfirmEdit={v => { onRenameFlow(f.id, v); setEditing(null); }}
                                onCancelEdit={() => setEditing(null)}
                                onDelete={() => onDeleteFlow(f.id)}
                                onAddConnector={() => onAddConnector(f.id, f.title)}
                                showConnector={f.id !== activeFlowId}
                                indent={2}
                              />
                            ))}
                          </div>
                        );
                      })}

                      {/* 카테고리 없는 프로젝트 직속 흐름도 */}
                      {projFlows.map(f => (
                        <FlowItem
                          key={f.id} flow={f} active={f.id === activeFlowId}
                          editing={editing?.type === "flow" && editing.id === f.id}
                          onSwitch={() => onSwitchFlow(f.id)}
                          onStartEdit={() => setEditing({ type: "flow", id: f.id })}
                          onConfirmEdit={v => { onRenameFlow(f.id, v); setEditing(null); }}
                          onCancelEdit={() => setEditing(null)}
                          onDelete={() => onDeleteFlow(f.id)}
                          onAddConnector={() => onAddConnector(f.id, f.title)}
                          showConnector={f.id !== activeFlowId}
                          indent={1}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* 새 프로젝트 입력 */}
            {newProjectName !== "" && (
              <div className={styles.newItemRow}>
                <input
                  className={styles.inlineEdit} autoFocus
                  value={newProjectName === "NEW" ? "" : newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  placeholder="프로젝트 이름"
                  onKeyDown={e => {
                    if (e.key === "Enter" && newProjectName.trim() && newProjectName !== "NEW") {
                      onCreateProject(newProjectName.trim());
                      setNewProjectName("");
                    }
                    if (e.key === "Escape") setNewProjectName("");
                  }}
                  onBlur={() => setNewProjectName("")}
                />
              </div>
            )}

            {/* 프로젝트 없는 빈 상태 */}
            {projects.length === 0 && unclassifiedFlows.length === 0 && (
              <p className={styles.empty}>＋ 버튼으로 프로젝트를 만드세요</p>
            )}
          </div>
        )}
      </div>

      {/* ── 2. 노드 추가 ─────────────────────────────────────────── */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>노드 추가</p>
        <div className={styles.nodeButtons}>
          <button className={`${styles.nodeBtn} ${styles.nodeBtnCircle}`} onClick={() => onAddNode("circle")}>● 시작/종료</button>
          <button className={`${styles.nodeBtn} ${styles.nodeBtnRect}`} onClick={() => onAddNode("rect")}>■ 단계</button>
          <button className={`${styles.nodeBtn} ${styles.nodeBtnDiamond}`} onClick={() => onAddNode("diamond")}>◆ 분기</button>
          <button className={`${styles.nodeBtn} ${styles.nodeBtnSticker}`} onClick={() => onAddNode("sticker")}>📝 메모</button>
        </div>
      </div>

      {/* ── 3. 노드 목록 ─────────────────────────────────────────── */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>
          노드 목록<span className={styles.badge}>{nodes.length}</span>
        </p>
        <div className={styles.nodeList}>
          {nodes.length === 0 && <p className={styles.empty}>노드가 없습니다.<br/>위 버튼으로 추가하세요.</p>}
          {nodes.map(n => {
            const meta = NODE_META[n.type ?? "rect"] ?? NODE_META.rect;
            return (
              <div key={n.id} className={styles.nodeItem}>
                <span className={styles.nodeIcon} style={{ color: meta.color }}>{meta.icon}</span>
                <span className={styles.nodeLabel}>{(n.data?.label as string) || "(텍스트 없음)"}</span>
                <span className={styles.nodeType}>{meta.label}</span>
                <button className={styles.nodeDeleteBtn} onClick={() => onDeleteNode(n.id)} title="노드 삭제">✕</button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 4. 사용 가이드 ───────────────────────────────────────── */}
      <div className={styles.guide}>
        <p>💡 <strong>더블클릭</strong>: 텍스트/이름 편집</p>
        <p>💡 <strong>핸들 드래그</strong>: 연결선</p>
        <p>💡 <strong>⊙ 버튼</strong>: 연결점 추가</p>
        <p>💡 <strong>Delete</strong>: 삭제</p>
      </div>

      </> /* activeTab === "tree" 섹션 끝 */}

    </div>
  );
}

/* ── FlowItem 서브 컴포넌트 ──────────────────────────────────────────────────── */
function FlowItem({
  flow, active, editing,
  onSwitch, onStartEdit, onConfirmEdit, onCancelEdit,
  onDelete, onAddConnector, showConnector, indent = 0,
}: {
  flow: FlowData; active: boolean; editing: boolean;
  onSwitch: () => void; onStartEdit: () => void;
  onConfirmEdit: (v: string) => void; onCancelEdit: () => void;
  onDelete: () => void; onAddConnector: () => void;
  showConnector: boolean; indent?: number;
}) {
  return (
    <div
      className={`${styles.flowItem} ${active ? styles.flowItemActive : ""}`}
      style={{ paddingLeft: `${8 + indent * 12}px` }}
      onClick={onSwitch}
    >
      <span className={styles.flowDot}>{active ? "●" : "○"}</span>
      {editing ? (
        <InlineEdit value={flow.title} onConfirm={onConfirmEdit} onCancel={onCancelEdit} />
      ) : (
        <span
          className={styles.flowTitle}
          onDoubleClick={e => { e.stopPropagation(); onStartEdit(); }}
          title={flow.title}
        >{flow.title}</span>
      )}
      {showConnector && (
        <button className={styles.flowLinkBtn}
          onClick={e => { e.stopPropagation(); onAddConnector(); }} title="연결점 추가">⊙</button>
      )}
      <button className={styles.flowDeleteBtn}
        onClick={e => { e.stopPropagation(); onDelete(); }} title="삭제">✕</button>
    </div>
  );
}
