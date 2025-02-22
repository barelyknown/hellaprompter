// src/pages/PromptDetail.jsx
import React from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import Card from "../components/Card";
import CardContent from "../components/CardContent";
import TeleprompterQuestion from "../components/TeleprompterQuestion";
import { mockPosts } from "./Home";

export default function PromptDetail() {
  const { slug } = useParams();

  // In a real app, you'd fetch from a server. Here, we just filter our mock data.
  const prompt = mockPosts.find((p) => p.slug === slug);

  if (!prompt) {
    return (
      <div className="min-h-screen w-full flex flex-col bg-gray-50 text-gray-800 font-bebas">
        <header className="w-full p-4 bg-white border-b shadow-sm flex justify-center">
          <p className="text-xl">Prompt not found</p>
        </header>
        <main className="max-w-4xl mx-auto py-8 px-4">
          <p>The prompt you are looking for does not exist.</p>
          <Link to="/" className="text-blue-600 hover:underline">
            Back to Home
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50 text-gray-800 font-bebas">
      {/* Header */}
      <header className="w-full p-4 bg-white border-b shadow-sm flex justify-center">
        <Link to="/">
            <img src="/hellaprompter.png" class="h-12 w-auto" />
        </Link>
      </header>

      {/* Prompt Detail Section */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="max-w-4xl w-full mx-auto py-8 px-4"
      >
        <Card>
          <CardContent>
            <TeleprompterQuestion question={prompt.question} />
          </CardContent>
        </Card>

        <div className="mt-6 bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl mb-4">Answer</h2>
          <p className="text-gray-700 mb-4">{prompt.answer}</p>
          <div className="flex flex-wrap space-x-2">
            {prompt.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-block bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <Link
          to="/"
          className="inline-block mt-6 text-blue-600 hover:underline"
        >
          ← Back to Home
        </Link>
      </motion.main>

      {/* Footer */}
      <footer className="w-full mt-auto p-4 bg-white border-t flex items-center justify-center">
        <p className="text-sm text-gray-500">
          © {new Date().getFullYear()} HellaPrompter. All rights reserved.
        </p>
      </footer>
    </div>
  );
}