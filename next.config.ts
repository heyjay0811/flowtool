import type { NextConfig } from "next";

const isStaticExport = process.env.NEXT_STATIC_EXPORT === "true";

const nextConfig: NextConfig = {
  /* Electron 정적 빌드: file:// 프로토콜 호환 */
  output: isStaticExport ? "export" : undefined,

  /* 정적 빌드 시 상대경로 사용 (file:// 환경에서 절대경로 /_ 문제 해결) */
  assetPrefix: isStaticExport ? "./" : undefined,

  /* 정적 빌드 시 디렉터리별 index.html 생성 */
  trailingSlash: isStaticExport ? true : undefined,

  /* 이미지 최적화 비활성화 (서버 불필요) */
  images: { unoptimized: true },
};

export default nextConfig;
