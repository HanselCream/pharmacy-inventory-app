import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import LayoutWrapper from '@/components/LayoutWrapper'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'PamiPharma Inventory',
  description: 'Pharmacy inventory management system with POS, sales, and purchase tracking',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/ppIcon.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/ppIcon.png',
        media: '(prefers-color-scheme: dark)',
      },
    ],
    apple: '/ppIcon.png',
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
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} bg-background light`}>
      <body className="font-sans antialiased bg-background text-foreground">
        <LayoutWrapper>{children}</LayoutWrapper>
        <Toaster position="top-right" />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}