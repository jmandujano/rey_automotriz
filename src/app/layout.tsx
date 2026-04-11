import { Outfit } from 'next/font/google';
import './globals.css';

import Providers from '@/components/Providers';

const outfit = Outfit({
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.className} dark:bg-gray-900`}>
        {/* Provide session, theme and sidebar context to the app */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
