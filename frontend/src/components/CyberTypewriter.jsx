import React, { useState, useEffect, useRef } from 'react';

export default function CyberTypewriter({
  text = '',
  speedMs = 12,
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

  const handleFastForward = () => {
    setDisplayedText(textRef.current);
    setIsTyping(false);
    if (onComplete) onComplete();
  };

  return (
    <div
      onClick={handleFastForward}
      title="Click to reveal text immediately"
      className={`cursor-pointer select-text ${className}`}
    >
      <span>{displayedText}</span>
      {isTyping && (
        <span className="inline-block w-1.5 h-3.5 bg-[#16697a] ml-0.5 align-middle animate-pulse" />
      )}
    </div>
  );
}
