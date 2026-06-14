import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        // www.vinaybatra.org → apex (vinaybatra.org), preserving the path.
        // Fires once www is pointed at this Vercel project.
        source: "/:path*",
        has: [{ type: "host", value: "www.vinaybatra.org" }],
        destination: "https://vinaybatra.org/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
