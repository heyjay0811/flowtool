/**
 * WizardPanel.tsx — 위자드 모드 사이드패널
 *
 * 섹션:
 *   1. 흐름도 탭 목록 — 모든 흐름도, 전환/생성/삭제
 *   2. 노드 추가 — 시작/단계/분기/메모/연결점
 *   3. 노드 목록 — 현재 캔버스의 노드
 *   4. 사용 가이드
 */
"use client";

import { type Node } from "@xyflow/react";
import { type FlowData } from "@/lib/storage";
import styles from "./Panel.module.css";

interface WizardPanelProps {
  nodes: Node[];
  onAddNode: (type: "circle" | "rect" | "diamond" | "sticker") => void;
  onDeleteNode: (id: string) => void;
  /* ── 멀티 흐름도 ──────────────────────────────────────── */
  allFlows: FlowData[];
  activeFlowId: string;
  onSwitchFlow: (id: string) => void;
  onCreateFlow: () => void;
  onDeleteFlow: (id: string) => void;
  onAddConnector: (linkedFlowId: string, linkedFlowTitle: string) => void;
}

/* 노드 타입별 표시 정보 */
const NODE_META: Record<string, { icon: string; label: string; color: string }> = {
  circle:    { icon: "●",  label: "시작/종료", color: "#14b8a6" },
  rect:      { icon: "■",  label: "단계",      color: "#3b82f6" },
  diamond:   { icon: "◆",  label: "분기",      color: "#f97316" },
  sticker:   { icon: "📝", label: "메모",      color: "#fbbf24" },
  connector: { icon: "⊙",  label: "연결점",    color: "#a855f7" },
};

export default function WizardPanel({
  nodes, onAddNode, onDeleteNode,
  allFlows, activeFlowId, onSwitchFlow, onCreateFlow, onDeleteFlow, onAddConnector,
}: WizardPanelProps) {
  return (
    <div className={styles.panel}>

      {/* ── 1. 흐름도 탭 목록 ────────────────────────────────── */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>
          흐름도 목록
          <span className={styles.badge}>{allFlows.length}</span>
          {/* 새 흐름도 만들기 버튼 */}
          <button className={styles.flowCreateBtn} onClick={onCreateFlow} title="새 흐름도 만들기">
            ＋
          </button>
        </p>

        <div className={styles.flowList}>
          {allFlows.length === 0 && (
            <p className={styles.empty}>흐름도가 없습니다.</p>
          )}
          {allFlows.map(f => (
            <div
              key={f.id}
              className={`${styles.flowItem} ${f.id === activeFlowId ? styles.flowItemActive : ""}`}
              onClick={() => onSwitchFlow(f.id)}
              title={f.title}
            >
              {/* 활성 흐름도 점 */}
              <span className={styles.flowDot}>{f.id === activeFlowId ? "●" : "○"}</span>
              <span className={styles.flowTitle}>{f.title || "새 흐름도"}</span>
              {/* 연결점으로 추가 버튼 (다른 흐름도에만 표시) */}
              {f.id !== activeFlowId && (
                <button
                  className={styles.flowLinkBtn}
                  onClick={e => { e.stopPropagation(); onAddConnector(f.id, f.title); }}
                  title="이 흐름도로 가는 연결점 추가"
                >⊙</button>
              )}
              {/* 삭제 버튼 (흐름도가 2개 이상일 때만) */}
              {allFlows.length > 1 && (
                <button
                  className={styles.flowDeleteBtn}
                  onClick={e => { e.stopPropagation(); onDeleteFlow(f.id); }}
                  title="흐름도 삭제"
                >✕</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── 2. 노드 추가 ──────────────────────────────────────── */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>노드 추가</p>
        <div className={styles.nodeButtons}>
          <button className={`${styles.nodeBtn} ${styles.nodeBtnCircle}`}
            onClick={() => onAddNode("circle")}>● 시작/종료</button>
          <button className={`${styles.nodeBtn} ${styles.nodeBtnRect}`}
            onClick={() => onAddNode("rect")}>■ 단계</button>
          <button className={`${styles.nodeBtn} ${styles.nodeBtnDiamond}`}
            onClick={() => onAddNode("diamond")}>◆ 분기</button>
          <button className={`${styles.nodeBtn} ${styles.nodeBtnSticker}`}
            onClick={() => onAddNode("sticker")}>📝 메모</button>
        </div>
      </div>

      {/* ── 3. 노드 목록 ──────────────────────────────────────── */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>
          노드 목록
          <span className={styles.badge}>{nodes.length}</span>
        </p>
        <div className={styles.nodeList}>
          {nodes.length === 0 && (
            <p className={styles.empty}>노드가 없습니다.<br/>위 버튼으로 추가하세요.</p>
          )}
          {nodes.map((n) => {
            const meta = NODE_META[n.type ?? "rect"] ?? NODE_META.rect;
            return (
              <div key={n.id} className={styles.nodeItem}>
                <span className={styles.nodeIcon} style={{ color: meta.color }}>
                  {meta.icon}
                </span>
                <span className={styles.nodeLabel}>
                  {(n.data?.label as string) || "(텍스트 없음)"}
                </span>
                <span className={styles.nodeType}>{meta.label}</span>
                <button
                  className={styles.nodeDeleteBtn}
                  onClick={() => onDeleteNode(n.id)}
                  title="노드 삭제"
                >✕</button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 4. 사용 가이드 ────────────────────────────────────── */}
      <div className={styles.guide}>
        <p>💡 <strong>더블클릭</strong>: 텍스트 편집</p>
        <p>💡 <strong>우클릭</strong>: 색상 변경</p>
        <p>💡 <strong>핸들 드래그</strong>: 연결선</p>
        <p>💡 <strong>Delete</strong>: 삭제</p>
        <p>💡 <strong>⊙ 버튼</strong>: 연결점 추가</p>
      </div>
    </div>
  );
}
