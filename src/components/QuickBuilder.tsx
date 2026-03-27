/**
 * QuickBuilder.tsx — 키보드 드리븐 흐름도 빠른 입력 모드
 *
 * 키 조작:
 *   Enter         : 현재 대기 타입으로 노드 추가 + 자동 연결
 *   Space (빈 칸) : 대기 타입 순환 (단계 → 분기 → 시작/종료 → 단계)
 *   Tab           : 분기 모드에서 Yes ↔ No 전환
 *   Backspace (빈): 마지막 노드 삭제 후 커서 이전으로
 *   Escape        : 빠른입력 초기화 (커서만 리셋)
 */
"use client";

import { useState, useRef, useCallback, KeyboardEvent } from "react";
import { type Node, type Edge } from "@xyflow/react";
import styles from "./Panel.module.css";

/* ── 타입 정의 ─────────────────────────────────────────────────────── */

/** 생성 가능한 노드 타입 (sticker 제외 — 키보드 흐름에서 불필요) */
type QNodeType = "circle" | "rect" | "diamond";

/** 분기 방향 */
type BranchSide = "yes" | "no";

/* ── 상수 ───────────────────────────────────────────────────────────── */

const TYPE_SEQ: QNodeType[] = ["rect", "diamond", "circle"];

const TYPE_META: Record<QNodeType, { icon: string; label: string; color: string }> = {
  circle:  { icon: "●", label: "시작/종료", color: "teal" },
  rect:    { icon: "■", label: "단계",      color: "blue" },
  diamond: { icon: "◆", label: "분기",      color: "orange" },
};

/* ── Props ──────────────────────────────────────────────────────────── */

export interface QuickBuilderProps {
  /** 현재 캔버스의 모든 노드 (위치 계산용) */
  nodes: Node[];
  /** 노드 + 엣지를 한번에 추가하는 핸들러 */
  onAddNodes: (newNodes: Node[], newEdges: Edge[]) => void;
  /** 마지막 노드를 삭제하는 핸들러 (Backspace 되돌리기) */
  onDeleteNode: (id: string) => void;
}

/* ── 컴포넌트 ───────────────────────────────────────────────────────── */

