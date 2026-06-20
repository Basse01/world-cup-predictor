import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'VM 2026',
  description: 'FIFA World Cup 2026 – Tippa matcherna och klättra på listan',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'VM 2026',
  },
  icons: {
    apple: '/icon.png',
    icon: '/icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/icon.png" />
      </head>
      <body className="min-h-screen bg-wc-black text-wc-light-gray antialiased">
        {children}
      </body>
    </html>
  )
}
