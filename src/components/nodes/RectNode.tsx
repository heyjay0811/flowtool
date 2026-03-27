/**
 * 커스텀 노드: 사각형 (Rect)
 * 용도: 일반 프로세스/단계를 나타내는 기본 노드
 * Mermaid 변환 시 → [텍스트]
 */
"use client";

import { memo, useState, useRef, useCallback } from "react";
import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";
import styles from "./nodes.module.css";

function RectNode({ id, data, selected }: NodeProps) {
  /* 인라인 편집 상태 */
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { updateNodeData } = useReactFlow();

  /* 더블클릭 → 편집 모드 진입 */
  const startEdit = useCallback(() => {
    setDraft((data.label as string) ?? "");
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 10);
  }, [data.label]);

  /* 편집 완료 (blur 또는 Enter) */
  const finishEdit = useCallback(() => {
    if (draft.trim()) updateNodeData(id, { label: draft.trim() });
    setEditing(false);
  }, [draft, id, updateNodeData]);

  /* 색상 클래스 (data.color로 지정) */
  const colorClass = (data.color as string) ?? "blue";

  return (
    <div
      className={`${styles.node} ${styles.rect} ${styles[`color_${colorClass}`]} ${selected ? styles.selected : ""}`}
      onDoubleClick={startEdit}
    >
      {/* 상단 연결 핸들 */}
      <Handle type="target" position={Position.Top}    className={styles.handle} />
      <Handle type="target" position={Position.Left}   className={styles.handle} />

      {/* 노드 내용 */}
      {editing ? (
        <textarea
          ref={inputRef}
          className={styles.editInput}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={finishEdit}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); finishEdit(); } }}
          rows={2}
        />
      ) : (
        <span className={styles.label}>{(data.label as string) || "프로세스"}</span>
      )}

      {/* 하단 연결 핸들 */}
      <Handle type="source" position={Position.Bottom} className={styles.handle} />
      <Handle type="source" position={Position.Right}  className={styles.handle} />
    </div>
  );
}

export default memo(RectNode);
