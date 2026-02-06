import { ReactNode } from "react";
import { Navigation, MobileNav } from "./Navigation";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="lg:pl-64 min-h-screen flex flex-col">
        <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8 pb-24 lg:pb-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
