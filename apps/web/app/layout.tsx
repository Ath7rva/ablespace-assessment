import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pyramid | Task workspace',
  description: 'AbleSpace full-stack developer assessment'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
