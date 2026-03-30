import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-[#1a1a1a]">404</h1>
        <p className="mt-2 text-[#6e6d6a]">Page not found</p>
        <Link href="/" className="mt-4 inline-block text-sm text-brand-red underline">
          Go home
        </Link>
      </div>
    </div>
  );
}
