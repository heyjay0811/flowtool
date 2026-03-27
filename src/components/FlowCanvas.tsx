/**
 * FlowCanvas.tsx — React Flow 메인 캔버스 컴포넌트
 *
 * 기능:
 *   - 커스텀 노드 4종 등록 (rect, diamond, circle, sticker)
 *   - 노드 드래그/이동/삭제 (Delete 키)
 *   - 엣지 연결 (핸들 → 핸들 드래그)
 *   - 우클릭 → 노드 색상 변경 컨텍스트 메뉴
 *   - 미니맵 + 확대/축소 컨트롤
 */
"use client";

import { useCallback, useState, useRef } from "react";
import {
  ReactFlow, addEdge, MiniMap, Controls, Background, BackgroundVariant,
  type Node, type Edge, type Connection, type NodeMouseHandler,
  useNodesState, useEdgesState, Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import RectNode      from "./nodes/RectNode";
import DiamondNode   from "./nodes/DiamondNode";
import CircleNode    from "./nodes/CircleNode";
import StickerNode   from "./nodes/StickerNode";
import ConnectorNode from "./nodes/ConnectorNode";
import styles from "./FlowCanvas.module.css";

/* ── 커스텀 노드 타입 등록 ──────────────────────────────────────── */
const nodeTypes = {
  rect:      RectNode,
  diamond:   DiamondNode,
  circle:    CircleNode,
  sticker:   StickerNode,
  connector: ConnectorNode,  /* 연결점 노드 */
};

/* ── 색상 팔레트 (우클릭 메뉴용) ──────────────────────────────────── */
const COLORS = [
  { key: "blue",   label: "파랑",  hex: "#3b82f6" },
  { key: "orange", label: "주황",  hex: "#f97316" },
  { key: "teal",   label: "청록",  hex: "#14b8a6" },
  { key: "purple", label: "보라",  hex: "#8b5cf6" },
  { key: "green",  label: "초록",  hex: "#22c55e" },
  { key: "red",    label: "빨강",  hex: "#ef4444" },
];

interface FlowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: ReturnType<typeof useNodesState>[2];
  onEdgesChange: ReturnType<typeof useEdgesState>[2];
  onConnect: (params: Connection) => void;
  onNodeColorChange: (nodeId: string, color: string) => void;
  onConnectorClick: (linkedFlowId: string) => void; /* 연결점 클릭 시 흐름도 전환 */
}

export default function FlowCanvas({
  nodes, edges,
  onNodesChange, onEdgesChange, onConnect,
  onNodeColorChange, onConnectorClick,
}: FlowCanvasProps) {

  /* 우클릭 컨텍스트 메뉴 상태 */
  const [ctxMenu, setCtxMenu] = useState<{
    nodeId: string; x: number; y: number;
  } | null>(null);

  /* 캔버스 컨테이너 ref (PNG 내보내기용) */
  const canvasRef = useRef<HTMLDivElement>(null);

  /* 노드 우클릭 → 컨텍스트 메뉴 표시 */
  const handleNodeContextMenu: NodeMouseHandler = useCallback((e, node) => {
    e.preventDefault();
    setCtxMenu({ nodeId: node.id, x: e.clientX, y: e.clientY });
  }, []);

  /* 노드 클릭 → connector 타입이면 연결 흐름도로 전환 */
  const handleNodeClick: NodeMouseHandler = useCallback((_e, node) => {
    if (node.type === "connector") {
      const linkedId = node.data?.linkedFlowId as string | undefined;
      if (linkedId) onConnectorClick(linkedId);
    }
  }, [onConnectorClick]);

  /* 캔버스 클릭 → 컨텍스트 메뉴 닫기 */
  const handlePaneClick = useCallback(() => {
    setCtxMenu(null);
  }, []);

  return (
    <div ref={canvasRef} className={styles.canvasWrap}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onNodeContextMenu={handleNodeContextMenu}
        onPaneClick={handlePaneClick}
        /* 삭제 키 설정 */
        deleteKeyCode="Delete"
        /* 부드러운 이동 */
        fitView
        fitViewOptions={{ padding: 0.3 }}
        /* 스타일 */
        style={{ background: "var(--bg-app)" }}
        /* 엣지 애니메이션 */
        defaultEdgeOptions={{ animated: false, style: { stroke: "#8892b0", strokeWidth: 2 } }}
        proOptions={{ hideAttribution: true }}
      >
        {/* 격자 배경 */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="rgba(255,255,255,0.06)"
        />
        {/* 미니맵 */}
        <MiniMap
          nodeColor={(n) => {
            const colorMap: Record<string, string> = {
              blue: "#3b82f6", orange: "#f97316", teal: "#14b8a6",
              purple: "#8b5cf6", green: "#22c55e", red: "#ef4444",
            };
            return colorMap[(n.data?.color as string) ?? ""] ?? "#5b6af0";
          }}
          maskColor="rgba(0,0,0,0.5)"
        />
        {/* 컨트롤 */}
        <Controls showInteractive={false} />

        {/* 도움말 패널 (좌하단) */}
        <Panel position="bottom-left" className={styles.helpPanel}>
          <span>더블클릭: 텍스트 편집</span>
          <span>우클릭: 색상 변경</span>
          <span>Delete: 삭제</span>
        </Panel>
      </ReactFlow>

      {/* ── 우클릭 컨텍스트 메뉴 ─────────────────────────────────── */}
      {ctxMenu && (
        <div
          className={styles.ctxMenu}
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          onMouseLeave={() => setCtxMenu(null)}
        >
          <p className={styles.ctxTitle}>색상 변경</p>
          <div className={styles.colorGrid}>
            {COLORS.map((c) => (
              <button
                key={c.key}
                className={styles.colorBtn}
                style={{ background: c.hex }}
                title={c.label}
                onClick={() => {
                  onNodeColorChange(ctxMenu.nodeId, c.key);
                  setCtxMenu(null);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
