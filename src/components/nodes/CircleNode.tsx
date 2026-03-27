/**
 * 커스텀 노드: 원 (Circle)
 * 용도: 시작점 또는 종료점
 * Mermaid 변환 시 → ([텍스트])
 */
"use client";

import { memo, useState, useRef, useCallback } from "react";
import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";
import styles from "./nodes.module.css";

function CircleNode({ id, data, selected }: NodeProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { updateNodeData } = useReactFlow();

  const startEdit = useCallback(() => {
    setDraft((data.label as string) ?? "");
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 10);
  }, [data.label]);

  const finishEdit = useCallback(() => {
    if (draft.trim()) updateNodeData(id, { label: draft.trim() });
    setEditing(false);
  }, [draft, id, updateNodeData]);

  const colorClass = (data.color as string) ?? "teal";

  return (
    <div
      className={`${styles.node} ${styles.circle} ${styles[`color_${colorClass}`]} ${selected ? styles.selected : ""}`}
      onDoubleClick={startEdit}
    >
      <Handle type="target" position={Position.Top}    className={styles.handle} />
      <Handle type="target" position={Position.Left}   className={styles.handle} />

      {editing ? (
        <input
          ref={inputRef}
          className={styles.editInputSingle}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={finishEdit}
          onKeyDown={e => { if (e.key === "Enter") finishEdit(); }}
        />
      ) : (
        <span className={styles.label}>{(data.label as string) || "시작"}</span>
      )}

      <Handle type="source" position={Position.Bottom} className={styles.handle} />
      <Handle type="source" position={Position.Right}  className={styles.handle} />
    </div>
  );
}

export default memo(CircleNode);
