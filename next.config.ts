import type { NextConfig } from "next";

const withBundleAnalyzer =
  process.env.ANALYZE === "true"
    ? // eslint-disable-next-line @typescript-eslint/no-var-requires
      require("@next/bundle-analyzer")({ enabled: true })
    : (config: NextConfig) => config;

const nextConfig: NextConfig = {
  modularizeImports: {
    "lucide-react": {
      transform: "lucide-react/dist/esm/icons/{{member}}",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "68zwz8lm8h.ufs.sh",
        port: "",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
      },
    ],
  },
};

export default withBundleAnalyzer(nextConfig);

