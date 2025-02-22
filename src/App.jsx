// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import PromptDetail from "./pages/PromptDetail";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />

        {/* Prompt detail page */}
        <Route path="/prompts/:slug" element={<PromptDetail />} />
      </Routes>
    </Router>
  );
}