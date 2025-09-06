"use client"
import { useEffect } from "react"
import Lenis from "@studio-freight/lenis"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
gsap.registerPlugin(ScrollTrigger)

export function useSmoothScroll() {
   useEffect(() => {
      const lenis = new Lenis({ lerp: 0.12, smoothWheel: true })
      function raf(time: number) {
         lenis.raf(time)
         requestAnimationFrame(raf)
      }
      requestAnimationFrame(raf)

      // GSAP <-> Lenis sync
      ScrollTrigger.scrollerProxy(document.body, {
         scrollTop(value) {
            return arguments.length ? lenis.scrollTo(value) : lenis.scroll
         },
      })
      const onUpdate = () => ScrollTrigger.update()
      lenis.on("scroll", onUpdate)

      return () => {
         lenis.destroy()
         ScrollTrigger.killAll()
      }
   }, [])
}
