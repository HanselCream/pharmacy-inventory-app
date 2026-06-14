import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'PharmaTrack - Pharmacy Inventory Management',
  description: 'Complete pharmacy inventory management system with POS, sales, and purchase tracking',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} bg-background`}>
      <body className="font-sans antialiased bg-background text-foreground">
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar Navigation */}
          <nav className="w-64 bg-card border-r border-border flex flex-col">
            <div className="p-6 border-b border-border">
              <h1 className="text-2xl font-bold text-primary">PharmaTrack</h1>
              <p className="text-sm text-muted-foreground mt-1">Inventory System</p>
            </div>
            <ul className="flex-1 overflow-y-auto p-4 space-y-2">
              <li>
                <a href="/" className="block px-4 py-2 rounded-md hover:bg-accent text-foreground">Dashboard</a>
              </li>
              <li>
                <a href="/medicines" className="block px-4 py-2 rounded-md hover:bg-accent text-foreground">Medicines</a>
              </li>
              <li>
                <a href="/pos" className="block px-4 py-2 rounded-md hover:bg-accent text-foreground">POS</a>
              </li>
              <li>
                <a href="/purchases" className="block px-4 py-2 rounded-md hover:bg-accent text-foreground">Purchases</a>
              </li>
              <li>
                <a href="/sales" className="block px-4 py-2 rounded-md hover:bg-accent text-foreground">Sales</a>
              </li>
              <li>
                <a href="/reports" className="block px-4 py-2 rounded-md hover:bg-accent text-foreground">Reports</a>
              </li>
            </ul>
          </nav>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
        <Toaster position="top-right" />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
