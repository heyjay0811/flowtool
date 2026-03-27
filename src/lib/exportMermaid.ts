/**
 * exportMermaid.ts — React Flow 노드/엣지 → Mermaid 문법 변환
 *
 * 노드 타입별 Mermaid 표기:
 *   rect   → [텍스트]    (사각형 - 일반 프로세스)
 *   diamond → {텍스트}  (마름모 - 조건 분기)
 *   circle → ([텍스트]) (원 - 시작/종료)
 *   sticker → [텍스트]  (메모 스티커 - 사각형 처리)
 */

import { type Node, type Edge } from "@xyflow/react";

/**
 * 노드 배열을 순번 기반 짧은 Mermaid ID로 매핑합니다.
 * UUID 그대로 쓰면 가독성이 나쁘므로 N1, N2, N3... 형식 사용.
 */
function buildIdMap(nodes: Node[]): Record<string, string> {
  const map: Record<string, string> = {};
  nodes.forEach((n, i) => { map[n.id] = `N${i + 1}`; });
  return map;
}

/**
 * 노드 타입에 따라 Mermaid 노드 표기 생성
 * @param id   Mermaid 식별자 (N1, N2 ...)
 * @param label 노드 텍스트
 * @param type  노드 타입 (rect | diamond | circle | sticker)
 */
function mermaidNode(id: string, label: string, type?: string): string {
  /* 큰따옴표 → 작은따옴표 (Mermaid 파싱 오류 방지) */
  const safeLabel = label.replace(/"/g, "'");
  switch (type) {
    case "diamond": return `${id}{"${safeLabel}"}`;   /* 마름모 */
    case "circle":  return `${id}(["${safeLabel}"])`;  /* 원      */
    default:        return `${id}["${safeLabel}"]`;    /* 사각형  */
  }
}

/**
 * React Flow 노드/엣지 배열을 Mermaid flowchart 문자열로 변환합니다.
 * @param nodes React Flow 노드 배열
 * @param edges React Flow 엣지 배열
 * @returns Mermaid 문법 문자열
 */
export function exportToMermaid(nodes: Node[], edges: Edge[]): string {
  if (nodes.length === 0) return "flowchart TD\n  %% 노드가 없습니다";

  /* UUID → N1, N2, N3 ... 매핑 */
  const idMap = buildIdMap(nodes);
  const lines: string[] = ["flowchart TD"];

  /* ── 노드 정의 ──────────────────────────────────────────────── */
  for (const node of nodes) {
    const id    = idMap[node.id];
    const label = (node.data?.label as string) || "노드";
    const type  = node.type;
    lines.push(`  ${mermaidNode(id, label, type)}`);
  }

  /* ── 엣지(연결선) 정의 ──────────────────────────────────────── */
  for (const edge of edges) {
    const src = idMap[edge.source] ?? edge.source;
    const dst = idMap[edge.target] ?? edge.target;
    if (edge.label) {
      lines.push(`  ${src} -->|"${edge.label}"| ${dst}`);
    } else {
      lines.push(`  ${src} --> ${dst}`);
    }
  }

  return lines.join("\n");
}
