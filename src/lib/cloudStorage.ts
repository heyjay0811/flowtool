/**
 * cloudStorage.ts — Supabase 기반 프로젝트·카테고리·흐름도 클라우드 저장
 *
 * 로그인 상태:  Supabase DB에 직접 저장 (모든 기기 동기화)
 * 비로그인 상태: storage.ts의 LocalStorage 폴백 사용
 *
 * 테이블 구조:
 *   projects   — 최상위 프로젝트
 *   categories — 프로젝트 하위 카테고리
 *   flowcharts — 개별 흐름도 문서
 */

import { supabase } from "./supabase";
import type { Node, Edge } from "@xyflow/react";
import type { ProjectData, CategoryData, FlowData } from "./storage";

// ── 인증 헬퍼 ─────────────────────────────────────────────────────────────────

/** 현재 로그인된 사용자 ID. 비로그인이면 null. */
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ── Google 로그인 / 로그아웃 ──────────────────────────────────────────────────

export async function signInWithGoogle(): Promise<void> {
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: typeof window !== "undefined" ? window.location.origin : "/" },
  });
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

// ── 프로젝트 CRUD ─────────────────────────────────────────────────────────────

/** 현재 사용자의 프로젝트 목록을 조회합니다. */
export async function fetchProjects(): Promise<ProjectData[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, sort_order, created_at")
    .order("sort_order", { ascending: true });
  if (error) { console.error("[FlowTool] 프로젝트 조회 실패:", error.message); return []; }
  return (data ?? []).map(r => ({
    id: r.id,
    name: r.name,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
  }));
}

/** 프로젝트를 Supabase에 저장합니다. */
export async function upsertProject(p: ProjectData): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;
  const { error } = await supabase.from("projects").upsert(
    { id: p.id, user_id: userId, name: p.name, sort_order: p.sortOrder },
    { onConflict: "id" }
  );
  if (error) { console.error("[FlowTool] 프로젝트 저장 실패:", error.message); return false; }
  return true;
}

/** 프로젝트를 삭제합니다. (CASCADE로 category, flowchart 함께 삭제) */
export async function deleteProjectFromCloud(id: string): Promise<boolean> {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) { console.error("[FlowTool] 프로젝트 삭제 실패:", error.message); return false; }
  return true;
}

// ── 카테고리 CRUD ─────────────────────────────────────────────────────────────

/** 특정 프로젝트의 카테고리 목록을 조회합니다. */
export async function fetchCategories(projectId: string): Promise<CategoryData[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, project_id, name, sort_order, created_at")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });
  if (error) { console.error("[FlowTool] 카테고리 조회 실패:", error.message); return []; }
  return (data ?? []).map(r => ({
    id: r.id,
    projectId: r.project_id,
    name: r.name,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
  }));
}

/** 카테고리를 Supabase에 저장합니다. */
export async function upsertCategory(c: CategoryData): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;
  const { error } = await supabase.from("categories").upsert(
    { id: c.id, user_id: userId, project_id: c.projectId, name: c.name, sort_order: c.sortOrder },
    { onConflict: "id" }
  );
  if (error) { console.error("[FlowTool] 카테고리 저장 실패:", error.message); return false; }
  return true;
}

/** 카테고리를 삭제합니다. */
export async function deleteCategoryFromCloud(id: string): Promise<boolean> {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) { console.error("[FlowTool] 카테고리 삭제 실패:", error.message); return false; }
  return true;
}

// ── 흐름도 CRUD ───────────────────────────────────────────────────────────────

/** 현재 사용자의 흐름도 목록을 조회합니다. */
export async function fetchFlowcharts(): Promise<FlowData[]> {
  const { data, error } = await supabase
    .from("flowcharts")
    .select("id, title, nodes, edges, project_id, category_id, updated_at")
    .order("updated_at", { ascending: false });
  if (error) { console.error("[FlowTool] 흐름도 목록 조회 실패:", error.message); return []; }
  return (data ?? []).map(r => ({
    id: r.id,
    title: r.title,
    nodes: (r.nodes ?? []) as Node[],
    edges: (r.edges ?? []) as Edge[],
    projectId: r.project_id ?? undefined,
    categoryId: r.category_id ?? undefined,
    updatedAt: r.updated_at,
  }));
}

/** 흐름도를 Supabase에 저장합니다. */
export async function saveFlowToCloud(flow: {
  id: string; title: string; nodes: Node[]; edges: Edge[];
  projectId?: string; categoryId?: string;
}): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;
  const { error } = await supabase.from("flowcharts").upsert(
    {
      id: flow.id,
      user_id: userId,
      title: flow.title,
      nodes: flow.nodes,
      edges: flow.edges,
      project_id: flow.projectId ?? null,
      category_id: flow.categoryId ?? null,
    },
    { onConflict: "id" }
  );
  if (error) { console.error("[FlowTool] 흐름도 클라우드 저장 실패:", error.message); return false; }
  return true;
}

/** 흐름도를 Supabase에서 삭제합니다. */
export async function deleteFlowFromCloud(id: string): Promise<boolean> {
  const { error } = await supabase.from("flowcharts").delete().eq("id", id);
  if (error) { console.error("[FlowTool] 흐름도 삭제 실패:", error.message); return false; }
  return true;
}
