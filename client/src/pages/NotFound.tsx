import { Link } from 'wouter';

export function NotFound() {
  return (
    <div className="text-center py-16">
      <div className="font-display font-black text-7xl text-brand-indigo">404</div>
      <h1 className="font-display font-extrabold text-2xl mt-4">Page not found</h1>
      <p className="text-surface-muted mt-2">That route doesn’t exist in this app.</p>
      <Link href="/" className="btn-primary mt-6">Back to Dashboard</Link>
    </div>
  );
}
