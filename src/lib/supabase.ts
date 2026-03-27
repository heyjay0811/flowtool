/**
 * supabase.ts — FlowTool 전용 Supabase 브라우저 클라이언트
 *
 * 브라우저(클라이언트) 환경에서만 사용합니다.
 * 서버 컴포넌트에는 별도 admin 클라이언트가 필요하지만
 * FlowTool은 클라이언트 사이드 앱이므로 이 파일 하나로 충분합니다.
 */

import { createClient } from "@supabase/supabase-js";

/** Supabase 프로젝트 URL (환경변수에서 가져옴) */
const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
/** 공개 anon 키 (RLS 정책으로 보호됨) */
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Supabase 클라이언트 싱글턴
 * - auth.persistSession: true → 브라우저 새로고침 후에도 로그인 유지
 */
export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    persistSession: true,              // 세션을 localStorage에 저장
    autoRefreshToken: true,            // 만료 전 자동 갱신
    detectSessionInUrl: true,          // OAuth 콜백 URL에서 세션 감지
  },
});
