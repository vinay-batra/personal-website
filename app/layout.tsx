import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://personal-website-mu-nine-34.vercel.app"),
  title: "Vinay Batra",
  description:
    "High school student in the Philadelphia area. I build software (Corvo, Lark, and FBLA One) and I've managed my own investment portfolio since 2021.",
  openGraph: {
    title: "Vinay Batra",
    description:
      "High school student who builds software (Corvo, Lark, FBLA One) and invests for the long run.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vinay Batra",
    description:
      "High school student who builds software (Corvo, Lark, FBLA One) and invests for the long run.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // extend under the iPhone notch / home indicator
  colorScheme: "dark",
  themeColor: "#0f0d0a", // match the ink bg so Safari's chrome blends in
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${plexSans.variable} ${plexMono.variable} antialiased`}
    >
      <body>
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
