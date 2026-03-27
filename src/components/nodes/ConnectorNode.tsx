/**
 * ConnectorNode.tsx — 연결점 노드
 *
 * 용도: 복잡한 흐름도에서 다른 흐름도 페이지로 연결하는 포탈 역할
 *
 * 동작:
 *   - 싱글 클릭 → 연결된 흐름도로 전환
 *   - 더블클릭  → 라벨 편집 모드
 *   - data.linkedFlowId  : 연결할 흐름도 ID
 *   - data.linkedFlowTitle: 연결 흐름도 제목 (표시용)
 *   - data.label         : 짧은 라벨 (A, B, 1, 2 …)
 */
"use client";

import { memo, useState, useRef, useCallback } from "react";
import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";
import styles from "./nodes.module.css";

function ConnectorNode({ id, data, selected }: NodeProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { updateNodeData } = useReactFlow();

  /* 더블클릭 → 라벨 편집 시작 */
  const startEdit = useCallback(() => {
    setDraft((data.label as string) ?? "");
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 10);
  }, [data.label]);

  /* 편집 완료 */
  const finishEdit = useCallback(() => {
    if (draft.trim()) updateNodeData(id, { label: draft.trim() });
    setEditing(false);
  }, [draft, id, updateNodeData]);

  /* 연결 흐름도 제목 (없으면 "연결 없음") */
  const linkedTitle = (data.linkedFlowTitle as string) || null;

  return (
    <div
      className={`${styles.connectorNode} ${selected ? styles.selected : ""}`}
      onDoubleClick={startEdit}
      title={linkedTitle ? `→ ${linkedTitle}` : "클릭하여 연결 흐름도 설정"}
    >
      {/* 위쪽: 흐름이 들어오는 입력 핸들 */}
      <Handle type="target" position={Position.Top}    className={styles.handle} />
      <Handle type="target" position={Position.Left}   className={styles.handle} />

      {/* 라벨 (A, B, 1, 2 …) */}
      {editing ? (
        <input
          ref={inputRef}
          className={styles.connectorInput}
          value={draft}
          maxLength={3}
          onChange={e => setDraft(e.target.value)}
          onBlur={finishEdit}
          onKeyDown={e => { if (e.key === "Enter") finishEdit(); }}
        />
      ) : (
        <span className={styles.connectorLabel}>
          {(data.label as string) || "A"}
        </span>
      )}

      {/* 연결된 흐름도 제목 (소형 표시) */}
      {linkedTitle && (
        <span className={styles.connectorSub}>→ {linkedTitle}</span>
      )}

      {/* 아래쪽: 흐름이 나가는 출력 핸들 */}
      <Handle type="source" position={Position.Bottom} className={styles.handle} />
      <Handle type="source" position={Position.Right}  className={styles.handle} />
    </div>
  );
}

export default memo(ConnectorNode);
