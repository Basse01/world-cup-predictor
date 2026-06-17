import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.api-sports.io' },
      { protocol: 'https', hostname: '**.apifootball.com' },
      { protocol: 'https', hostname: 'media.api-sports.io' },
    ],
  },
}

export default nextConfig
