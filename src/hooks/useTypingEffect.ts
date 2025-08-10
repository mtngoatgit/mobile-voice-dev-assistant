"use client";

import { useState, useEffect, useRef } from "react";

export function useTypingEffect(text: string, speed: number = 50): string {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Reset when text changes
    setCurrentIndex(0);
    setDisplayText("");

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // If text is empty, don't start typing
    if (!text) return;

    // Start typing effect
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;
        
        if (nextIndex <= text.length) {
          setDisplayText(text.slice(0, nextIndex));
          return nextIndex;
        } else {
          // Clear interval when done
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return prevIndex;
        }
      });
    }, speed);

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [text, speed]);

  return displayText;
}