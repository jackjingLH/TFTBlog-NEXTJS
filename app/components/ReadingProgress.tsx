'use client';

import { useEffect, useState } from 'react';

export default function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const percent = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;
      setProgress(Math.min(percent, 100));
      setVisible(scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className="fixed left-0 reading-progress"
      style={{
        top: '64px',
        zIndex: 49,
        height: '2px',
        width: `${progress}%`,
        background: 'linear-gradient(90deg, #7C3AED, #F43F5E)',
        boxShadow: '0 0 8px rgba(124, 58, 237, 0.6)',
        opacity: visible ? 1 : 0,
        transition: 'width 0.1s linear, opacity 0.3s ease',
      }}
    />
  );
}
