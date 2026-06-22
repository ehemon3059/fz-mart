import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { isIpBlocked } from "@/lib/ip-block";
import { getClientIp } from "@/lib/client-ip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "fz-mart — Cash on Delivery Store",
  description: "Order online, pay on delivery.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Enforced here rather than in middleware: middleware runs in the Edge
  // runtime by default at this Next version, and ioredis (a raw TCP client)
  // can't run there — same constraint that applies to admin session checks.
  // This layout runs in the Node runtime for every request, before any page
  // content renders, so it gives the same practical effect.
  const ip = await getClientIp();
  const blocked = ip ? await isIpBlocked(ip) : false;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50">
        {blocked ? (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <p className="text-gray-500">
              Access from your network has been restricted.
            </p>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
