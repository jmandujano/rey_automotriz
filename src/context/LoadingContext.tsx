"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * LoadingContext
 *
 * This context provides a simple global loading state that can be toggled
 * from anywhere in the application. It exposes a boolean `isLoading`
 * along with `startLoading` and `stopLoading` functions to set the
 * loading state.  The provider also listens for Next.js router events
 * to automatically show a loading overlay during navigation.
 */
interface LoadingContextValue {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
}

const LoadingContext = createContext<LoadingContextValue | undefined>(undefined);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Show loading indicator on route start and hide on complete/error
    const handleStart = () => setIsLoading(true);
    const handleComplete = () => setIsLoading(false);
    // Some versions of Next.js expose an `events` object on router.
    // Defensive check in case it's undefined on the client.
    const events = (router as any).events;
    if (events?.on && events?.off) {
      events.on("routeChangeStart", handleStart);
      events.on("routeChangeComplete", handleComplete);
      events.on("routeChangeError", handleComplete);
      return () => {
        events.off("routeChangeStart", handleStart);
        events.off("routeChangeComplete", handleComplete);
        events.off("routeChangeError", handleComplete);
      };
    }
  }, [router]);

  const startLoading = () => setIsLoading(true);
  const stopLoading = () => setIsLoading(false);

  return (
    <LoadingContext.Provider value={{ isLoading, startLoading, stopLoading }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading(): LoadingContextValue {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
}