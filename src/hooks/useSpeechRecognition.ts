"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseSpeechRecognitionOptions {
  onTranscriptUpdate: (transcript: string, isFinal: boolean) => void;
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
}

interface SpeechRecognitionResult {
  isListening: boolean;
  hasPermission: boolean;
  startListening: () => void;
  stopListening: () => void;
  requestPermission: () => void;
  isSupported: boolean;
}

// Extend the Window interface to include webkitSpeechRecognition
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export function useSpeechRecognition({
  onTranscriptUpdate,
  continuous = true,
  interimResults = true,
  language = "en-US",
}: UseSpeechRecognitionOptions): SpeechRecognitionResult {
  const [isListening, setIsListening] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Check if speech recognition is supported
  const isSupported = typeof window !== "undefined" && 
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    if (!isSupported) return;

    // Check for existing permission
    navigator.permissions?.query({ name: "microphone" as any })
      .then(result => {
        setHasPermission(result.state === "granted");
      })
      .catch(() => {
        // Fallback for browsers that don't support permissions API
        setHasPermission(false);
      });
  }, [isSupported]);

  const initializeRecognition = useCallback(() => {
    if (!isSupported || recognitionRef.current) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      
      if (event.error === "not-allowed") {
        setHasPermission(false);
      }
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        onTranscriptUpdate(finalTranscript, true);
      } else if (interimTranscript) {
        onTranscriptUpdate(interimTranscript, false);
      }
    };

    recognitionRef.current = recognition;
  }, [isSupported, continuous, interimResults, language, onTranscriptUpdate]);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      initializeRecognition();
    } catch (error) {
      console.error("Microphone permission denied:", error);
      setHasPermission(false);
    }
  }, [isSupported, initializeRecognition]);

  const startListening = useCallback(() => {
    if (!hasPermission || !isSupported) return;

    if (!recognitionRef.current) {
      initializeRecognition();
    }

    try {
      recognitionRef.current?.start();
    } catch (error) {
      console.error("Error starting speech recognition:", error);
    }
  }, [hasPermission, isSupported, initializeRecognition]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return {
    isListening,
    hasPermission,
    startListening,
    stopListening,
    requestPermission,
    isSupported,
  };
}