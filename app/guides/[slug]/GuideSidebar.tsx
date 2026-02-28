'use client';

import { useState } from 'react';
import Link from 'next/link';
import { GuideMetadata } from '@/lib/guides';

interface GuideSidebarProps {
  allGuides: GuideMetadata[];
  currentSlug: string;
}

function SidebarNav({
  allGuides,
  currentSlug,
  onNavigate,
}: {
  allGuides: GuideMetadata[];
  currentSlug: string;
  onNavigate?: () => void;
}) {
  return (
    <nav
      className="space-y-1 overflow-y-auto custom-scrollbar"
      style={{ maxHeight: 'calc(100vh - 10rem)' }}
    >
      {allGuides.map((g) => (
        <Link
          key={g.slug}
          href={`/guides/${g.slug}`}
          onClick={onNavigate}
          className="block px-3 py-2 rounded-lg transition-[background,border-color,box-shadow] duration-200"
          style={
            g.slug === currentSlug
              ? {
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.25) 0%, rgba(109,40,217,0.15) 100%)',
                  color: '#A78BFA',
                  fontWeight: 'bold',
                  borderLeft: '3px solid #7C3AED',
                  boxShadow: 'inset 0 0 12px rgba(124,58,237,0.1)',
                }
              : {
                  color: '#B4B4C5',
                  borderLeft: '3px solid transparent',
                }
          }
        >
          <div className="font-medium truncate">{g.title}</div>
          <div className="text-xs opacity-75 mt-0.5">{g.category}</div>
        </Link>
      ))}
    </nav>
  );
}

export default function GuideSidebar({ allGuides, currentSlug }: GuideSidebarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      {/* Desktop sticky sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <div
          className="lg:sticky top-8 rounded-xl p-4"
          style={{
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            background: 'rgba(22, 33, 62, 0.7)',
            border: '1px solid rgba(55, 48, 163, 0.5)',
            boxShadow: '0 4px 24px rgba(124, 58, 237, 0.08)',
            maxHeight: 'calc(100vh - 4rem)',
          }}
        >
          <h2
            className="text-xl font-bold mb-4 bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(135deg, #A78BFA, #7C3AED)' }}
          >
            攻略目录
          </h2>
          <SidebarNav allGuides={allGuides} currentSlug={currentSlug} />
        </div>
      </aside>

      {/* Mobile floating "目录" button */}
      <button
        className="lg:hidden fixed bottom-6 left-4 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium"
        onClick={() => setDrawerOpen(true)}
        style={{
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          background: 'rgba(124, 58, 237, 0.2)',
          border: '1px solid rgba(124, 58, 237, 0.5)',
          boxShadow: '0 0 16px rgba(124, 58, 237, 0.35)',
          color: '#A78BFA',
        }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
        目录
      </button>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-50 backdrop-enter"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer panel */}
          <div
            className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 drawer-enter"
            style={{
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              background: 'rgba(15, 15, 35, 0.97)',
              borderRight: '1px solid rgba(124, 58, 237, 0.3)',
              boxShadow: '4px 0 24px rgba(0,0,0,0.5)',
            }}
          >
            <div
              className="flex items-center justify-between p-4 border-b"
              style={{ borderColor: 'rgba(55, 48, 163, 0.4)' }}
            >
              <h2
                className="text-lg font-bold bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, #A78BFA, #7C3AED)' }}
              >
                攻略目录
              </h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg text-textLight-300 hover:text-primary-400 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-3 overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
              <SidebarNav
                allGuides={allGuides}
                currentSlug={currentSlug}
                onNavigate={() => setDrawerOpen(false)}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}
