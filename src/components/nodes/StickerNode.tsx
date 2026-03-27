/**
 * 커스텀 노드: 메모 스티커 (Sticker)
 * 용도: 자유 텍스트 주석. 연결선 없이 독립적으로 사용 가능.
 * Mermaid 변환 시 → [텍스트] (주석 처리)
 */
"use client";

import { memo, useState, useRef, useCallback } from "react";
import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";
import styles from "./nodes.module.css";

function StickerNode({ id, data, selected }: NodeProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { updateNodeData } = useReactFlow();

  const startEdit = useCallback(() => {
    setDraft((data.label as string) ?? "");
    setEditing(true);
    setTimeout(() => textareaRef.current?.select(), 10);
  }, [data.label]);

  const finishEdit = useCallback(() => {
    updateNodeData(id, { label: draft });
    setEditing(false);
  }, [draft, id, updateNodeData]);

  return (
    <div
      className={`${styles.sticker} ${selected ? styles.selected : ""}`}
      onDoubleClick={startEdit}
    >
      {/* 스티커는 연결 핸들도 지원 (선택적 연결) */}
      <Handle type="target" position={Position.Top}    className={styles.handle} />
      <Handle type="source" position={Position.Bottom} className={styles.handle} />

      {editing ? (
        <textarea
          ref={textareaRef}
          className={styles.editInput}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={finishEdit}
          onKeyDown={e => { if (e.key === "Escape") finishEdit(); }}
          rows={4}
          placeholder="메모를 입력하세요..."
        />
      ) : (
        <p className={styles.stickerText}>
          {(data.label as string) || "메모를 입력하려면 더블클릭..."}
        </p>
      )}
    </div>
  );
}

export default memo(StickerNode);
