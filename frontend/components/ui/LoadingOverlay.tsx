"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

type Props = {
  show: boolean;
  message?: string;
};

export function LoadingOverlay({ show, message = "SYNCING NEURAL LINK..." }: Props) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="glass-panel flex flex-col items-center gap-4 rounded-2xl px-10 py-8 shadow-neon"
          >
            <Loader2 className="h-10 w-10 animate-spin text-cyber-cyan" />
            <p className="font-display text-sm tracking-widest text-cyber-cyan">{message}</p>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-cyber-purple"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
