import type { NextConfig } from "next";

/**
 * Base URL SAP monitor.
 *
 * Hanya dipakai di server lewat rewrite /api/sap/*, jadi TIDAK memakai
 * prefix NEXT_PUBLIC_ — jika diprefix, IP internal akan ikut ter-inline
 * ke bundle browser (request harus tetap server-to-server).
 * Sumber nilainya: .env / environment CI.
 */
const SAP_API_URL = process.env.SAP_API_URL;

if (!SAP_API_URL) {
  throw new Error(
    "SAP_API_URL belum diset. Tambahkan ke .env: SAP_API_URL=http://<host>:<port>",
  );
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/sap/:path*",
        destination: `${SAP_API_URL}/api/sap/:path*`,
      },
    ];
  },
};

export default nextConfig;
