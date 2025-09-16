// app/(site)/page.tsx or any client component
"use client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";

gsap.registerPlugin(ScrollTrigger);

export default function Page() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const horizontalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Parallax: background faster, cards slower
      gsap.to(".bg-layer", {
        yPercent: -30,
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
        },
      });
      gsap.to(".cards-layer", {
        yPercent: -10,
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
        },
      });

      // Pinned “product journey” section
      ScrollTrigger.create({
        trigger: pinRef.current,
        start: "top top",
        end: "+=200%",
        pin: true,
        anticipatePin: 1,
        scrub: true,
      });

      // Vertical scroll that drives horizontal reveal of 2 cards
      const cards = gsap.utils.toArray<HTMLElement>(".h-card");
      const totalX = (cards.length - 1) * 100; // vw shift
      gsap.to(cards, {
        xPercent: (_, i) => -i * 100,
        ease: "none",
        scrollTrigger: {
          trigger: horizontalRef.current,
          start: "top top",
          end: "+=200%",
          scrub: true,
          pin: true,
        },
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <div className="-z-10 fixed inset-0 bg-layer" />
      <section className="cards-layer flex min-h-[150vh] items-end justify-center">
        {/* Intro card 6:9 */}
        <div className="aspect-[2/3] w-[min(60vw,720px)] rounded-[20px] bg-white/95 shadow-xl">
          {/* content */}
        </div>
      </section>

      <section className="min-h-[300vh]" ref={pinRef}>
        {/* content that stays pinned while inner bits animate */}
      </section>

      <section className="min-h-[200vh]" ref={horizontalRef}>
        <div className="sticky top-0 h-screen overflow-hidden">
          <div className="flex h-full">
            <div className="grid h-card w-screen shrink-0 place-items-center">
              <div className="aspect-[2/3] w-[min(55vw,680px)] rounded-2xl bg-white shadow-2xl" />
            </div>
            <div className="grid h-card w-screen shrink-0 place-items-center">
              <div className="aspect-[2/3] w-[min(55vw,680px)] rounded-2xl bg-white shadow-2xl" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
