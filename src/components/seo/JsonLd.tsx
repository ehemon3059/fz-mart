// Renders one or more schema.org objects as a JSON-LD script tag. Server
// component — no client JS. The content comes only from our own builders in
// lib/jsonld.ts (never raw user HTML), so JSON.stringify is safe here.
export default function JsonLd({ data }: { data: object | object[] }) {
  const payload = Array.isArray(data) ? data : [data];
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(payload.length === 1 ? payload[0] : payload),
      }}
    />
  );
}
