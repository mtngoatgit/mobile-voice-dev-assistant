"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MicButton } from "./MicButton";
import { useSpeechRecognition } from "~/hooks/useSpeechRecognition";
import { useTypingEffect } from "~/hooks/useTypingEffect";
import { useTextToSpeech } from "~/hooks/useTextToSpeech";
import { api } from "~/trpc/react";

interface TerminalLine {
  id: string;
  type: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

export function Terminal() {
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: "welcome",
      type: "system",
      content: "Voice Dev Assistant v1.0.0 initialized",
      timestamp: new Date(),
    },
    {
      id: "help",
      type: "system", 
      content: "Tap the microphone to start speaking your feature requests",
      timestamp: new Date(),
    }
  ]);
  const [currentInput, setCurrentInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [verbosity, setVerbosity] = useState<"brief" | "verbose">("verbose"); // TODO: Get from settings
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Text-to-speech hook
  const { speak, stop, isSpeaking } = useTextToSpeech({
    voice: "default", // TODO: Get from settings
    rate: 1.0,
    volume: 0.8,
  });

  const scrollToBottom = useCallback(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [lines, scrollToBottom]);

  const addLine = useCallback((type: TerminalLine["type"], content: string) => {
    const newLine: TerminalLine = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
    };
    setLines(prev => [...prev, newLine]);
  }, []);

  // AI processing mutation
  const planAndCreateIssues = api.ai.planAndOpenIssues.useMutation({
    onSuccess: (result) => {
      const successMessage = `✅ Created ${result.totalIssuesCreated} GitHub issues`;
      addLine("assistant", successMessage);
      addLine("system", `Summary: ${result.planSummary}`);
      
      result.createdIssues.forEach((issue, index) => {
        addLine("system", `${index + 1}. #${issue.number}: ${issue.title}`);
        addLine("system", `   ${issue.url}`);
      });
      
      // Text-to-speech feedback based on verbosity setting
      if (verbosity === "verbose") {
        speak(`Task completed. Created ${result.totalIssuesCreated} GitHub issues. ${result.planSummary}`);
      } else {
        speak("Task complete");
      }
      
      setIsProcessing(false);
    },
    onError: (error) => {
      const errorMessage = `❌ Error: ${error.message}`;
      addLine("assistant", errorMessage);
      speak(`Error: ${error.message}`);
      setIsProcessing(false);
    },
  });

  const handleTranscriptUpdate = useCallback((transcript: string, isFinal: boolean) => {
    if (isFinal) {
      addLine("user", transcript);
      setCurrentInput("");
      setIsProcessing(true);
      
      // Call AI processing with real backend
      planAndCreateIssues.mutate({
        transcript,
        model: "openai", // TODO: Get from settings
        repo: {
          owner: "mtngoatgit", // TODO: Get from settings
          name: "mobile-voice-dev-assistant", // TODO: Get from settings
        },
        verbosity, // TODO: Get from settings
        labels: ["voice-created"], // TODO: Get from settings
      });
    } else {
      setCurrentInput(transcript);
    }
  }, [addLine, planAndCreateIssues]);

  const {
    isListening,
    startListening,
    stopListening,
    hasPermission,
    requestPermission,
  } = useSpeechRecognition({
    onTranscriptUpdate: handleTranscriptUpdate,
  });

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && currentInput.trim()) {
      const inputText = currentInput;
      addLine("user", inputText);
      setCurrentInput("");
      setIsProcessing(true);
      
      // Call AI processing with real backend
      planAndCreateIssues.mutate({
        transcript: inputText,
        model: "openai", // TODO: Get from settings
        repo: {
          owner: "mtngoatgit", // TODO: Get from settings
          name: "mobile-voice-dev-assistant", // TODO: Get from settings
        },
        verbosity, // TODO: Get from settings
        labels: ["voice-created"], // TODO: Get from settings
      });
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="flex flex-col h-full font-mono text-sm">
      {/* Terminal Output */}
      <div 
        ref={terminalRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-green-600 scrollbar-track-gray-900"
      >
        {lines.map((line) => (
          <div key={line.id} className="flex items-start gap-2">
            <span className="text-green-600 text-xs mt-0.5 w-20 flex-shrink-0">
              {formatTimestamp(line.timestamp)}
            </span>
            <span className="text-green-500 flex-shrink-0 w-8">
              {line.type === "user" ? "›" : line.type === "assistant" ? "§" : "•"}
            </span>
            <span className={`flex-1 break-words ${
              line.type === "user" 
                ? "text-green-300" 
                : line.type === "assistant"
                ? "text-blue-300"
                : "text-gray-400"
            }`}>
              <TypewriterText text={line.content} />
            </span>
          </div>
        ))}
        
        {/* Current Input Display */}
        {currentInput && (
          <div className="flex items-start gap-2">
            <span className="text-green-600 text-xs mt-0.5 w-20 flex-shrink-0">
              {formatTimestamp(new Date())}
            </span>
            <span className="text-green-500 flex-shrink-0 w-8">›</span>
            <span className="flex-1 break-words text-green-300">
              {currentInput}
              <span className="animate-pulse">|</span>
            </span>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex items-start gap-2">
            <span className="text-green-600 text-xs mt-0.5 w-20 flex-shrink-0">
              {formatTimestamp(new Date())}
            </span>
            <span className="text-green-500 flex-shrink-0 w-8">§</span>
            <span className="flex-1 break-words text-blue-300">
              <span className="animate-pulse">Processing...</span>
            </span>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="border-t border-green-800 p-4 bg-gray-900">
        <div className="flex items-center gap-2">
          <span className="text-green-500">›</span>
          <input
            ref={inputRef}
            type="text"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your request or use voice..."
            className="flex-1 bg-transparent text-green-300 placeholder-green-700 border-none outline-none font-mono"
            disabled={isListening || isProcessing}
          />
          
          {/* Control Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* TTS Stop Button */}
            {isSpeaking && (
              <button
                onClick={stop}
                className="bg-red-600 hover:bg-red-500 text-white px-2 py-2 rounded font-mono text-xs border-2 border-opacity-50 transition-all duration-150 font-semibold"
                title="Stop speaking"
              >
                🔇
              </button>
            )}
            
            {/* Mic Button */}
            <MicButton
              isListening={isListening}
              hasPermission={hasPermission}
              onStartListening={startListening}
              onStopListening={stopListening}
              onRequestPermission={requestPermission}
              disabled={isProcessing}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Component for typewriter effect
function TypewriterText({ text }: { text: string }) {
  const displayText = useTypingEffect(text, 30);
  return <>{displayText}</>;
}