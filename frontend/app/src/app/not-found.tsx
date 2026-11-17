import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas text-text-primary">
      <h2 className="text-2xl font-bold">Page Not Found</h2>
      <p className="mt-2 text-sm text-text-secondary">Could not find requested resource</p>
      <Link href="/" className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black">
        Return Home
      </Link>
    </div>
  );
}
