/**
 * storage.ts — 흐름도 저장/불러오기 유틸리티
 *
 * 저장 방식:
 *   1. LocalStorage — 자동 저장 (오프라인/빠른 접근)
 *   2. JSON 파일 다운로드 — 수동 내보내기
 *   3. JSON 파일 업로드 — 수동 불러오기
 */

import { type Node, type Edge } from "@xyflow/react";

/** 저장되는 흐름도 데이터 구조 */
export interface FlowData {
  id: string;           // 흐름도 고유 ID
  title: string;        // 흐름도 제목
  nodes: Node[];        // 노드 배열
  edges: Edge[];        // 엣지 배열
  updatedAt: string;    // 마지막 수정 시각 (ISO 문자열)
}

/** LocalStorage 키 */
const STORAGE_KEY = "flowtool_flows";
const ACTIVE_KEY = "flowtool_active";

// ── LocalStorage ────────────────────────────────────────────────────

/**
 * 전체 흐름도 목록을 LocalStorage에서 불러옵니다.
 */
export function loadAllFlows(): FlowData[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FlowData[]) : [];
  } catch {
    return [];
  }
}

/**
 * 단일 흐름도를 LocalStorage에 저장합니다.
 * 같은 ID가 있으면 업데이트, 없으면 추가합니다.
 */
export function saveFlow(flow: FlowData): void {
  const all = loadAllFlows();
  const idx = all.findIndex((f) => f.id === flow.id);
  const updated = { ...flow, updatedAt: new Date().toISOString() };
  if (idx >= 0) {
    all[idx] = updated;
  } else {
    all.push(updated);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

/**
 * 현재 활성 흐름도 ID를 저장합니다.
 */
export function setActiveFlowId(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id);
}

/**
 * 현재 활성 흐름도 ID를 불러옵니다.
 */
export function getActiveFlowId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_KEY);
}

/**
 * 흐름도를 삭제합니다.
 */
export function deleteFlow(id: string): void {
  const all = loadAllFlows().filter((f) => f.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

// ── 파일 내보내기/가져오기 ─────────────────────────────────────────

/**
 * 흐름도를 JSON 파일로 다운로드합니다.
 */
export function downloadFlowAsJson(flow: FlowData): void {
  const blob = new Blob([JSON.stringify(flow, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${flow.title || "flowchart"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * JSON 파일을 업로드하여 흐름도를 가져옵니다.
 * @returns 파싱된 FlowData 또는 null (실패 시)
 */
export function uploadFlowFromJson(): Promise<FlowData | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) { resolve(null); return; }
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string) as FlowData;
          resolve(data);
        } catch {
          alert("올바른 JSON 파일이 아닙니다.");
          resolve(null);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}

/**
 * 새 흐름도 데이터를 생성합니다.
 */
export function createNewFlow(title = "새 흐름도"): FlowData {
  return {
    id: crypto.randomUUID(),
    title,
    nodes: [],
    edges: [],
    updatedAt: new Date().toISOString(),
  };
}
