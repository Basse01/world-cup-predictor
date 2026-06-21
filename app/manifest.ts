import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'VM 2026 Tippning',
    short_name: 'VM 2026',
    description: 'FIFA World Cup 2026 – Tippa matcherna och klättra på listan',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#111111',
    theme_color: '#111111',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon.png',
        sizes: '1254x1254',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon.png',
        sizes: '1254x1254',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
