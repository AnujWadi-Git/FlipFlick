import type { Metadata } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import "./globals.css";
import { BackgroundDotGrid } from "@/components/BackgroundDotGrid";
import { Vignette } from "@/components/Vignette";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

// Bold, tall, condensed — the cinematic streaming-service impact font used
// for the FLIPFLICK wordmark and movie titles. Everything else (body,
// labels, buttons) stays on Inter for readability.
const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-cinematic",
});

export const metadata: Metadata = {
  title: "FlipFlick: Stop scrolling. Flip for a movie.",
  description:
    "Tell FlipFlick what you're feeling and it will flip an intelligent coin to decide exactly what you should watch tonight.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${bebasNeue.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <BackgroundDotGrid />
        <Vignette />
        <div className="relative z-10 flex flex-col min-h-full">{children}</div>
      </body>
    </html>
  );
}
