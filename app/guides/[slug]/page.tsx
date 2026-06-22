import { GuideDetailShell } from '@/app/components/GuideShells';

export function generateStaticParams() {
  return [{ slug: '__guide_shell__' }];
}

export function generateMetadata() {
  return {
    title: '攻略详情 - 铲什么铲',
  };
}

export default function GuideDetailPage() {
  return <GuideDetailShell />;
}
