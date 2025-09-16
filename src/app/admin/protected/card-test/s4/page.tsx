"use client";
import { motion, useScroll, useTransform } from "framer-motion";
export default function Section() {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ["0vh", "-15vh"]); // subtle parallax
  return (
    <motion.div className="grid h-[150vh] place-items-center" style={{ y }}>
      <div className="aspect-[2/3] w-[min(60vw,720px)] rounded-2xl bg-white shadow-xl" />
    </motion.div>
  );
}
