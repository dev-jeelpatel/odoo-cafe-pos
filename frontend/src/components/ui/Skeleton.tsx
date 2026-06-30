// Reusable skeleton primitives — drop these in wherever you need a loading state.
import clsx from 'clsx';

interface Props { className?: string }

export function SkeletonBox({ className }: Props) {
  return <div className={clsx('bg-gray-200 rounded animate-pulse', className)} />;
}

/** A row of shimmer cells used in tables */
export function SkeletonTableRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: `${60 + (i * 13) % 40}%` }} />
        </td>
      ))}
    </tr>
  );
}

/** N table rows of skeleton */
export function SkeletonTable({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonTableRow key={i} cols={cols} />
      ))}
    </>
  );
}

/** Shimmer card used in grid views */
export function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse space-y-3">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-3 bg-gray-100 rounded w-1/2" />
      <div className="h-3 bg-gray-100 rounded w-2/3" />
    </div>
  );
}

/** Grid of N shimmer cards */
export function SkeletonCardGrid({ count = 8, cols = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' }: { count?: number; cols?: string }) {
  return (
    <div className={clsx('grid gap-4', cols)}>
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

/** Full stat card shimmer for dashboard/inventory overview */
export function SkeletonStatCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse space-y-2">
      <div className="flex items-center justify-between">
        <div className="h-3 bg-gray-200 rounded w-28" />
        <div className="w-9 h-9 bg-gray-200 rounded-lg" />
      </div>
      <div className="h-7 bg-gray-200 rounded w-20" />
      <div className="h-3 bg-gray-100 rounded w-24" />
    </div>
  );
}

/** A single text-line shimmer (for list rows, inline text, etc.) */
export function SkeletonLine({ width = 'w-full', height = 'h-4' }: { width?: string; height?: string }) {
  return <div className={clsx('bg-gray-200 rounded animate-pulse', width, height)} />;
}
