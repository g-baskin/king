import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'King Web',
  description: 'Hosted creative command center migration scaffold for King.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
