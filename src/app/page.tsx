"use client";

import { useState, useRef, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { SignIn } from "@clerk/nextjs";
import { Terminal } from "~/components/Terminal";
import { SettingsSheet } from "~/components/SettingsSheet";

export default function Home() {
  const { isLoaded, isSignedIn } = useUser();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-green-400">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto mb-4"></div>
          <p className="font-mono">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-green-400 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-mono font-bold mb-2">Voice Dev Assistant</h1>
            <p className="text-green-300 font-mono text-sm">Terminal-style mobile voice interface</p>
          </div>
          <div className="bg-gray-900 border border-green-500 rounded-lg p-4">
            <SignIn />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-green-400 overflow-hidden">
      <div className="relative h-screen flex flex-col">
        {/* Header */}
        <header className="border-b border-green-800 p-2 flex justify-between items-center bg-gray-900">
          <h1 className="font-mono text-sm">voice-dev-assistant</h1>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="text-green-400 hover:text-green-300 font-mono text-sm border border-green-600 px-2 py-1 rounded"
          >
            settings
          </button>
        </header>

        {/* Terminal */}
        <div className="flex-1 overflow-hidden">
          <Terminal />
        </div>

        {/* Settings Sheet */}
        <SettingsSheet 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
        />
      </div>
    </div>
  );
}