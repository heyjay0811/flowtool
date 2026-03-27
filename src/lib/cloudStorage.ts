/**
 * cloudStorage.ts — Supabase 기반 흐름도 클라우드 저장/불러오기
 *
 * 로그인 상태:  Supabase flows 테이블에 저장 (모든 기기 동기화)
 * 비로그인 상태: LocalStorage 폴백 (기존 storage.ts 사용)
 */

import { supabase } from "./supabase";
import type { Node, Edge } from "@xyflow/react";

/** DB에 저장되는 흐름도 행 타입 */
export interface FlowRow {
  id: string;
  user_id: string;
  title: string;
  nodes: Node[];
  edges: Edge[];
  updated_at: string;
  created_at: string;
}

// ── 인증 헬퍼 ───────────────────────────────────────────────────────

/**
 * 현재 로그인된 사용자 ID를 반환합니다.
 * 비로그인이면 null 반환.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ── 흐름도 목록 조회 ──────────────────────────────────────────────

/**
 * 현재 사용자의 모든 흐름도를 최신순으로 조회합니다.
 */
export async function fetchFlows(): Promise<FlowRow[]> {
  const { data, error } = await supabase
    .from("flows")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("[FlowTool] 흐름도 목록 조회 실패:", error.message);
    return [];
  }
  return (data ?? []) as FlowRow[];
}

// ── 흐름도 저장 (upsert) ──────────────────────────────────────────

/**
 * 흐름도를 Supabase에 저장합니다.
 * 같은 id가 있으면 update, 없으면 insert.
 * @returns 저장된 행 또는 null (실패 시)
 */
export async function saveFlowToCloud(params: {
  id: string;
  title: string;
  nodes: Node[];
  edges: Edge[];
}): Promise<FlowRow | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null; // 비로그인 시 클라우드 저장 불가

  const { data, error } = await supabase
    .from("flows")
    .upsert(
      {
        id:       params.id,
        user_id:  userId,
        title:    params.title,
        nodes:    params.nodes,
        edges:    params.edges,
      },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (error) {
    console.error("[FlowTool] 클라우드 저장 실패:", error.message);
    return null;
  }
  return data as FlowRow;
}

// ── 흐름도 삭제 ───────────────────────────────────────────────────

/**
 * 흐름도를 Supabase에서 삭제합니다.
 */
export async function deleteFlowFromCloud(id: string): Promise<boolean> {
  const { error } = await supabase.from("flows").delete().eq("id", id);
  if (error) {
    console.error("[FlowTool] 클라우드 삭제 실패:", error.message);
    return false;
  }
  return true;
}

// ── Google 로그인 / 로그아웃 ──────────────────────────────────────

/**
 * Google OAuth 로그인을 시작합니다.
 * 로그인 완료 후 현재 페이지로 리다이렉트됩니다.
 */
export async function signInWithGoogle(): Promise<void> {
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: typeof window !== "undefined" ? window.location.origin : "/",
    },
  });
}

/**
 * 로그아웃합니다.
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
