"use client"
import { useEffect } from "react"
import scrollama from "scrollama"

export default function Story() {
   useEffect(() => {
      const scroller = scrollama()
      scroller
         .setup({ step: ".step", offset: 0.6, debug: false })
         .onStepEnter(({ element, index, direction }) => {
            element.classList.add("is-active")
         })
         .onStepExit(({ element }) => {
            element.classList.remove("is-active")
         })
      return () => scroller.destroy()
   }, [])

   return (
      <div className="grid grid-cols-1 md:grid-cols-[1fr,1fr]">
         <div className="sticky top-0 h-screen bg-black text-white grid place-items-center">{/* Sticky visual panel (map, chart, 3D, etc.) */}</div>
         <div>
            {[...Array(6)].map((_, i) => (
               <section key={i} className="step min-h-[120vh] p-16 transition-opacity">
                  <h2 className="text-3xl font-semibold">Chapter {i + 1}</h2>
                  <p>Explain a single idea; keep steps focused and short.</p>
               </section>
            ))}
         </div>
      </div>
   )
}
