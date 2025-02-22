import React from "react";

export default function Card({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl shadow-lg ${className}`}>
      {children}
    </div>
  );
}