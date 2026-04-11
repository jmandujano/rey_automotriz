"use client";

import React from "react";
import { useLoading } from "@/context/LoadingContext";

/**
 * LoadingOverlay
 *
 * Displays a semi-transparent backdrop with a spinning indicator when
 * the global loading state is active. The spinner is implemented
 * using simple CSS borders to avoid bringing in an external icon.
 */
export default function LoadingOverlay() {
  const { isLoading } = useLoading();
  if (!isLoading) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-50">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400"></div>
    </div>
  );
}