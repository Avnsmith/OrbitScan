import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const ibmSans = IBM_Plex_Sans({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-ibm-sans",
});

const ibmMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-ibm-mono",
});

export const metadata: Metadata = {
  title: "OrbitScan — Enterprise Orbital Explorer",
  description: "Monitor entropy provenance, orbital telemetry, and SpaceComputer cTRNG infrastructure in real time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-graphite-950 text-slate-100 antialiased">
      <body className={`${ibmSans.variable} ${ibmMono.variable} min-h-full font-sans antialiased bg-graphite-950 text-slate-200 select-none`}>
        {children}
      </body>
    </html>
  );
}
