import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { History, TrendingUp, Search, ArrowRight, Bot, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';

export default function LandingPage() {
  const [auditsCount, setAuditsCount] = useState(127);

  useEffect(() => {
    const interval = setInterval(() => {
      setAuditsCount(prev => prev + Math.floor(Math.random() * 3) + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-16 py-12"
    >
      {/* Hero Section */}
      <section className="text-center space-y-6 max-w-4xl mx-auto">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.1 }}
        >
          <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-full uppercase tracking-widest border border-indigo-100">
            Open Source Algorithmic Fairness
          </span>
        </motion.div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-slate-900 leading-tight">
          Audit your model for <span className="text-indigo-600 italic">hidden bias.</span>
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
          FairAudit uses advanced statistical tests and the Gemma LLM to identify systemic disparity and proxy correlations in your training datasets.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
          <Link 
            to="/upload" 
            className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 text-center flex items-center justify-center gap-2"
          >
            Start Audit
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link 
            to="/audit?demo=hiring"
            className="px-8 py-4 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all active:scale-95 text-center"
          >
            Try Demo
          </Link>
        </div>
        <div className="text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {auditsCount} audits run today
        </div>
      </section>

      {/* Feature Grid */}
      <section className="grid md:grid-cols-3 gap-6">
        {[
          {
            title: "Disparate Impact",
            desc: "Detect when specific groups are systematically excluded using the 4/5ths rule.",
            icon: ShieldCheck,
            color: "text-indigo-600",
            bg: "bg-indigo-50"
          },
          {
            title: "Proxy Detection",
            desc: "Identify hidden features that accidentally correlate with protected attributes.",
            icon: Search,
            color: "text-rose-600",
            bg: "bg-rose-50"
          },
          {
            title: "Gemma Analysis",
            desc: "Get human-readable explanations of complex bias patterns using AI.",
            icon: Bot,
            color: "text-amber-600",
            bg: "bg-amber-50"
          }
        ].map((feat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="bg-white border border-slate-200 p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow group flex flex-col"
          >
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110", feat.bg, feat.color)}>
              <feat.icon className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">{feat.title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-6 flex-grow">{feat.desc}</p>
            <Link to="/upload" className="pt-4 border-t border-slate-50 flex items-center gap-2 text-xs font-bold text-indigo-600 hover:gap-3 transition-all">
               Learn more <ArrowRight className="h-3 w-3" />
            </Link>
          </motion.div>
        ))}
      </section>

      {/* Trusted By / Stats Section */}
      <section className="bg-slate-900 rounded-3xl p-10 md:p-14 text-white flex flex-col md:flex-row items-center justify-between gap-10 border border-slate-800 shadow-2xl">
        <div className="space-y-3">
          <h2 className="text-3xl font-bold tracking-tight">Trust but verify.</h2>
          <p className="text-slate-400 text-sm max-w-sm leading-relaxed">Regulatory compliance starts with transparency. Audit your models to ensure they align with ethical standards.</p>
        </div>
        <div className="flex gap-8 md:gap-16">
          <div className="text-center">
            <div className="text-4xl font-bold text-indigo-400">94%</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Confidence</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-rose-400">&lt;2ms</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Latency</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-amber-400">GDPR</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Compliant</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 border-t border-slate-200 text-slate-400 text-xs font-medium tracking-tight">
        Built for Ethical AI Researchers & Data Scientists • © 2026 FairAudit
      </footer>
    </motion.div>
  );
}
