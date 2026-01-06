import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BamenyaAI - Your Intelligent Assistant",
  description: "AI-powered assistant for Rwandan users. Fast, accurate, and personalized.",
  keywords: ["AI", "chatbot", "Rwanda", "assistant", "BamenyaAI"],
  authors: [{ name: "BamenyaAI" }],
  openGraph: {
    title: "BamenyaAI - Your Intelligent Assistant",
    description: "AI-powered assistant for Rwandan users. Fast, accurate, and personalized.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
