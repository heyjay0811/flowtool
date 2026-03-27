/**
 * AuthBar.tsx — 로그인 상태 표시 및 Google 로그인/로그아웃 버튼
 *
 * 위치: 사이드바 하단에 고정
 * - 비로그인: "Google로 로그인" 버튼 → Supabase OAuth
 * - 로그인됨: 프로필 이미지 + 이름 + 로그아웃 버튼
 * - 로그인 시 흐름도가 클라우드에 자동 동기화됨을 안내
 */
"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { signInWithGoogle, signOut } from "@/lib/cloudStorage";
import styles from "./AuthBar.module.css";

export default function AuthBar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /* ── 세션 상태 감지 ──────────────────────────────────────────── */
  useEffect(() => {
    /* 2초 타임아웃: Supabase 응답 없으면 비로그인으로 처리 */
    const timeout = setTimeout(() => setLoading(false), 2000);

    supabase.auth.getUser().then(({ data }) => {
      clearTimeout(timeout);
      setUser(data.user);
      setLoading(false);
    }).catch(() => {
      clearTimeout(timeout);
      setLoading(false);
    });

    /* 로그인/로그아웃 변경 이벤트 구독 */
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => { clearTimeout(timeout); subscription.unsubscribe(); };
  }, []);

  if (loading) return null;

  /* ── 비로그인 상태 ────────────────────────────────────────────── */
  if (!user) {
    return (
      <div className={styles.bar}>
        <p className={styles.hint}>로그인하면 모든 기기에서<br/>흐름도가 동기화됩니다</p>
        <button className={styles.loginBtn} onClick={signInWithGoogle}>
          <span className={styles.googleIcon}>G</span>
          Google로 로그인
        </button>
      </div>
    );
  }

  /* ── 로그인 상태 ──────────────────────────────────────────────── */
  const name  = user.user_metadata?.full_name ?? user.email ?? "사용자";
  const photo = user.user_metadata?.avatar_url;

  return (
    <div className={styles.bar}>
      <div className={styles.profile}>
        {photo
          ? <img src={photo} alt={name} className={styles.avatar} />
          : <div className={styles.avatarFallback}>{name[0]}</div>
        }
        <span className={styles.name}>{name}</span>
        <span className={styles.syncBadge}>☁ 동기화</span>
      </div>
      <button className={styles.logoutBtn} onClick={signOut}>로그아웃</button>
    </div>
  );
}
