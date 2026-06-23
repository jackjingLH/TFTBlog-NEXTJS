import NavbarClient from './NavbarClient';

export default function Navbar() {
  return (
    <nav
      className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md"
    >
      <NavbarClient />
    </nav>
  );
}
