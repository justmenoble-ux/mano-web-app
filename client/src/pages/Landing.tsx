import { Link } from "wouter";
import { ArrowRight, Check, Shield } from "lucide-react";
import { motion } from "framer-motion";

export default function Landing() {
  return (
    <div className="min-h-screen flex bg-[#0f172a] text-white">
      {/* Left Content Side */}
      <div className="flex-1 flex flex-col justify-center p-8 lg:p-16 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-slate-800 via-slate-950 to-black opacity-50 z-0" />
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-[100px] z-0" />
        
        <div className="relative z-10 max-w-2xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Shield className="w-6 h-6 text-slate-900" />
              </div>
              <span className="font-display font-bold text-2xl tracking-tight">MaNo Spendometer</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight mb-6">
              Master Your <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">Shared Finances</span>
            </h1>

            <p className="text-xl text-slate-400 mb-10 leading-relaxed max-w-lg">
              The intelligent way for households to track and analyze expenses. 
              Secure, private and powered by AI.
            </p>

            <div className="space-y-4 mb-10">
              {['AI Statement Processing', 'Automatic Expense Categorization', 'Analyze Spending Habits'].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 text-slate-300">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  {feature}
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <a 
                href="/api/login"
                className="px-8 py-4 rounded-xl bg-primary text-slate-900 font-bold hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 group"
              >
                Get Started
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </motion.div>
        </div>

        <div className="absolute bottom-8 left-8 text-sm text-slate-600">
          © {new Date().getFullYear()} Private Household App
        </div>
      </div>

      {/* Right Visual Side - Desktop Only */}
      <div className="hidden lg:block w-1/2 relative bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-40 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
        
        {/* Floating Glass Cards Visualization */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
            animate={{ opacity: 1, scale: 1, rotate: -3 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-[400px] h-[500px] glass-panel rounded-3xl p-8 border border-white/10 shadow-2xl backdrop-blur-md"
          >
            <div className="flex justify-between items-center mb-8">
              <div className="h-8 w-32 bg-white/10 rounded-lg animate-pulse" />
              <div className="h-10 w-10 rounded-full bg-white/10" />
            </div>
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-white/10" />
                    <div className="space-y-2">
                      <div className="h-4 w-24 bg-white/10 rounded" />
                      <div className="h-3 w-16 bg-white/5 rounded" />
                    </div>
                  </div>
                  <div className="h-6 w-16 bg-primary/20 rounded" />
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
