"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface InstallAppButtonProps {
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function InstallAppButton({
  variant = "outline",
  size = "default",
  className = "",
}: InstallAppButtonProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    setDownloading(true);

    // Create an invisible anchor tag and trigger direct file download
    const link = document.createElement("a");
    link.href = "/api/download-desktop";
    link.download = "TaskFlow-Desktop-Launcher.bat";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloading(false);
    }, 1500);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDownload}
      disabled={downloading}
      className={`inline-flex items-center gap-2 cursor-pointer font-medium ${className}`}
    >
      <svg
        className={`w-4 h-4 text-blue-600 ${downloading ? "animate-bounce" : ""}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
      <span>{downloading ? "Downloading..." : "Download Desktop App"}</span>
    </Button>
  );
}
