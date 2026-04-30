import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider }  from '@/lib/auth-context';
import { ToastProvider } from '@/components/ui/toast';
import './globals.css';

const inter = Inter({
  subsets:  ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Flash Sale Dashboard',
  description: 'Operator dashboard for Flash Sale Engine',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
