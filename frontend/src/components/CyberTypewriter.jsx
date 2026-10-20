import React, { useState, useEffect, useRef } from 'react';

export default function CyberTypewriter({
  text = '',
  speedMs = 15,
  className = '',
  onComplete = null
}) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const textRef = useRef(text);

  useEffect(() => {
    textRef.current = text;
    setDisplayedText('');
    setIsTyping(true);

    if (!text) {
      setIsTyping(false);
      return;
    }

    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex += 2; // Type 2 chars per tick for crisp pace
      if (currentIndex >= text.length) {
        setDisplayedText(text);
        setIsTyping(false);
        clearInterval(interval);
        if (onComplete) onComplete();
      } else {
        setDisplayedText(text.slice(0, currentIndex));
      }
    }, speedMs);

    return () => clearInterval(interval);
  }, [text, speedMs, onComplete]);

  // Click to reveal full text immediately
  const handleFastForward = () => {
    setDisplayedText(textRef.current);
    setIsTyping(false);
    if (onComplete) onComplete();
  };

  return (
    <div
      onClick={handleFastForward}
      title="Click to reveal immediately"
      className={`font-mono cursor-pointer select-text ${className}`}
    >
      <span>{displayedText}</span>
      {isTyping && (
        <span className="inline-block w-2 h-4 bg-cyan-400 ml-0.5 align-middle animate-terminal-caret" />
      )}
    </div>
  );
}
