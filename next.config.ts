import type { NextConfig } from "next";

/**
 * Two ways to ship this site:
 *  - Vercel (default): a normal Next.js server build with the admin panel (/admin),
 *    Supabase for content, the ContentSathi receiver, and image optimisation.
 *  - GitHub Pages (GITHUB_PAGES=true): a static export served under /Class/ with the
 *    built-in content only. Pages has no server, so the build workflow
 *    (.github/workflows/pages.yml) removes the admin panel, proxy and app/api first.
 */
const pages = process.env.GITHUB_PAGES === "true";
const basePath = pages ? "/Class" : "";
const dev = process.env.NODE_ENV !== "production";

const supabase = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
const supabaseHost = supabase ? new URL(supabase) : null;

/**
 * Content-Security-Policy: the browser may load scripts only from this site, connect only
 * to this site and Supabase, show images/videos only from this site and Supabase, and frame
 * only the three video players the admin can embed (keep in step with lib/embeds.ts).
 * 'unsafe-inline' for scripts is needed by Next.js's inline bootstrapping without nonces.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${supabase ? ` ${supabase}` : ""}`,
  `media-src 'self' blob:${supabase ? ` ${supabase}` : ""}`,
  `connect-src 'self'${supabase ? ` ${supabase} ${supabase.replace(/^http/, "ws")}` : ""}`,
  "font-src 'self'",
  "frame-src https://www.youtube-nocookie.com https://player.vimeo.com https://www.instagram.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  ...(pages
    ? {
        output: "export",
        basePath,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {
        images: supabaseHost
          ? {
              remotePatterns: [
                {
                  protocol: supabaseHost.protocol.replace(":", "") as "http" | "https",
                  hostname: supabaseHost.hostname,
                  port: supabaseHost.port,
                  pathname: "/storage/v1/object/public/media/**",
                },
              ],
              // Local Supabase runs on 127.0.0.1; allow it only during development.
              dangerouslyAllowLocalIP: dev,
            }
          : undefined,
        async headers() {
          return [
            {
              source: "/:path*",
              headers: [
                { key: "Content-Security-Policy", value: csp },
                { key: "X-Content-Type-Options", value: "nosniff" },
                { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
                { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
              ],
            },
          ];
        },
      }),
};

export default nextConfig;
