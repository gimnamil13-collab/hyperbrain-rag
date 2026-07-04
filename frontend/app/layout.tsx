import { Toaster } from "sonner";
import type { Metadata } from "next";
import { Inter, Orbitron } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron" });

export const metadata: Metadata = {
  title: "HYPERBRAIN RAG",
  description: "Sci-Fi Second Brain RAG — Personal knowledge neural interface",
  other: { google: "notranslate" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" translate="no" className="notranslate h-full">
      <body className={`${inter.variable} ${orbitron.variable} h-full font-sans`}>
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            classNames: {
              toast:
                "glass-panel border-cyber-cyan/30 text-slate-100 font-sans shadow-neon-sm",
              title: "text-sm font-medium",
              description: "text-xs text-slate-400",
              success: "border-cyan-500/50",
              error: "border-red-500/50",
            },
          }}
        />
      </body>
    </html>
  );
}
