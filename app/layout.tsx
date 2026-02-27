import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://47.99.202.3'),
  title: {
    default: "铲什么铲 - 云顶之弈/金铲铲全网攻略聚合",
    template: "%s | 铲什么铲",
  },
  description: "汇聚 TFT Times、TFTips、哔哩哔哩、抖音、YouTube、Tacter 等平台最新阵容攻略与版本资讯，云顶之弈/金铲铲之战强势阵容一站直达",
  keywords: ["云顶之弈", "金铲铲之战", "TFT", "阵容攻略", "版本强势阵容", "金铲铲攻略", "云顶之弈阵容", "金铲铲阵容推荐"],
  referrer: "no-referrer",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "铲什么铲",
    title: "铲什么铲 - 云顶之弈/金铲铲全网攻略聚合",
    description: "汇聚各平台最新阵容攻略与版本资讯，云顶之弈/金铲铲之战强势阵容一站直达",
  },
  other: {
    "baidu-site-verification": "codeva-J66JdBDwXf",
    "google-site-verification": "XY1qt7sCDWOuTZ1MUmAf0YCi9fkJD6AW6v_FVv2OJGQ",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
