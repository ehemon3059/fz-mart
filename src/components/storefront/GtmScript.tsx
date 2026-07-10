import Script from "next/script";

// Conditional injection: if no GTM id is configured, render nothing at all —
// not an empty <script> tag. The `nonce` (from the per-request CSP set in
// middleware) is applied so this inline bootstrap passes the nonce-based CSP.
export default function GtmScript({ gtmId, nonce }: { gtmId: string | null; nonce?: string }) {
  if (!gtmId) return null;

  return (
    <>
      <Script id="gtm-script" strategy="afterInteractive" nonce={nonce}>
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${gtmId}');`}
      </Script>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
          title="gtm"
        />
      </noscript>
    </>
  );
}
