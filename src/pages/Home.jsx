// src/pages/Home.jsx
import React from "react";
import { motion } from "framer-motion";
import Card from "../components/Card";
import CardContent from "../components/CardContent";
import TeleprompterQuestion from "../components/TeleprompterQuestion";
import { Link } from "react-router-dom";

// Mock data
export const mockPosts = [
  {
    id: 1,
    slug: "innovation-in-ai",
    question: "What are the key factors driving innovation in AI technology?",
    answer: "Generated content here...",
    tags: ["AI", "Innovation"],
  },
  {
    id: 2,
    slug: "automation-in-customer-service",
    question: "How can businesses leverage automation in customer service?",
    answer: "Generated content here...",
    tags: ["Business", "Automation"],
  },
  {
    id: 3,
    slug: "ethical-ai-data",
    question: "What are the ethical considerations in AI-driven data analytics?",
    answer: "Generated content here...",
    tags: ["Ethics", "Data"],
  },
];

export default function Home() {
  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50 text-gray-800 font-bebas">
      {/* Header */}
      <header className="w-full p-4 bg-white border-b shadow-sm flex justify-center">
        <img src="/hellaprompter.png" class="h-12 w-auto" />
      </header>

      {/* Blog Posts Section */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="max-w-4xl w-full mx-auto py-8 px-4 grid grid-cols-1 gap-6"
      >
        {mockPosts.map((post) => (
          <Card key={post.id}>
            <CardContent>
              <Link to={`/prompts/${post.slug}`}>
                <TeleprompterQuestion question={post.question} />
              </Link>
            </CardContent>
          </Card>
        ))}
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