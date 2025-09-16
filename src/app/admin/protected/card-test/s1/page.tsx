"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import type React from "react";
import { useRef } from "react";
import {
  Button,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Skeleton,
} from "@/features/shadcn/index.client";

/**
 * Quartet Cards — Immersive Scrollytelling Landing Page
 * Techniques: Pinned sections, parallax background, scroll-driven horizontal reveal,
 * subtle motion design, hover tilt, 2:3 card ratio with grain & vignette.
 *
 * TailwindCSS is assumed. Framer Motion is used for scroll/hover animations.
 */

export default function QuartetLanding() {
  // Global scroll for background parallax
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, (v) => -v * 0.6); // background moves faster

  return (
    <div className="relative min-h-screen text-slate-900 antialiased selection:bg-fuchsia-200 selection:text-fuchsia-900">
      <AnimatedGradient y={bgY} />
      <NoiseOverlay global />

      <Header />

      <main className="relative mx-auto max-w-7xl px-6">
        {/* Intro */}
        <Section>
          <motion.div
            className="flex w-full items-center justify-center"
            initial={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            viewport={{ once: true, margin: "-20% 0px" }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <TiltCard className="w-[min(80vw,640px)]">
              <CardFrame>
                <CardHeader>
                  <CardTitle className="text-center font-bold text-2xl">
                    Deck Builder
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <form className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="deckName">Deck Name</Label>
                      <Input id="deckName" placeholder="Enter deck name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="template">Template</Label>
                      <Input id="template" placeholder="Select a template" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="importList">Import List (CSV/JSON)</Label>
                      <Input accept=".csv, .json" id="importList" type="file" />
                    </div>
                    <Button className="w-full" type="submit">
                      Start Designing
                    </Button>
                  </form>
                </CardContent>
              </CardFrame>
            </TiltCard>
          </motion.div>
        </Section>

        {/* Feature card */}
        <Section>
          <motion.div
            className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-8 md:grid-cols-2"
            initial={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            viewport={{ once: true, margin: "-20% 0px" }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center">
              <h2 className="font-semibold text-2xl leading-tight md:text-4xl">
                From draft to deck — in minutes.
              </h2>
            </div>
            <TiltCard>
              <CardFrame>
                <div className="h-full p-6 md:p-8">
                  <ul className="grid gap-3 text-slate-700 text-sm md:text-base">
                    <li>
                      • True playing‑card ratio (6:9 / 2:3) with pixel‑perfect
                      bleed.
                    </li>
                    <li>
                      • Custom card backs, brand colors, and typography presets.
                    </li>
                    <li>
                      • Print runs from <strong>1 to 100</strong> decks with
                      consistent quality.
                    </li>
                    <li>
                      • Import rosters (CSV/JSON), bulk image placement, live
                      previews.
                    </li>
                    <li>
                      • Export press‑ready PDFs with crop marks and CMYK
                      profiles.
                    </li>
                  </ul>
                </div>
              </CardFrame>
            </TiltCard>
          </motion.div>
        </Section>

        {/* Pinned horizontal scrollytelling reveal */}
        <HorizontalRevealSection />

        {/* Example cards */}
        <Section>
          <motion.div
            className="mx-auto w-full max-w-5xl"
            initial={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            viewport={{ once: true, margin: "-20% 0px" }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <h3 className="mb-6 font-semibold text-xl md:text-3xl">Examples</h3>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              <TiltCard>
                <CardFrame>
                  <CardArt
                    accent="#22d3ee"
                    subtitle="Club roster, position, stats"
                    title="Football Deck"
                  />
                </CardFrame>
              </TiltCard>
              <TiltCard>
                <CardFrame>
                  <CardArt
                    accent="#f472b6"
                    subtitle="Family, friends, memory prompts"
                    title="Wedding Deck"
                  />
                </CardFrame>
              </TiltCard>
            </div>
          </motion.div>
        </Section>

        {/* Pricing card */}
        <Section>
          <motion.div
            className="mx-auto w-full max-w-5xl"
            initial={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            viewport={{ once: true, margin: "-20% 0px" }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <h3 className="mb-6 font-semibold text-xl md:text-3xl">
              Example Pricing
            </h3>
            <TiltCard className="w-full">
              <CardFrame>
                <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-3 md:p-10">
                  <PriceTile
                    note="1 deck, sample run"
                    price="€19 / deck"
                    title="Starter"
                  />
                  <PriceTile
                    note="10 decks, typical team"
                    price="€8 / deck"
                    title="Small Run"
                  />
                  <PriceTile
                    note="50 decks, event scale"
                    price="€4.50 / deck"
                    title="Pro"
                  />
                </div>
                <p className="px-6 pb-6 text-slate-500 text-xs md:px-10">
                  Pricing shown is illustrative and may vary by paper stock,
                  finish, and shipping.
                </p>
              </CardFrame>
            </TiltCard>
          </motion.div>
        </Section>

        {/* CTA */}
        <Section>
          <motion.div
            className="flex w-full items-center justify-center"
            initial={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            viewport={{ once: true, margin: "-20% 0px" }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <TiltCard className="w-[min(80vw,640px)]">
              <CardFrame>
                <CardHeader>
                  <CardTitle className="text-center font-bold text-2xl">
                    Deck Builder
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <form className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="deckName">Deck Name</Label>
                      <Input id="deckName" placeholder="Enter deck name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="template">Template</Label>
                      <Input id="template" placeholder="Select a template" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="importList">Import List (CSV/JSON)</Label>
                      <Input accept=".csv, .json" id="importList" type="file" />
                    </div>
                    <Button className="w-full" type="submit">
                      Start Designing
                    </Button>
                  </form>
                </CardContent>
              </CardFrame>
            </TiltCard>
          </motion.div>
        </Section>
      </main>

      <Footer />

      <GlobalStyles />
    </div>
  );
}

/* ============================= Components ============================= */

function Header() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-white/60 px-3 py-1.5 shadow-lg shadow-slate-900/5 ring-1 ring-white/40 backdrop-blur">
        <span className="inline-block h-2 w-2 rounded-full bg-cyan-400" />
        <span className="font-medium text-slate-800 text-sm">
          Quartet Studio
        </span>
      </div>
      <nav className="pointer-events-auto hidden items-center gap-6 text-slate-700 text-sm md:flex">
        <a className="transition hover:text-slate-900" href="#features">
          Features
        </a>
        <a className="transition hover:text-slate-900" href="#examples">
          Examples
        </a>
        <a className="transition hover:text-slate-900" href="#pricing">
          Pricing
        </a>
        <a
          className="rounded-full bg-slate-900 px-4 py-1.5 text-white shadow-sm transition hover:bg-slate-800"
          href="#get-started"
        >
          Get Started
        </a>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mx-auto max-w-7xl px-6 py-16 text-slate-500 text-sm">
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <p> 2024 Quartet Studio. All rights reserved.</p>
        <div className="flex gap-6">
          <a className="hover:text-slate-700" href="#">
            Privacy
          </a>
          <a className="hover:text-slate-700" href="#">
            Terms
          </a>
          <a className="hover:text-slate-700" href="#">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <section className="relative py-24 md:py-36">{children}</section>;
}

function CTA({
  children,
  primary,
}: {
  children: React.ReactNode;
  primary?: boolean;
}) {
  const base = "rounded-full px-5 py-2 text-sm font-medium transition-colors";
  return (
    <button
      className={
        primary
          ? `${base} bg-slate-900 text-white hover:bg-slate-800`
          : `${base} bg-white/80 text-slate-900 ring-1 ring-slate-900/10 hover:bg-white`
      }
    >
      {children}
    </button>
  );
}

/* -------------------- Cards & Visual Treatment -------------------- */

function CardFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative mx-auto overflow-hidden rounded-3xl bg-center bg-cover bg-no-repeat shadow-slate-900/20 shadow-xl ring-1 ring-slate-400/80"
      style={{
        aspectRatio: "2 / 3",
        backgroundColor: "rgb(223, 223, 223)",
        backgroundRepeat: "repeat",
      }}
    >
      <div
        className="absolute inset-0 rounded-[inherit] bg-[url('/noiseTexture.png')] bg-center bg-cover bg-no-repeat opacity-20"
        style={{ backgroundRepeat: "repeat" }}
      />
      {/* Vignette */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          background:
            "radial-gradient(120% 120% at 50% 30%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.08) 100%)",
        }}
      />
      <div className="relative z-[1] h-full">{children}</div>
    </div>
  );
}

function CardArt({
  title,
  subtitle,
  accent = "#22d3ee",
}: {
  title: string;
  subtitle?: string;
  accent?: string;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="relative h-[62%]">
        {/* Placeholder illustration */}
        <svg
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid slice"
          viewBox="0 0 100 100"
        >
          <defs>
            <linearGradient id="grad" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.15" />
              <stop offset="100%" stopColor="#111827" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <rect fill="url(#grad)" height="100" width="100" x="0" y="0" />
          <circle cx="30" cy="40" fill="#94a3b8" opacity="0.5" r="10" />
          <rect
            fill="#64748b"
            height="18"
            opacity="0.35"
            rx="3"
            width="28"
            x="48"
            y="28"
          />
          <rect
            fill="#cbd5e1"
            height="8"
            opacity="0.6"
            rx="2"
            width="64"
            x="18"
            y="66"
          />
        </svg>
      </div>
      <div className="flex-1 p-6">
        <h4 className="font-semibold text-lg text-slate-900">{title}</h4>
        {subtitle && <p className="mt-1 text-slate-600 text-sm">{subtitle}</p>}
      </div>
    </div>
  );
}

function PriceTile({
  title,
  price,
  note,
}: {
  title: string;
  price: string;
  note: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-900/10 bg-white/70 p-5 text-center shadow-sm">
      <div className="font-medium text-base text-slate-800">{title}</div>
      <div className="mt-1 font-semibold text-2xl text-slate-900">{price}</div>
      <div className="mt-1 text-slate-500 text-xs">{note}</div>
    </div>
  );
}

function TiltCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={`relative ${className}`}
      transition={{ type: "spring", stiffness: 180, damping: 14 }}
      whileHover={{ scale: 1.02, rotate: 1 }}
      whileTap={{ scale: 0.98 }}
    >
      {children}
    </motion.div>
  );
}

/* -------------------- Pinned Horizontal Reveal Section -------------------- */

function HorizontalRevealSection() {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  // cards slide from outer edges to center while scrolling downward
  const leftX = useTransform(
    scrollYProgress,
    [0, 0.4, 1],
    ["-60%", "-15%", "0%"]
  );
  const rightX = useTransform(
    scrollYProgress,
    [0, 0.4, 1],
    ["60%", "15%", "0%"]
  );
  const leftOpacity = useTransform(scrollYProgress, [0, 0.2, 0.5], [0, 0.6, 1]);
  const rightOpacity = useTransform(
    scrollYProgress,
    [0, 0.2, 0.5],
    [0, 0.6, 1]
  );

  return (
    <section
      aria-label="Horizontal reveal scrollytelling"
      className="relative h-[220vh]"
      ref={sectionRef}
    >
      <div className="sticky top-0 h-screen">
        <div className="relative mx-auto flex h-full max-w-6xl items-center justify-center">
          <motion.div
            className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 z-0"
            style={{ opacity: 0.06 }}
          >
            {/* soft glow behind cards */}
            <div className="h-[38rem] w-[38rem] rounded-full bg-white blur-3xl" />
          </motion.div>

          <motion.div
            className="z-10"
            style={{ x: leftX, opacity: leftOpacity }}
          >
            <TiltCard>
              <CardFrame>
                <CardArt
                  accent="#a78bfa"
                  subtitle="Choose template • Set brand • Import data"
                  title="Build Your Deck"
                />
              </CardFrame>
            </TiltCard>
          </motion.div>

          <motion.div
            className="z-10"
            style={{ x: rightX, opacity: rightOpacity }}
          >
            <TiltCard>
              <CardFrame>
                <CardArt
                  accent="#22d3ee"
                  subtitle="Export PDF • Crop marks • CMYK"
                  title="Press‑Ready Output"
                />
              </CardFrame>
            </TiltCard>
          </motion.div>
        </div>

        {/* Story text pinned at the bottom */}
        <div className="-translate-x-1/2 absolute bottom-8 left-1/2 z-20">
          <motion.p
            className="rounded-full bg-white/70 px-4 py-2 text-slate-700 text-sm shadow ring-1 ring-slate-900/10 backdrop-blur"
            style={{ opacity: rightOpacity }}
          >
            Scroll to reveal — vertical scroll drives horizontal motion
          </motion.p>
        </div>
      </div>
    </section>
  );
}

/* -------------------- Background & Global Styles -------------------- */

function AnimatedGradient({ y }: { y: any }) {
  return (
    <motion.div
      aria-hidden
      className="animated-gradient -z-20 fixed inset-0"
      style={{ y }}
    >
      {/* Subtle radial fade edges */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 120% at 30% 20%, rgba(255,255,255,0.35), rgba(255,255,255,0) 60%)",
        }}
      />
    </motion.div>
  );
}

function NoiseOverlay({ global = false }: { global?: boolean }) {
  // SVG fractal noise overlay; use low opacity for subtle paper grain
  return (
    <svg
      aria-hidden
      className={`${global ? "-z-10 fixed inset-0" : "absolute inset-0"} pointer-events-none opacity-[0.06] mix-blend-multiply`}
    >
      <filter id="noiseFilter">
        <feTurbulence
          baseFrequency="0.9"
          numOctaves="2"
          stitchTiles="stitch"
          type="fractalNoise"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect filter="url(#noiseFilter)" height="100%" width="100%" />
    </svg>
  );
}

function GlobalStyles() {
  return (
    <style>{`
      /* Animated multi-stop gradient background */
      .animated-gradient { 
        background-image: linear-gradient(120deg, #0ea5e9, #a78bfa, #f472b6, #22d3ee);
        background-size: 300% 300%;
        animation: gradientShift 18s ease-in-out infinite;
      }
      @keyframes gradientShift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }

      /* Smooth transforms */
      .smooth-transform { transition: transform 500ms cubic-bezier(0.22, 1, 0.36, 1); }

      /* Improve text rendering for elegance */
      html { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
    `}</style>
  );
}
