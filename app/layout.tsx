import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Real Review",
  description: "Unbiased product reviews from real users across the web",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white min-h-screen">{children}</body>
    </html>
  );
}
