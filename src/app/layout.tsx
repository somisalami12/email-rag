import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Email RAG",
  description: "Search your Gmail history with Claude",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
