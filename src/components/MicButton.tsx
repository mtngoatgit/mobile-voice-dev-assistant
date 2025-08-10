"use client";

interface MicButtonProps {
  isListening: boolean;
  hasPermission: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  onRequestPermission: () => void;
  disabled?: boolean;
}

export function MicButton({
  isListening,
  hasPermission,
  onStartListening,
  onStopListening,
  onRequestPermission,
  disabled = false,
}: MicButtonProps) {
  const handleClick = () => {
    if (!hasPermission) {
      onRequestPermission();
      return;
    }

    if (isListening) {
      onStopListening();
    } else {
      onStartListening();
    }
  };

  const getButtonState = () => {
    if (!hasPermission) {
      return {
        text: "🎤",
        className: "bg-yellow-600 hover:bg-yellow-500 text-black",
        title: "Click to enable microphone"
      };
    }
    
    if (isListening) {
      return {
        text: "⏹",
        className: "bg-red-600 hover:bg-red-500 text-white animate-pulse",
        title: "Stop recording"
      };
    }
    
    return {
      text: "🎤",
      className: "bg-green-600 hover:bg-green-500 text-white",
      title: "Start recording"
    };
  };

  const buttonState = getButtonState();

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      title={buttonState.title}
      className={`
        ${buttonState.className}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        px-3 py-2 rounded font-mono text-sm border-2 border-opacity-50
        transition-all duration-150 font-semibold min-w-[48px] h-[40px]
        active:scale-95 touch-manipulation
      `}
    >
      {buttonState.text}
    </button>
  );
}