import DashboardWrapper from "@/components/wrapper/dashboardWrapper";
import type { Metadata } from "next";
import { Poppins, Righteous } from "next/font/google";
import { Toaster } from 'react-hot-toast';
import "./globals.css";

const poppins = Poppins({ 
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins"
});

const righteous = Righteous({ 
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-righteous"
});

export const metadata: Metadata = {
  title: "UP AI Growth Companion",
  description: "Enterprise chat application demonstration",
  manifest: "/favicon_io/site.webmanifest?v=2",
  icons: {
    icon: [
      { url: "/favicon_io/favicon-16x16-v2.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon_io/favicon-32x32-v2.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: [
      { url: "/favicon_io/favicon-v2.ico", type: "image/x-icon" },
    ],
    apple: [
      { url: "/favicon_io/apple-touch-icon-v2.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} ${righteous.variable} font-sans`}>
        <DashboardWrapper>{children}</DashboardWrapper>
        <Toaster />
      </body>
    </html>
  );
}
