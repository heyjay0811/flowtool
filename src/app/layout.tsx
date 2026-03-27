import type { Metadata, Viewport } from "next";
import "./globals.css";

/* ── SEO 메타 정보 ─────────────────────────────────────────────── */
export const metadata: Metadata = {
  title: "FlowTool — 논리 흐름도 작성 도구",
  description: "AI와 함께 사용하는 개인 특화 흐름도 앱. 위자드/AI변환/캔버스 세 가지 모드 지원.",
  manifest: "/manifest.json",
  /* PWA iOS 설정 */
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FlowTool",
  },
};

/* ── PWA 테마 색상 ─────────────────────────────────────────────── */
export const viewport: Viewport = {
  themeColor: "#5b6af0",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

/**
 * 루트 레이아웃
 * - globals.css 전역 적용
 * - PWA 메타 태그 포함 (manifest, apple-touch-icon 등)
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        {/* PWA 아이콘 (iOS Safari 홈화면 추가용) */}
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        {/* 상태바 색상 (안드로이드 Chrome) */}
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
