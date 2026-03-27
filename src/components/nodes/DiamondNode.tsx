/**
 * 커스텀 노드: 마름모 (Diamond)
 * 용도: 조건 분기 (Yes/No, 참/거짓)
 * Mermaid 변환 시 → {텍스트}
 */
"use client";

import { memo, useState, useRef, useCallback } from "react";
import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";
import styles from "./nodes.module.css";

function DiamondNode({ id, data, selected }: NodeProps) {
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

  const colorClass = (data.color as string) ?? "orange";

  return (
    /* 마름모는 외부 div를 rotate(45deg), 내부를 -rotate(45deg)로 처리 */
    <div
      className={`${styles.diamondOuter} ${styles[`color_${colorClass}`]} ${selected ? styles.selected : ""}`}
      onDoubleClick={startEdit}
    >
      {/* 위 꼭짓점: 입력 (clip-path 방식 → Position.Top = 시각적 위 꼭짓점) */}
      <Handle id="top"   type="target" position={Position.Top}   className={styles.handle} />

      {/* 내부 텍스트 */}
      <div className={styles.diamondInner}>
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
          <span className={styles.label}>{(data.label as string) || "조건?"}</span>
        )}
      </div>

      {/* 왼쪽 꼭짓점: 출력 Yes (Position.Left = 시각적 왼 꼭짓점) */}
      <Handle id="left"  type="source" position={Position.Left}  className={styles.handle} />
      {/* 오른쪽 꼭짓점: 출력 No  (Position.Right = 시각적 오른 꼭짓점) */}
      <Handle id="right" type="source" position={Position.Right} className={styles.handle} />
    </div>
  );
}

export default memo(DiamondNode);
