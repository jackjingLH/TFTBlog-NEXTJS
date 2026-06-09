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
            className="text-xl font-bold bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 50%, #F43F5E 100%)' }}
          >
            铲什么铲
          </Link>

          <div className="hidden items-center space-x-6 sm:flex">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="relative text-textLight-200 hover:text-primary-400 transition-colors duration-200 group"
              >
                {label}
                <span
                  className={`absolute -bottom-0.5 left-0 h-0.5 transition-all duration-300 group-hover:w-full ${isActive(href) ? 'w-full' : 'w-0'}`}
                  style={{
                    background: 'linear-gradient(90deg, #7C3AED, #F43F5E)',
                    boxShadow: '0 0 6px rgba(124, 58, 237, 0.8)',
                  }}
                />
              </Link>
            ))}
          </div>

          <button
            className="sm:hidden p-2 rounded-lg text-textLight-200 hover:text-primary-400 transition-colors"
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
        <div
          className="sm:hidden"
          style={{
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            background: 'rgba(15, 15, 35, 0.97)',
            borderTop: '1px solid rgba(124, 58, 237, 0.2)',
          }}
        >
          <div className="px-4 py-3 space-y-1">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 rounded-lg text-base font-medium transition-all duration-150"
                style={{
                  color: isActive(href) ? '#A78BFA' : '#B4B4C5',
                  background: isActive(href) ? 'rgba(124, 58, 237, 0.12)' : 'transparent',
                  borderLeft: isActive(href) ? '3px solid #7C3AED' : '3px solid transparent',
                }}
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
