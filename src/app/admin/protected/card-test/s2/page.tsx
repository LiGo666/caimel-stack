// app/(site)/page.tsx or any client component
"use client"
import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
gsap.registerPlugin(ScrollTrigger)

export default function Page() {
   const containerRef = useRef<HTMLDivElement>(null)
   const pinRef = useRef<HTMLDivElement>(null)
   const horizontalRef = useRef<HTMLDivElement>(null)

   useEffect(() => {
      const ctx = gsap.context(() => {
         // Parallax: background faster, cards slower
         gsap.to(".bg-layer", {
            yPercent: -30,
            ease: "none",
            scrollTrigger: { trigger: containerRef.current, start: "top top", end: "bottom bottom", scrub: true },
         })
         gsap.to(".cards-layer", {
            yPercent: -10,
            ease: "none",
            scrollTrigger: { trigger: containerRef.current, start: "top top", end: "bottom bottom", scrub: true },
         })

         // Pinned “product journey” section
         ScrollTrigger.create({ trigger: pinRef.current, start: "top top", end: "+=200%", pin: true, anticipatePin: 1, scrub: true })

         // Vertical scroll that drives horizontal reveal of 2 cards
         const cards = gsap.utils.toArray<HTMLElement>(".h-card")
         const totalX = (cards.length - 1) * 100 // vw shift
         gsap.to(cards, {
            xPercent: (_, i) => -i * 100,
            ease: "none",
            scrollTrigger: { trigger: horizontalRef.current, start: "top top", end: "+=200%", scrub: true, pin: true },
         })
      }, containerRef)

      return () => ctx.revert()
   }, [])

   return (
      <div ref={containerRef} className="relative">
         <div className="bg-layer fixed inset-0 -z-10" />
         <section className="cards-layer min-h-[150vh] flex items-end justify-center">
            {/* Intro card 6:9 */}
            <div className="w-[min(60vw,720px)] aspect-[2/3] rounded-[20px] shadow-xl bg-white/95">{/* content */}</div>
         </section>

         <section ref={pinRef} className="min-h-[300vh]">
            {/* content that stays pinned while inner bits animate */}
         </section>

         <section ref={horizontalRef} className="min-h-[200vh]">
            <div className="sticky top-0 h-screen overflow-hidden">
               <div className="flex h-full">
                  <div className="h-card shrink-0 w-screen grid place-items-center">
                     <div className="w-[min(55vw,680px)] aspect-[2/3] rounded-2xl bg-white shadow-2xl" />
                  </div>
                  <div className="h-card shrink-0 w-screen grid place-items-center">
                     <div className="w-[min(55vw,680px)] aspect-[2/3] rounded-2xl bg-white shadow-2xl" />
                  </div>
               </div>
            </div>
         </section>
      </div>
   )
}
