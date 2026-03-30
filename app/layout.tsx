import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Thumbnail Creator — HeartStamp",
  description:
    "Generate 1:1 thumbnail images for category tags using xAI image generation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-[#1a1a1a] font-sans">
        {children}
      </body>
    </html>
  );
}
