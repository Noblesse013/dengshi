import './globals.css'

export const metadata = {
  title: 'Dengshi GeoGuessr',
  description: 'Guess dengue hotspots in Dhaka and climb the leaderboard',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-gradient-to-b from-zinc-200 to-zinc-50 text-gray-900" style={{ fontFamily: '"Press Start 2P", system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
