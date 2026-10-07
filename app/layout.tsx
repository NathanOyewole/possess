import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "POSSESS",
  description: "Your Chog NFT is the save file.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
