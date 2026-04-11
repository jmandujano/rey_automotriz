"use client";

import { SessionProvider } from 'next-auth/react';
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { LoadingProvider } from '@/context/LoadingContext';
import LoadingOverlay from '@/components/ui/LoadingOverlay';

/**
 * Global providers wrapper.
 *
 * This component must be a client component because it uses hooks
 * from next-auth to provide session context.  It wraps the
 * application with SessionProvider, ThemeProvider (for dark/light
 * switching) and SidebarProvider (for toggling the admin menu).  Use
 * this component in the root layout so that the entire app has
 * access to these contexts.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LoadingProvider>
        <ThemeProvider>
          <SidebarProvider>
            {/* Global loading overlay displayed when navigation or async actions are in progress */}
            <LoadingOverlay />
            {children}
          </SidebarProvider>
        </ThemeProvider>
      </LoadingProvider>
    </SessionProvider>
  );
}