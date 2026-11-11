import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "FinWay — Кредит онлайн на картку до 90 000 грн в Україні",
    template: "%s | FinWay",
  },
  description:
    "Миттєвий кредит онлайн на картку 24/7 по всій Україні. Схвалення заявки до 99%, перша позика під 0.01%. Отримайте до 90 000 грн за 5 хвилин без довідок.",
  keywords: [
    "кредит онлайн",
    "гроші на картку",
    "позика без відмови",
    "мікрокредит Україна",
    "кредит 24/7",
    "FinWay",
    "швидка позика",
  ],
  authors: [{ name: "FinWay Україна" }],
  openGraph: {
    title: "FinWay - Кредит онлайн на картку до 90 000 грн",
    description:
      "Отримайте гроші на картку за 5 хвилин! Схвалення 99%, ставка від 0.01%. Працюємо цілодобово.",
    url: "https://finway.ua",
    siteName: "FinWay Україна",
    locale: "uk_UA",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
