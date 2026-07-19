/**
 * Instant skeleton shown by the App Router (as a Suspense fallback) while the
 * product page's server data loads — mirrors the real layout in page.tsx so the
 * page's shape appears immediately instead of a blank body under the top bar.
 */
function Bar({ className = "" }: { className?: string }) {
  return <div className={"rounded bg-gray-200 " + className} />;
}

export default function ProductLoading() {
  return (
    <div className="font-manrope mx-auto w-full max-w-[1200px] px-5 py-8" aria-hidden="true">
      <div className="grid animate-pulse gap-8 md:grid-cols-2">
        {/* Gallery: main image + thumbnail strip */}
        <div className="space-y-3">
          <div className="aspect-square w-full rounded-xl bg-gray-200" />
          <div className="flex gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 w-16 rounded-lg bg-gray-200" />
            ))}
          </div>
        </div>

        {/* Details column: title, price, rating, stock, description, actions */}
        <div className="space-y-4">
          <Bar className="h-7 w-3/4" />
          <Bar className="h-7 w-2/5" />

          <div className="flex items-center gap-2">
            <Bar className="h-4 w-28" />
            <Bar className="h-4 w-20" />
          </div>

          <Bar className="h-4 w-40" />

          <div className="space-y-2 pt-1">
            <Bar className="h-3.5 w-full" />
            <Bar className="h-3.5 w-full" />
            <Bar className="h-3.5 w-5/6" />
          </div>

          {/* Quantity + action buttons */}
          <div className="space-y-3 pt-3">
            <Bar className="h-10 w-32" />
            <div className="flex gap-3">
              <Bar className="h-11 flex-1" />
              <Bar className="h-11 flex-1" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
