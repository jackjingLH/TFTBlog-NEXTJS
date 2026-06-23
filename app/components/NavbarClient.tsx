'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const navLinks = [
  { href: '/', label: '首页' },
  { href: '/guides', label: '攻略' },
  { href: '/data', label: '资料' },
];

export default function NavbarClient() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link
            href="/"
            className="text-xl font-bold text-text-primary hover:text-accent transition-colors"
          >
            铲什么铲
          </Link>

          <div className="hidden items-center space-x-6 sm:flex">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`relative py-3 min-h-[44px] flex items-center transition-colors duration-200 ${
                  isActive(href)
                    ? 'text-accent font-medium'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {label}
                {isActive(href) && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-accent" />
                )}
              </Link>
            ))}
          </div>

          <button
            className="sm:hidden p-2 rounded-lg text-text-secondary hover:text-accent transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="sm:hidden bg-surface border-t border-border">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                  isActive(href)
                    ? 'text-accent bg-accent-light border-l-4 border-accent'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
