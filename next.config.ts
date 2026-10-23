import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['jszip'],
  experimental: {
    middlewareClientMaxBodySize: '220mb',
  },
}

export default nextConfig

