"use client";

import { useState } from "react";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { api } from "~/trpc/react";

interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsSheet({ isOpen, onClose }: SettingsSheetProps) {
  const { user } = useUser();
  const [settings, setSettings] = useState({
    model: "openai" as "claude" | "openai" | "gemini",
    verbosity: "verbose" as "brief" | "verbose",
    repoOwner: "mtngoatgit",
    repoName: "mobile-voice-dev-assistant",
    defaultLabels: ["feature", "voice-created"],
    voice: "default" as "default" | "male" | "female",
  });

  // Get provider status
  const { data: providerStatus } = api.ai.getProviderStatus.useQuery();

  const handleSettingChange = <K extends keyof typeof settings>(
    key: K,
    value: typeof settings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-end sm:items-center sm:justify-center">
      <div className="bg-gray-900 border-t border-green-500 sm:border sm:rounded-lg w-full sm:w-96 sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-green-800">
          <h2 className="text-lg font-mono font-bold text-green-400">Settings</h2>
          <button
            onClick={onClose}
            className="text-green-400 hover:text-green-300 font-mono text-xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6 font-mono text-sm">
          {/* User Info */}
          <div className="space-y-2">
            <h3 className="text-green-400 font-semibold">Account</h3>
            <div className="text-green-300">
              <p>Email: {user?.emailAddresses[0]?.emailAddress}</p>
              <p>ID: {user?.id?.slice(0, 8)}...</p>
            </div>
            <SignOutButton>
              <button className="text-red-400 hover:text-red-300 underline">
                Sign Out
              </button>
            </SignOutButton>
          </div>

          {/* AI Model */}
          <div className="space-y-2">
            <h3 className="text-green-400 font-semibold">AI Model</h3>
            <select
              value={settings.model}
              onChange={(e) => handleSettingChange("model", e.target.value as any)}
              className="w-full bg-black border border-green-600 text-green-300 p-2 rounded font-mono"
            >
              <option value="openai">OpenAI GPT</option>
              <option value="claude">Claude Code</option>
              <option value="gemini">Google Gemini</option>
            </select>
          </div>

          {/* Verbosity */}
          <div className="space-y-2">
            <h3 className="text-green-400 font-semibold">Audio Feedback</h3>
            <div className="space-y-1">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="verbosity"
                  value="brief"
                  checked={settings.verbosity === "brief"}
                  onChange={(e) => handleSettingChange("verbosity", e.target.value as any)}
                  className="mr-2 accent-green-500"
                />
                <span className="text-green-300">Brief ("Task complete")</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="verbosity"
                  value="verbose"
                  checked={settings.verbosity === "verbose"}
                  onChange={(e) => handleSettingChange("verbosity", e.target.value as any)}
                  className="mr-2 accent-green-500"
                />
                <span className="text-green-300">Verbose (Read summary)</span>
              </label>
            </div>
          </div>

          {/* Repository */}
          <div className="space-y-2">
            <h3 className="text-green-400 font-semibold">Target Repository</h3>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Repository Owner"
                value={settings.repoOwner}
                onChange={(e) => handleSettingChange("repoOwner", e.target.value)}
                className="w-full bg-black border border-green-600 text-green-300 p-2 rounded font-mono"
              />
              <input
                type="text"
                placeholder="Repository Name"
                value={settings.repoName}
                onChange={(e) => handleSettingChange("repoName", e.target.value)}
                className="w-full bg-black border border-green-600 text-green-300 p-2 rounded font-mono"
              />
            </div>
          </div>

          {/* Default Labels */}
          <div className="space-y-2">
            <h3 className="text-green-400 font-semibold">Default Labels</h3>
            <input
              type="text"
              placeholder="Comma-separated labels"
              value={settings.defaultLabels.join(", ")}
              onChange={(e) => 
                handleSettingChange(
                  "defaultLabels", 
                  e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                )
              }
              className="w-full bg-black border border-green-600 text-green-300 p-2 rounded font-mono"
            />
          </div>

          {/* Voice Settings */}
          <div className="space-y-2">
            <h3 className="text-green-400 font-semibold">Voice</h3>
            <select
              value={settings.voice}
              onChange={(e) => handleSettingChange("voice", e.target.value as any)}
              className="w-full bg-black border border-green-600 text-green-300 p-2 rounded font-mono"
            >
              <option value="default">System Default</option>
              <option value="male">Male Voice</option>
              <option value="female">Female Voice</option>
            </select>
          </div>

          {/* Connection Status */}
          <div className="space-y-2">
            <h3 className="text-green-400 font-semibold">Connection Status</h3>
            <div className="space-y-1 text-xs">
              {providerStatus?.providers.map((provider) => (
                <div key={provider.id} className="flex justify-between">
                  <span className="text-green-300">
                    {provider.id === "openai" ? "OpenAI API" : 
                     provider.id === "claude" ? "Claude API" : 
                     "Gemini API"}:
                  </span>
                  <span className={provider.isConfigured ? "text-green-400" : "text-red-400"}>
                    {provider.isConfigured ? "Connected" : "Not Connected"}
                  </span>
                </div>
              ))}
              {providerStatus?.github && (
                <div className="flex justify-between">
                  <span className="text-green-300">GitHub API:</span>
                  <span className={providerStatus.github.isConfigured ? "text-green-400" : "text-red-400"}>
                    {providerStatus.github.isConfigured ? "Connected" : "Not Connected"}
                  </span>
                </div>
              )}
            </div>
            {providerStatus && (
              <p className="text-yellow-400 text-xs">
                {providerStatus.providers.every(p => p.isConfigured) && providerStatus.github.isConfigured
                  ? "All services connected! Ready to create GitHub issues."
                  : "Configure API keys in environment variables to enable AI features."}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-green-800 p-4">
          <button
            onClick={onClose}
            className="w-full bg-green-600 hover:bg-green-500 text-black font-mono font-semibold py-2 px-4 rounded transition-colors"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
}