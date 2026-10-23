import type { ReactNode } from 'react'

export const metadata = {
  title: 'Art Star',
  description: 'Персональная визитка с полной настройкой оформления.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
