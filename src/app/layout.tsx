import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Parley — Disputes, thoughtfully resolved",
  description:
    "A merchant workspace for evidence-grounded PayPal dispute recommendations, policy checks, and human-approved actions.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
