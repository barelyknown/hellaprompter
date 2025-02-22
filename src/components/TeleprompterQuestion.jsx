import React from "react";
import { motion } from "framer-motion";

export default function TeleprompterQuestion({ question }) {
  return (
    <div className="relative bg-black text-white w-full h-24 overflow-hidden rounded-xl shadow-md flex items-center justify-center p-4">
      <motion.div
        className="text-xl md:text-2xl leading-relaxed"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ duration: 3, ease: "easeOut" }}
      >
        {question}
      </motion.div>
    </div>
  );
}