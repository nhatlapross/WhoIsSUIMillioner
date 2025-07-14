import './globals.css'
import { Inter } from 'next/font/google'
import { Metadata } from 'next'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'SUI Millionaire - AI Anti-Cheat Game',
  description: 'Blockchain-based quiz game with AI anti-cheat system powered by Sui Network',
  keywords: ['blockchain', 'quiz', 'game', 'sui', 'ai', 'anti-cheat', 'millionaire'],
  authors: [{ name: 'SUI Millionaire Team' }],
  creator: 'SUI Millionaire',
  publisher: 'SUI Millionaire',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: 'https://sui-millionaire.com',
    title: 'SUI Millionaire - AI Anti-Cheat Game',
    description: 'Play the ultimate blockchain quiz game with AI-powered anti-cheat system',
    siteName: 'SUI Millionaire',
    images: [
      {
        url: '/images/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SUI Millionaire Game'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SUI Millionaire - AI Anti-Cheat Game',
    description: 'Play the ultimate blockchain quiz game with AI-powered anti-cheat system',
    images: ['/images/twitter-image.png'],
    creator: '@sui_millionaire'
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icons/icon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'mask-icon', url: '/icons/safari-pinned-tab.svg', color: '#3b82f6' },
    ]
  },
  manifest: '/manifest.json',
  themeColor: '#0F172A',
  colorScheme: 'dark'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#0F172A" />
        <meta name="msapplication-TileColor" content="#0F172A" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        
        {/* DNS prefetch for AI models */}
        <link rel="dns-prefetch" href="//cdn.jsdelivr.net" />
        
        {/* Security headers */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        
        {/* Performance hints */}
        <link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <div id="root">
          {children}
        </div>
        
        {/* Portal for modals and tooltips */}
        <div id="modal-root"></div>
        <div id="tooltip-root"></div>
      </body>
    </html>
  )
}