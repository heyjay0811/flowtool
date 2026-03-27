/**
 * storage.ts — 흐름도·프로젝트·카테고리 로컬 저장 유틸리티 (LocalStorage)
 *
 * 로그인 전(오프라인)에는 LocalStorage에 저장하고,
 * 로그인 후에는 cloudStorage.ts의 Supabase 함수가 이를 대체합니다.
 *
 * 데이터 계층:
 *   프로젝트 (ProjectData)
 *     └── 카테고리 (CategoryData)
 *           └── 흐름도 (FlowData)
 */

import { type Node, type Edge } from "@xyflow/react";

// ── 타입 정의 ─────────────────────────────────────────────────────────────────

/** 최상위 분류 단위 (예: S36524, FlowTool) */
export interface ProjectData {
  id: string;
  name: string;        // 프로젝트 이름
  sortOrder: number;   // 사이드바 정렬 순서
  createdAt: string;
}

/** 프로젝트 내 소분류 (예: 영업, 영업신청) */
export interface CategoryData {
  id: string;
  projectId: string;   // 소속 프로젝트 ID
  name: string;
  sortOrder: number;
  createdAt: string;
}

/** 개별 흐름도 문서 */
export interface FlowData {
  id: string;
  title: string;
  nodes: Node[];
  edges: Edge[];
  updatedAt: string;
  projectId?: string;   // 소속 프로젝트 (없으면 미분류)
  categoryId?: string;  // 소속 카테고리 (없으면 미분류)
}

// ── LocalStorage 키 ───────────────────────────────────────────────────────────
const KEY_FLOWS      = "flowtool_flows";
const KEY_ACTIVE     = "flowtool_active";
const KEY_PROJECTS   = "flowtool_projects";
const KEY_CATEGORIES = "flowtool_categories";

// ── 공통 헬퍼 ─────────────────────────────────────────────────────────────────

function loadJson<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch { return []; }
}

function saveJson<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// ── 프로젝트 CRUD ─────────────────────────────────────────────────────────────

export function loadAllProjects(): ProjectData[] {
  return loadJson<ProjectData>(KEY_PROJECTS);
}

export function saveProject(p: ProjectData): void {
  const all = loadAllProjects();
  const idx = all.findIndex(x => x.id === p.id);
  if (idx >= 0) all[idx] = p; else all.push(p);
  saveJson(KEY_PROJECTS, all);
}

export function deleteProject(id: string): void {
  saveJson(KEY_PROJECTS, loadAllProjects().filter(p => p.id !== id));
  // 하위 카테고리 + 흐름도도 함께 삭제
  saveJson(KEY_CATEGORIES, loadAllCategories().filter(c => c.projectId !== id));
  saveJson(KEY_FLOWS, loadAllFlows().filter(f => f.projectId !== id));
}

export function createNewProject(name: string): ProjectData {
  const all = loadAllProjects();
  return {
    id: crypto.randomUUID(),
    name,
    sortOrder: all.length,
    createdAt: new Date().toISOString(),
  };
}

// ── 카테고리 CRUD ─────────────────────────────────────────────────────────────

export function loadAllCategories(): CategoryData[] {
  return loadJson<CategoryData>(KEY_CATEGORIES);
}

export function saveCategory(c: CategoryData): void {
  const all = loadAllCategories();
  const idx = all.findIndex(x => x.id === c.id);
  if (idx >= 0) all[idx] = c; else all.push(c);
  saveJson(KEY_CATEGORIES, all);
}

export function deleteCategory(id: string): void {
  saveJson(KEY_CATEGORIES, loadAllCategories().filter(c => c.id !== id));
  // 하위 흐름도의 categoryId를 null로 초기화
  const flows = loadAllFlows().map(f =>
    f.categoryId === id ? { ...f, categoryId: undefined } : f
  );
  saveJson(KEY_FLOWS, flows);
}

export function createNewCategory(projectId: string, name: string): CategoryData {
  const all = loadAllCategories().filter(c => c.projectId === projectId);
  return {
    id: crypto.randomUUID(),
    projectId,
    name,
    sortOrder: all.length,
    createdAt: new Date().toISOString(),
  };
}

// ── 흐름도 CRUD ───────────────────────────────────────────────────────────────

export function loadAllFlows(): FlowData[] {
  return loadJson<FlowData>(KEY_FLOWS);
}

export function saveFlow(flow: FlowData): void {
  const all = loadAllFlows();
  const idx = all.findIndex(f => f.id === flow.id);
  const updated = { ...flow, updatedAt: new Date().toISOString() };
  if (idx >= 0) all[idx] = updated; else all.push(updated);
  saveJson(KEY_FLOWS, all);
}

export function deleteFlow(id: string): void {
  saveJson(KEY_FLOWS, loadAllFlows().filter(f => f.id !== id));
}

export function createNewFlow(
  title = "새 흐름도",
  projectId?: string,
  categoryId?: string,
): FlowData {
  return {
    id: crypto.randomUUID(),
    title,
    nodes: [],
    edges: [],
    updatedAt: new Date().toISOString(),
    projectId,
    categoryId,
  };
}

// ── 활성 흐름도 ID ────────────────────────────────────────────────────────────

export function setActiveFlowId(id: string): void {
  localStorage.setItem(KEY_ACTIVE, id);
}

export function getActiveFlowId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY_ACTIVE);
}

// ── 파일 내보내기/가져오기 ────────────────────────────────────────────────────

export function downloadFlowAsJson(flow: FlowData): void {
  const blob = new Blob([JSON.stringify(flow, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${flow.title || "flowchart"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function uploadFlowFromJson(): Promise<FlowData | null> {
  return new Promise(resolve => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) { resolve(null); return; }
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          resolve(JSON.parse(ev.target?.result as string) as FlowData);
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