export default function QuickBuilder({ nodes, onAddNodes, onDeleteNode }: QuickBuilderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  /* 커서: 마지막으로 추가된 노드 ID (null = 아직 없음) */
  const [cursorId, setCursorId] = useState<string | null>(null);

  /* 다음 Enter 시 생성될 노드 타입 */
  const [pendingType, setPendingType] = useState<QNodeType>("circle");

  /* 분기(diamond) 생성 후 어느 출구에 연결 중인지 */
  const [branchSide, setBranchSide] = useState<BranchSide | null>(null);

  /* 되돌리기용 스택 (cursorId 히스토리) */
  const [history, setHistory] = useState<string[]>([]);

  /* ── 위치 계산 ─────────────────────────────────────────────────── */
  const calcPosition = useCallback(
    (fromId: string | null, side: BranchSide | null): { x: number; y: number } => {
      if (!fromId) return { x: 300, y: 100 }; // 첫 노드
      const from = nodes.find(n => n.id === fromId);
      if (!from) return { x: 300, y: 100 };
      const base = { x: from.position.x, y: from.position.y + 140 };
      /* 분기 방향: Yes=오른쪽, No=왼쪽 */
      if (side === "yes") return { x: base.x + 220, y: base.y };
      if (side === "no")  return { x: base.x - 220, y: base.y };
      return base;
    },
    [nodes]
  );

  /* ── 키 핸들러 ─────────────────────────────────────────────────── */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      const raw = inputRef.current?.value ?? "";
      const value = raw.trim();

      /* ── Space (빈 입력) → 타입 순환 ──────────────────────────── */
      if (e.key === " " && !value) {
        e.preventDefault();
        setPendingType(prev => {
          const idx = TYPE_SEQ.indexOf(prev);
          return TYPE_SEQ[(idx + 1) % TYPE_SEQ.length];
        });
        return;
      }

      /* ── Tab → Yes ↔ No 전환 (분기 모드에서만) ─────────────────── */
      if (e.key === "Tab") {
        e.preventDefault();
        if (branchSide !== null) {
          setBranchSide(prev => (prev === "yes" ? "no" : "yes"));
        }
        return;
      }

      /* ── Backspace (빈 입력) → 되돌리기 ───────────────────────── */
      if (e.key === "Backspace" && !value) {
        e.preventDefault();
        if (cursorId) {
          onDeleteNode(cursorId); // 마지막 노드 삭제
          setHistory(prev => {
            const next = [...prev];
            const restored = next.pop() ?? null;
            setCursorId(restored);
            /* 분기 모드였으면 초기화 */
            setBranchSide(null);
            return next;
          });
        }
        return;
      }

      /* ── Escape → 커서만 초기화 ────────────────────────────────── */
      if (e.key === "Escape") {
        setCursorId(null);
        setHistory([]);
        setBranchSide(null);
        setPendingType("circle");
        if (inputRef.current) inputRef.current.value = "";
        return;
      }

      /* ── Enter + 텍스트 → 노드 추가 ───────────────────────────── */
      if (e.key === "Enter" && value) {
        e.preventDefault();
        const newId = crypto.randomUUID();
        const position = calcPosition(cursorId, branchSide);

        const newNode: Node = {
          id: newId,
          type: pendingType,
          position,
          data: { label: value, color: TYPE_META[pendingType].color },
        };

        /* 이전 노드와 연결 */
        const newEdges: Edge[] = cursorId
          ? [{
              id: `e-${cursorId}-${newId}`,
              source: cursorId,
              target: newId,
              animated: false,
              label: branchSide === "yes" ? "Yes" : branchSide === "no" ? "No" : "",
            }]
          : [];

        onAddNodes([newNode], newEdges);

        /* 히스토리 쌓기 */
        setHistory(prev => (cursorId ? [...prev, cursorId] : prev));
        setCursorId(newId);

        /* 분기 타입이면 다음은 Yes 경로 대기 상태로 진입 */
        if (pendingType === "diamond") {
          setBranchSide("yes");
          setPendingType("rect"); // 분기 다음엔 단계
        } else {
          /* 분기 한 방향 완성 → 아직 branchSide가 있으면 반대쪽 대기 */
          setBranchSide(null);
          setPendingType("rect");
        }

        /* 입력창 초기화 */
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
    },
    [cursorId, branchSide, pendingType, calcPosition, onAddNodes, onDeleteNode]
  );

  /* ── 현재 상태 설명 텍스트 ─────────────────────────────────────── */
  const cursorNode = nodes.find(n => n.id === cursorId);
  const statusText = !cursorId
    ? "⌨ 첫 노드를 입력하고 Enter"
    : branchSide === "yes"
      ? `◆ "${cursorNode?.data.label}" → Yes 경로  (Tab: No)`
      : branchSide === "no"
        ? `◆ "${cursorNode?.data.label}" → No 경로  (Tab: Yes)`
        : `↓ "${cursorNode?.data.label}" 다음`;

  /* 다음 타입 미리보기 (Space 전환 후) */
  const nextType = TYPE_SEQ[(TYPE_SEQ.indexOf(pendingType) + 1) % TYPE_SEQ.length];

  return (
    <div className={styles.qb}>

      {/* 현재 위치 상태 표시 */}
      <div className={styles.qbStatus}>{statusText}</div>

      {/* 입력 행: 타입 아이콘 + 텍스트 입력 */}
      <div className={styles.qbRow}>
        <span
          className={styles.qbIcon}
          style={{ color: TYPE_META[pendingType].color === "teal" ? "#14b8a6"
            : TYPE_META[pendingType].color === "orange" ? "#f97316"
            : "#3b82f6" }}
        >
          {TYPE_META[pendingType].icon}
        </span>
        <input
          ref={inputRef}
          className={styles.qbInput}
          placeholder={`${TYPE_META[pendingType].label} 이름 입력...`}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      </div>

      {/* 단축키 가이드 — 세로 표 형식 */}
      <div className={styles.qbGuide}>
        <div className={styles.qbGuideTitle}>키 조작</div>
        <div className={styles.qbGuideRow}>
          <kbd>Enter</kbd><span>노드 추가 (텍스트 입력 후)</span>
        </div>
        <div className={styles.qbGuideRow}>
          <kbd>Space</kbd><span>타입 전환 ■→◆→● (빈칸에서)</span>
        </div>
        <div className={styles.qbGuideRow}>
          <kbd>Tab</kbd><span>Yes ↔ No 전환 (분기 후)</span>
        </div>
        <div className={styles.qbGuideRow}>
          <kbd>⌫</kbd><span>마지막 노드 삭제 (빈칸에서)</span>
        </div>
        <div className={styles.qbGuideRow}>
          <kbd>Esc</kbd><span>커서 초기화 (처음부터)</span>
        </div>
      </div>
    </div>
  );
}
