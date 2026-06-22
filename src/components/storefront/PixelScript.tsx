import Script from "next/script";

// Conditional injection: if no Pixel id is configured, render nothing — not
// an empty <script> tag. AddToCart/Purchase events are fired separately
// (see lib/pixel.ts) once this base script has initialized `fbq`.
export default function PixelScript({ pixelId }: { pixelId: string | null }) {
  if (!pixelId) return null;

  return (
    <>
      <Script id="fb-pixel-script" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${pixelId}');
        fbq('track', 'PageView');`}
      </Script>
      <noscript>
        {/* Meta's documented tracking pixel must be a plain <img> inside
            <noscript> — next/image requires JS and cannot run here. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
