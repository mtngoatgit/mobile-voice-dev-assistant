"use client";

import { useCallback, useState, useEffect } from "react";

interface UseTextToSpeechOptions {
  voice?: "default" | "male" | "female";
  rate?: number;
  pitch?: number;
  volume?: number;
}

interface UseTextToSpeechResult {
  speak: (text: string) => void;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
}

export function useTextToSpeech(options: UseTextToSpeechOptions = {}): UseTextToSpeechResult {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    if (!isSupported) return;

    const updateVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    // Initial load
    updateVoices();

    // Some browsers require this event listener
    speechSynthesis.addEventListener("voiceschanged", updateVoices);

    return () => {
      speechSynthesis.removeEventListener("voiceschanged", updateVoices);
    };
  }, [isSupported]);

  const getSelectedVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (!voices.length) return null;

    switch (options.voice) {
      case "male":
        return voices.find(voice => 
          voice.name.toLowerCase().includes("male") ||
          voice.name.toLowerCase().includes("daniel") ||
          voice.name.toLowerCase().includes("alex") ||
          voice.name.toLowerCase().includes("tom")
        ) ?? voices.find(voice => (voice as any).gender === "male") ?? voices[0] ?? null;
      
      case "female":
        return voices.find(voice => 
          voice.name.toLowerCase().includes("female") ||
          voice.name.toLowerCase().includes("samantha") ||
          voice.name.toLowerCase().includes("victoria") ||
          voice.name.toLowerCase().includes("karen")
        ) ?? voices.find(voice => (voice as any).gender === "female") ?? voices[0] ?? null;
      
      default:
        return voices.find(voice => voice.default) ?? voices[0] ?? null;
    }
  }, [voices, options.voice]);

  const speak = useCallback((text: string) => {
    if (!isSupported || !text.trim()) return;

    // Stop any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set voice
    const selectedVoice = getSelectedVoice();
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    // Set options with defaults
    utterance.rate = options.rate ?? 1.0;
    utterance.pitch = options.pitch ?? 1.0;
    utterance.volume = options.volume ?? 0.8;

    // Event handlers
    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event.error);
      setIsSpeaking(false);
    };

    utterance.onpause = () => {
      setIsSpeaking(false);
    };

    utterance.onresume = () => {
      setIsSpeaking(true);
    };

    // Start speaking
    speechSynthesis.speak(utterance);
  }, [isSupported, getSelectedVoice, options]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  return {
    speak,
    stop,
    isSpeaking,
    isSupported,
    voices,
  };
}