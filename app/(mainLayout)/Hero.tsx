"use client";

import { motion } from "motion/react";
import type { Variants } from "motion/react";

export function Hero() {
  const letterVariants: Variants = {
    hidden: { opacity: 0, y: 50 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.03,
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
      },
    }),
  };

  const words = "Offres d'emploi pour paysagistes".split(" ");

  return (
    <div className="relative pt-32 pb-20 px-6 overflow-hidden">
      <motion.div
        className="absolute top-20 right-20 w-96 h-96 bg-green-500/10 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: [0.42, 0, 0.58, 1],
        }}
      />
      <motion.div
        className="absolute bottom-20 left-20 w-96 h-96 bg-green-400/10 rounded-full blur-3xl"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.5, 0.3, 0.5],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: [0.42, 0, 0.58, 1],
          delay: 1,
        }}
      />

      <div className="container mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-7xl md:text-7xl mb-6 tracking-tight">
            {words.map((word, wordIndex) => (
              <span key={wordIndex} className="inline-block mr-4">
                {word.split("").map((char, charIndex) => (
                  <motion.span
                    key={`${wordIndex}-${charIndex}`}
                    custom={wordIndex * 10 + charIndex}
                    variants={letterVariants}
                    initial="hidden"
                    animate="visible"
                    className={word === "paysagistes" ? "text-green-400" : "text-white"}
                    style={{ display: "inline-block" }}
                  >
                    {char}
                  </motion.span>
                ))}
              </span>
            ))}
          </h1>
        </motion.div>

        <motion.p
          className="text-white/70 text-lg max-w-3xl mx-auto leading-relaxed"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          Découvrez des nouveaux emplois dans le secteur du paysage, que vous soyez
          paysagiste, élagueur, architecte ou technicien espaces verts. Trouvez un emploi qui
          correspond à votre expertise dans l'aménagement paysager.
        </motion.p>

        <motion.div
          className="mt-12 flex justify-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
        >
          <div className="relative">
            <motion.div
              className="absolute inset-0 bg-green-500/20 rounded-full blur-xl"
              animate={{
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: [0.42, 0, 0.58, 1],
              }}
            />
            <div className="relative bg-gradient-to-r from-green-500/20 to-green-600/20 backdrop-blur-sm border border-green-500/30 rounded-full px-8 py-3">
              <span className="text-green-400 text-sm">✨ Nouvelles offres chaque jour</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default Hero;