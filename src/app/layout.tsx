import type { Metadata } from "next";
import "./global.css";

export const metadata: Metadata = {
  title: "Glam Glim Admin",
  description: "Glam Glim Admin Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}