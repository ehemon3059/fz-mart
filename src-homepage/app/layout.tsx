import type { Metadata } from "next";
import { Manrope } from "next/font/google";

const manrope = Manrope({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FZ Mart — Online Shopping in Bangladesh",
  description: "Fresh groceries, electronics, fashion & more. Cash on Delivery. Free shipping over ৳499.",
  keywords: "online shopping Bangladesh, grocery delivery, electronics, fashion, FZ Mart",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ fontFamily: manrope.style.fontFamily }}>
        <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            background-color: #fafaf9;
            color: #23211e;
            line-height: 1.6;
          }
          a {
            color: #c026d3;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          button {
            font-family: inherit;
          }
        `}</style>
        {children}
      </body>
    </html>
  );
}
