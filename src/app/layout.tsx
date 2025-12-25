import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FLT KPI Tracker',
  description: 'Farmasi Lautan Staff KPI Tracking System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen">
          <nav className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex items-center">
                  <span className="text-xl font-bold text-primary-600">FLT</span>
                  <span className="ml-2 text-gray-600">KPI Tracker</span>
                </div>
                <div className="flex items-center space-x-4">
                  <a href="/" className="text-gray-600 hover:text-primary-600 px-3 py-2 text-sm font-medium">
                    Dashboard
                  </a>
                  <a href="/leaderboard" className="text-gray-600 hover:text-primary-600 px-3 py-2 text-sm font-medium">
                    Leaderboard
                  </a>
                  <a href="/team" className="text-gray-600 hover:text-primary-600 px-3 py-2 text-sm font-medium">
                    Team
                  </a>
                </div>
              </div>
            </div>
          </nav>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
