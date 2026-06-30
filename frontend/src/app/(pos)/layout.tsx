'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

// Full-page skeleton that matches the POS shell (sidebar + top bar + content area).
// Shown only during the brief JS-boot window before auth state resolves.
function AppSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 animate-pulse">
      {/* Sidebar skeleton */}
      <div className="hidden lg:flex w-64 bg-white border-r border-gray-200 flex-col gap-3 p-4">
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-4" />
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-9 bg-gray-100 rounded-lg" />
        ))}
      </div>
      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-3">
          <div className="h-5 w-32 bg-gray-200 rounded" />
          <div className="ml-auto flex gap-3">
            <div className="w-7 h-7 bg-gray-200 rounded-full" />
            <div className="h-5 w-20 bg-gray-100 rounded hidden sm:block" />
          </div>
        </div>
        {/* Content placeholder */}
        <div className="flex-1 p-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 content-start">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="w-full aspect-[4/3] bg-gray-100" />
              <div className="p-2.5 space-y-1.5">
                <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Cart panel skeleton */}
      <div className="w-80 bg-white border-l border-gray-200 flex-shrink-0 p-4 space-y-4 hidden lg:block">
        <div className="h-6 bg-gray-200 rounded w-1/2" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 bg-gray-100 rounded-lg" />
        ))}
        <div className="mt-auto h-12 bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}

export default function PosLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
  }, [user, isLoading, router]);

  // With sync auth init, isLoading is false on first render for returning users,
  // so this skeleton is only shown during the very first JS-boot frame.
  if (isLoading) return <AppSkeleton />;
  if (!user) return null;
  return <>{children}</>;
}
