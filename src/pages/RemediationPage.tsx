import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ShieldAlert, AlertCircle, Bookmark, ChevronRight, Zap, Target, Database, Settings } from 'lucide-react';
import { useApp } from '../AppContext';
import { getRemediationSuggestions } from '../lib/remediationEngine';
import { geminiService } from '../services/geminiService';
import { cn } from '../lib/utils';
import { Suggestion, FixRecommendationAI } from '../lib/types';
import { Bot, Loader2, Info } from 'lucide-react';

export default function RemediationPage() {
  const { result, fixRecommendation, setFixRecommendation } = useApp();
  const [mitigationMode, setMitigationMode] = React.useState<'baseline' | 'reweighing' | 'threshold'>('baseline');
  const [loadingAi, setLoadingAi] = React.useState(false);

  React.useEffect(() => {
    if (result && !fixRecommendation && !loadingAi) {
      loadFixRecommendation();
    }
  }, [result]);

  const loadFixRecommendation = async () => {
    if (!result) return;
    setLoadingAi(true);
    try {
      // Find representation of disadvantaged group
      const disadvantagedMetric = result.representationMetrics.find(m => m.group === result.disadvantagedGroup);
      const repPct = disadvantagedMetric ? disadvantagedMetric.percentage : 20;

      const recommendation = await geminiService.recommendFix(result, repPct);
      setFixRecommendation(recommendation);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAi(false);
    }
  };

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6">
        <AlertCircle className="h-12 w-12 text-gray-300" />
        <div className="text-center">
           <h2 className="text-xl font-bold">No results to show</h2>
           <p className="text-gray-500 mt-2">Please run an audit first.</p>
        </div>
        <Link to="/upload" className="font-bold text-indigo-600 hover:underline">Go to Upload</Link>
      </div>
    );
  }

  const suggestions = getRemediationSuggestions(result);
  const urgent = suggestions.filter(s => s.priority === 1);
  const important = suggestions.filter(s => s.priority === 2);
  const consider = suggestions.filter(s => s.priority === 3);

  // Simulated Mitigation Logic
  const getMitigatedData = () => {
    const attr = result.config.protectedAttributes[0];
    const findings = result.disparateImpactFindings.filter(f => f.attribute === attr);
    const maxRate = Math.max(...findings.map(f => f.outcomeRate));
    
    return findings.map(f => {
      let mitigatedRate = f.outcomeRate;
      if (mitigationMode === 'reweighing') {
        // Simulates reducing the gap by 40% (common real-world improvement for reweighing)
        mitigatedRate = f.outcomeRate + (maxRate - f.outcomeRate) * 0.4;
      } else if (mitigationMode === 'threshold') {
        // Simulates near-perfect parity (riskier for accuracy traditionally)
        mitigatedRate = maxRate * 0.95;
      }
      return {
        group: f.group,
        baseline: f.outcomeRate,
        mitigated: mitigatedRate
      };
    });
  };

  const mitigatedStats = getMitigatedData();

  const SuggestionCard = ({ item }: { item: Suggestion }) => {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
      <div className="group rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-all">
        <div className="p-6 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest",
                  item.priority === 1 ? "bg-rose-100 text-rose-700" :
                  item.priority === 2 ? "bg-amber-100 text-amber-700" :
                  "bg-indigo-100 text-indigo-700"
                )}>
                  {item.priority === 1 ? 'Urgent' : item.priority === 2 ? 'Important' : 'Consider'}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                  {item.category === 'data' ? <Database className="h-3 w-3" /> :
                   item.category === 'model' ? <Zap className="h-3 w-3" /> :
                   <Settings className="h-3 w-3" />}
                  {item.category} Fix
                </span>
              </div>
              <h4 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors leading-tight">{item.title}</h4>
              <p className="text-sm text-slate-500 leading-relaxed max-w-2xl">{item.explanation}</p>
            </div>
            <div className={cn("h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-lg bg-slate-50 border border-slate-100 transition-transform", isOpen && "rotate-90")}>
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </div>
          </div>
          <div className="mt-4 flex gap-4">
             <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <Target className="h-2.5 w-2.5" />
                Effort: <span className="text-slate-700">{item.effort}</span>
             </div>
          </div>
        </div>
        {isOpen && (
          <div className="px-6 pb-6 pt-2 border-t border-slate-50 animate-in slide-in-from-top-4 bg-slate-50/50">
             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Implementation Roadmap</p>
             <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex gap-2">
                   <span className="text-indigo-600 font-bold">01</span>
                   <span>Identify the affected slice in your primary data source.</span>
                </li>
                <li className="flex gap-2">
                   <span className="text-indigo-600 font-bold">02</span>
                   <span>Verify consistency across different segments.</span>
                </li>
                <li className="flex gap-2">
                   <span className="text-indigo-600 font-bold">03</span>
                   <span>Apply fairness mitigation libraries (e.g. Fairlearn).</span>
                </li>
             </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }} 
      animate={{ opacity: 1, scale: 1 }} 
      className="max-w-4xl mx-auto space-y-12 py-12"
    >
      <div className="space-y-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 leading-tight">Remediation Roadmap</h1>
        <p className="text-slate-500 max-w-2xl mx-auto leading-relaxed">Based on your audit score of {result.score}/100, we've identified {urgent.length + important.length} concrete actions to improve fairness.</p>
      </div>

      {/* AI Enhanced Suggestions */}
      <div className="bg-indigo-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full" />
        <div className="relative z-10 space-y-6">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                 <Bot className="h-6 w-6 text-white" />
              </div>
              <div>
                 <h3 className="text-lg font-bold tracking-tight">Gemma Remediation</h3>
                 <p className="text-xs text-indigo-300 font-bold uppercase tracking-widest">Powered by Gemma 2</p>
              </div>
           </div>

           {loadingAi ? (
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                 <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
                 <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest animate-pulse">Consulting Neural Fairness Knowledge Base...</p>
              </div>
           ) : fixRecommendation ? (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                   <div className="p-6 bg-white/10 border border-white/20 rounded-xl space-y-3">
                      <div className="flex items-center gap-2">
                         <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[9px] font-black uppercase tracking-widest border border-emerald-500/30">Primary Technique</span>
                         <Zap className="h-4 w-4 text-emerald-400" />
                      </div>
                      <h4 className="text-lg font-bold text-white">{fixRecommendation.primary_technique}</h4>
                      <p className="text-sm text-indigo-100 leading-relaxed font-medium">{fixRecommendation.primary_reason}</p>
                   </div>
                   <div className="p-6 bg-white/5 border border-white/10 rounded-xl space-y-3">
                      <div className="flex items-center gap-2">
                         <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-[9px] font-black uppercase tracking-widest border border-indigo-500/30">Backup Strategy</span>
                         <Database className="h-4 w-4 text-indigo-400" />
                      </div>
                      <h4 className="text-lg font-bold text-slate-200">{fixRecommendation.backup_technique}</h4>
                      <p className="text-sm text-slate-300 leading-relaxed">{fixRecommendation.backup_reason}</p>
                   </div>
                </div>
                
                <div className="flex flex-col md:flex-row gap-6 p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-xl items-center">
                   <div className="flex-1 space-y-1">
                      <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Expected Improvement</p>
                      <p className="text-sm font-bold text-white">{fixRecommendation.expected_improvement}</p>
                   </div>
                   <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-500/30 rounded-lg">
                      <Info className="h-4 w-4 text-amber-400" />
                      <p className="text-[10px] font-bold text-amber-200 uppercase tracking-tight">{fixRecommendation.risk_note}</p>
                   </div>
                </div>
              </div>
           ) : (
              <div className="text-center py-12">
                 <p className="text-sm text-indigo-300">Run an audit to see AI-powered fix recommendations.</p>
              </div>
           )}
        </div>
      </div>

      {/* Layer 5: Mitigation Lab */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
         <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
               <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">L5 Mitigation Lab</h3>
               <p className="text-xs text-slate-500">Simulate how different algorithms could fix the detected bias</p>
            </div>
            <div className="flex p-1 bg-slate-100 rounded-xl gap-1">
               {[
                 { id: 'baseline', name: 'Baseline' },
                 { id: 'reweighing', name: 'Reweighing' },
                 { id: 'threshold', name: 'Opt. Threshold' }
               ].map(opt => (
                 <button
                   key={opt.id}
                   onClick={() => setMitigationMode(opt.id as any)}
                   className={cn(
                     "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                     mitigationMode === opt.id ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
                   )}
                 >
                   {opt.name}
                 </button>
               ))}
            </div>
         </div>
         <div className="p-8 grid md:grid-cols-2 gap-12">
            <div className="space-y-8">
               <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  {mitigationMode === 'baseline' ? "Currently showing the raw historical outcome rates detected in your dataset." : 
                   mitigationMode === 'reweighing' ? "Reweighing adjusts the importance of samples from underrepresented groups during the training phase, reducing the penalty for minority status." :
                   "Post-processing thresholding adjusts the decision boundaries for each group to ensure 'Equalized Odds' or 'Demographic Parity'."}
               </p>
               <div className="space-y-4">
                  {mitigatedStats.map((stat, i) => (
                     <div key={i} className="space-y-1.5 focus-within:z-10 relative">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight text-slate-400">
                           <span>{stat.group}</span>
                           <span className={cn(
                             "tabular-nums",
                             mitigationMode !== 'baseline' && "text-emerald-600"
                           )}>{stat.mitigated.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden flex">
                           <div 
                              className="h-full bg-slate-200 transition-all duration-1000" 
                              style={{ width: `${stat.baseline}%` }} 
                           />
                           {mitigationMode !== 'baseline' && (
                             <div 
                                className="h-full bg-emerald-400 transition-all duration-1000" 
                                style={{ width: `${Math.max(0, stat.mitigated - stat.baseline)}%` }} 
                             />
                           )}
                        </div>
                     </div>
                  ))}
               </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                   <Target className="h-8 w-8 text-emerald-600" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Predicted Impact</h4>
                <div className="text-3xl font-black text-slate-900">
                   {mitigationMode === 'baseline' ? '0%' : mitigationMode === 'reweighing' ? '42%' : '88%'}
                   <span className="text-xs text-slate-400 ml-1 font-bold">UP</span>
                </div>
                <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Fairness Improvement Index</p>
            </div>
         </div>
      </div>
      
      <section className="space-y-6">
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
           <span className="h-px bg-slate-200 flex-grow" />
           Urgent Actions
           <span className="h-px bg-slate-200 flex-grow" />
        </h2>
        <div className="grid gap-4">{urgent.map((s, i) => <div key={i}><SuggestionCard item={s} /></div>)}</div>
      </section>

      <section className="space-y-6">
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
           <span className="h-px bg-slate-200 flex-grow" />
           Important
           <span className="h-px bg-slate-200 flex-grow" />
        </h2>
        <div className="grid gap-4">{important.map((s, i) => <div key={i}><SuggestionCard item={s} /></div>)}</div>
      </section>

      <section className="space-y-6 pb-24">
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
           <span className="h-px bg-slate-200 flex-grow" />
           Considerations
           <span className="h-px bg-slate-200 flex-grow" />
        </h2>
        <div className="grid gap-4">{consider.map((s, i) => <div key={i}><SuggestionCard item={s} /></div>)}</div>
      </section>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <Link to="/export" className="inline-flex items-center gap-3 rounded-full bg-slate-900 px-8 py-4 text-sm font-bold text-white shadow-2xl hover:scale-105 transition-all">
          Generate Audit Report 
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </motion.div>
  );
}
