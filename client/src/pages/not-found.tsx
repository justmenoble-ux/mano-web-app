import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="glass-card rounded-2xl p-12 text-center max-w-md w-full border-2 border-white/5">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        
        <h1 className="text-4xl font-bold text-white mb-4 font-display">404</h1>
        <p className="text-muted-foreground mb-8 text-lg">
          We couldn't find the page you were looking for. It might have been moved or deleted.
        </p>

        <Link href="/" className="inline-flex items-center justify-center px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all hover:-translate-y-0.5 shadow-lg shadow-primary/20">
          Return Home
        </Link>
      </div>
    </div>
  );
}
