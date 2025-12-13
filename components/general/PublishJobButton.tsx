"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function PublishJobButton() {
  return (
    <Link href="/post-job">
      <motion.button
        className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg hover:shadow-green-500/30 transition-all"
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.98 }}
      >
        Publier un job
      </motion.button>
    </Link>
  );
}