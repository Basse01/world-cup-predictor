import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'VM 2026',
  description: 'FIFA World Cup 2026 Prediction Competition',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body className="min-h-screen bg-wc-black text-wc-light-gray antialiased">
        {children}
      </body>
    </html>
  )
}
