import { auth } from '@/auth';
import NavbarClient from './NavbarClient';

export default async function Navbar() {
  const session = await auth();

  return (
    <nav
      className="sticky top-0 z-50 border-b"
      style={{
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        background: 'rgba(15, 15, 35, 0.85)',
        borderColor: 'rgba(124, 58, 237, 0.35)',
        boxShadow: '0 1px 20px rgba(124, 58, 237, 0.15)',
      }}
    >
      <NavbarClient session={session} />
    </nav>
  );
}
