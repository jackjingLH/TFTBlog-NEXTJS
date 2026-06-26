import { Suspense } from 'react';
import DataPageClient from './DataPageClient';

export const metadata = {
  title: '资料 - 铲什么铲',
  description: 'TFT 资料查询入口。',
};

export default function DataPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-background" />}>
      <DataPageClient />
    </Suspense>
  );
}
