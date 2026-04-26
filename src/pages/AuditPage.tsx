import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  ReferenceLine, Cell 
} from 'recharts';
import { 
  ShieldAlert, ShieldCheck, HelpCircle, ArrowRight, LayoutDashboard, 
  AlertTriangle, Info, Bot, MessageCircle, Send, Loader2, TrendingUp, Search, History, Code2, AlertCircle
} from 'lucide-react';
import { useApp } from '../AppContext';
import { cn } from '../lib/utils';
import { generateHiringData, generateLoanData, generateContentData } from '../lib/demoData';
import { runBiasAudit } from '../lib/biasEngine';
import { analyzeWithGemma, chatWithGemma } from '../lib/gemmaService';
import { geminiService } from '../services/geminiService';
import { Row, AuditConfig, GemmaAnalysis, ChatMessage, BiasExplanationAI } from '../lib/types';

export default function AuditPage() {
  const { 
    result, setResult, setConfig, setData, 
    datasetAnalysis, biasExplanation, setBiasExplanation 
  } = useApp();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [activeAttr, setActiveAttr] = useState('');
  const [gemmaAnalysis, setGemmaAnalysis] = useState<GemmaAnalysis | null>(null);
  const [gemmaLoading, setGemmaLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [showExplanation, setShowExplanation] = useState<string | null>(null);

  useEffect(() => {
    const demo = searchParams.get('demo');
    if (demo && !result) {
      let data: Row[] = [];
      let name = '';
      let config: AuditConfig;
      if (demo === 'hiring') {
        data = generateHiringData();
        name = 'Hiring Demo';
        config = { datasetName: name, outcomeColumn: 'hired', positiveValue: '1', protectedAttributes: ['gender', 'race'], featureColumns: ['years_experience', 'department'] };
      } else if (demo === 'loans') {
        data = generateLoanData();
        name = 'Loans Demo';
        config = { datasetName: name, outcomeColumn: 'loan_approved', positiveValue: '1', protectedAttributes: ['gender', 'zip_code'], featureColumns: ['income', 'credit_score'] };
      } else {
        data = generateContentData();
        name = 'Content Demo';
        config = { datasetName: name, outcomeColumn: 'engaged', positiveValue: '1', protectedAttributes: ['gender', 'user_age_group'], featureColumns: ['session_length', 'content_type_shown'] };
      }
      const res = runBiasAudit(data, config);
      setData(data);
      setConfig(config);
      setResult(res);
    } else if (!result && !demo) {
      navigate('/upload');
    }
  }, [searchParams, result, navigate]);

  useEffect(() => {
    if (result && !activeAttr) {
      setActiveAttr(result.config.protectedAttributes[0]);
    }
    if (result && !biasExplanation && !explaining) {
      handleExplainMetrics();
    }
    if (result && !gemmaAnalysis && !gemmaLoading) {
      runGemma();
    }
  }, [result]);

  const handleExplainMetrics = async () => {
    if (!result) return;
    setExplaining(true);
    try {
      const explanation = await geminiService.explainBiasMetrics(result);
      setBiasExplanation(explanation);
    } catch (e) {
      console.error(e);
    } finally {
      setExplaining(false);
    }
  };

  const runGemma = async () => {
    if (!result) return;
    setGemmaLoading(true);
    try {
      const analysis = await analyzeWithGemma(result);
      setGemmaAnalysis(analysis);
    } catch (e) {
      console.error(e);
    } finally {
      setGemmaLoading(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim() || !result || chatLoading) return;
    const msg = chatInput;
    setChatInput('');
    const newHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: msg }];
    setChatHistory(newHistory);
    setChatLoading(true);
    try {
      const response = await chatWithGemma(msg, result, chatHistory);
      setChatHistory([...newHistory, { role: 'assistant', content: response }]);
    } catch (e) {
      console.error(e);
    } finally {
      setChatLoading(false);
    }
  };

  if (!result) return null;

  const currentRepresentation = result.representationMetrics.filter(m => m.attribute === activeAttr);
  const currentFindings = result.disparateImpactFindings.filter(f => f.attribute === activeAttr);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col gap-8 pb-20"
    >
      {/* Header Score Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-wrap md:flex-nowrap gap-8 items-center">
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="48" cy="48" r="40" stroke="#E2E8F0" strokeWidth="8" fill="transparent" />
              <circle 
                cx="48" cy="48" r="40" 
                stroke={result.riskLevel === 'high' ? "#F43F5E" : result.riskLevel === 'medium' ? "#F59E0B" : "#10B981"} 
                strokeWidth="8" 
                strokeDasharray="251.2" 
                strokeDashoffset={251.2 * (1 - result.score / 100)} 
                fill="transparent" 
                className="transition-all duration-1000" 
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-slate-800">{result.score}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Score</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn(
                "px-2 py-0.5 text-[10px] font-bold rounded uppercase",
                result.riskLevel === 'high' ? "bg-rose-100 text-rose-700" :
                result.riskLevel === 'medium' ? "bg-amber-100 text-amber-700" :
                "bg-emerald-100 text-emerald-700"
              )}>
                {result.riskLevel}-Risk
              </span>
              <span className="text-slate-400 text-xs tracking-tight font-medium">• {result.config.datasetName} ({result.rowCount.toLocaleString()} rows)</span>
            </div>
            <h2 className="text-xl font-semibold text-slate-800 leading-tight">
              Verdict: <span className="text-slate-600">{result.verdict}</span>
            </h2>
          </div>
        </div>
        <div className="flex flex-col gap-2 w-full md:w-auto">
          <button 
            onClick={() => navigate('/export')}
            className="h-10 px-6 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <ShieldCheck className="h-4 w-4" /> Download Report
          </button>
        </div>
      </div>

      {/* Dataset Analysis AI Summary (Prompt 1) */}
      {datasetAnalysis && (
        <div className={cn(
          "bg-white border rounded-xl p-6 shadow-sm flex flex-col md:flex-row gap-6",
          datasetAnalysis.overall_data_health === 'CRITICALLY BIASED' ? "border-rose-200 bg-rose-50/20" : 
          datasetAnalysis.overall_data_health === 'NEEDS REVIEW' ? "border-amber-200 bg-amber-50/20" : "border-emerald-200 bg-emerald-50/20"
        )}>
          <div className="shrink-0 pt-1">
            {datasetAnalysis.overall_data_health === 'CRITICALLY BIASED' ? <AlertTriangle className="h-8 w-8 text-rose-500" /> : <ShieldCheck className="h-8 w-8 text-emerald-500" />}
          </div>
          <div className="space-y-3">
             <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data Health Verdict</span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                  datasetAnalysis.overall_data_health === 'CRITICALLY BIASED' ? "bg-rose-100 text-rose-700" : 
                  datasetAnalysis.overall_data_health === 'NEEDS REVIEW' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                )}>
                  {datasetAnalysis.overall_data_health}
                </span>
             </div>
             <p className="text-sm font-bold text-slate-800 leading-snug">{datasetAnalysis.summary}</p>
             <div className="flex flex-wrap gap-2">
                {datasetAnalysis.representation_warnings.map((w, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-[10px] font-bold text-rose-700">
                    <AlertCircle className="h-3 w-3" /> {w}
                  </span>
                ))}
                {datasetAnalysis.approval_rate_warnings.map((w, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
                    <AlertTriangle className="h-3 w-3" /> {w}
                  </span>
                ))}
             </div>
          </div>
        </div>
      )}

      {/* Primary Navigation for Attributes */}
      <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Audit Sensitivity:</span>
        <div className="flex gap-2">
          {result.config.protectedAttributes.map(attr => (
            <button
              key={attr}
              onClick={() => setActiveAttr(attr)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold transition-all",
                activeAttr === attr 
                  ? "bg-indigo-600 text-white shadow-md" 
                  : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300"
              )}
            >
              {attr}
            </button>
          ))}
        </div>
      </div>

      {/* Layer 2: Representation Check */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">L2</div>
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Representation Check</h3>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
           {currentRepresentation.map((metric, i) => (
             <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{metric.group}</p>
                   <span className={cn(
                     "px-1.5 py-0.5 rounded text-[8px] font-black uppercase",
                     metric.status === 'fair' ? "bg-emerald-100 text-emerald-700" :
                     metric.status === 'review' ? "bg-amber-100 text-amber-700" :
                     "bg-rose-100 text-rose-700"
                   )}>
                     {metric.status}
                   </span>
                </div>
                <div className="flex items-baseline gap-2">
                   <p className="text-2xl font-bold text-slate-800">{metric.percentage.toFixed(1)}%</p>
                   <p className="text-xs text-slate-400 font-medium">{metric.count.toLocaleString()} rows</p>
                </div>
                <div className="w-full h-1 bg-slate-50 rounded-full overflow-hidden">
                   <div className="h-full bg-slate-200" style={{ width: `${metric.percentage}%` }} />
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed italic">{metric.explanation}</p>
             </div>
           ))}
        </div>
      </div>

      {/* Layer 3: Technical Bias Metrics */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">L3</div>
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Technical Bias Metrics</h3>
            </div>
            <Link to="/export" className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:bg-indigo-100 transition-colors">
               <Code2 className="h-3 w-3" />
               AIF360 Comparison Available
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4">
             {result.fairnessMetrics.map((metric, i) => {
               const metricKey = 
                 metric.name.includes('Parity') ? 'demographic_parity' : 
                 metric.name.includes('Impact') ? 'disparate_impact' : 
                 metric.name.includes('Opportunity') ? 'equalized_odds' : null;
               
               const explanation = metricKey && biasExplanation ? biasExplanation[metricKey as keyof BiasExplanationAI] : null;
               const isExpanded = showExplanation === metric.name;

               return (
                 <div key={i} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4 group hover:border-indigo-200 transition-all">
                    <div className="flex items-center gap-8">
                       <div className="flex-1 space-y-1">
                          <h4 className="text-sm font-bold text-slate-800">{metric.name}</h4>
                          <p className="text-xs text-slate-500">{metric.description}</p>
                       </div>
                       <div className="text-right shrink-0">
                          <p className={cn(
                            "text-2xl font-black tabular-nums",
                            metric.status === 'fair' ? "text-emerald-600" :
                            metric.status === 'review' ? "text-amber-500" :
                            "text-rose-600"
                          )}>
                             {metric.value.toFixed(3)}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Ideal: {metric.idealValue}</p>
                       </div>
                       <button 
                          onClick={() => setShowExplanation(isExpanded ? null : metric.name)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all",
                            isExpanded ? "bg-slate-100 text-slate-600" : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                          )}
                       >
                          {isExpanded ? 'Close' : 'Learn More'}
                       </button>
                    </div>

                    {isExpanded && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="pt-4 border-t border-slate-100 space-y-3"
                      >
                         {explaining ? (
                           <div className="flex items-center gap-2 py-2">
                             <Loader2 className="h-3 w-3 animate-spin text-indigo-600" />
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Consulting AI...</span>
                           </div>
                         ) : explanation ? (
                           <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[8px] font-black uppercase",
                                  explanation.severity === 'PASS' ? "bg-emerald-100 text-emerald-700" :
                                  explanation.severity === 'WARNING' ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                                )}>
                                  AI Verdict: {explanation.severity}
                                </span>
                              </div>
                              <p className="text-xs font-bold text-slate-700 leading-relaxed italic">"{explanation.plain_meaning}"</p>
                              <div className="flex gap-2">
                                 <div className="w-1 bg-indigo-200 rounded-full" />
                                 <p className="text-[11px] text-slate-500 leading-relaxed"><span className="font-bold text-slate-700">Consequence:</span> {explanation.consequence}</p>
                              </div>
                           </div>
                         ) : (
                           <p className="text-xs text-slate-400">Detailed AI analysis is being generated for this project...</p>
                         )}
                      </motion.div>
                    )}
                 </div>
               );
             })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">LR</div>
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Outcome Disparity</h3>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm h-[320px] flex flex-col items-center justify-center">
             <div className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={currentFindings} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                      <XAxis dataKey="group" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }} 
                        formatter={(val: number) => [`${val.toFixed(1)}%`, 'Positive Rate']}
                      />
                      <Bar dataKey="outcomeRate" radius={[6, 6, 0, 0]}>
                         {currentFindings.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.flagged ? '#F43F5E' : '#1E293B'} />
                         ))}
                      </Bar>
                   </BarChart>
                </ResponsiveContainer>
             </div>
             <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-tight mt-4">Historical Selection Rates (%)</p>
          </div>
        </div>
      </div>

      {/* AI Interpretation (Gemma) */}
      <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-xl border border-slate-800 relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full" />
         <div className="relative z-10 space-y-6">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                     <Bot className="h-6 w-6 text-white" />
                  </div>
                  <div>
                     <h3 className="text-lg font-bold tracking-tight">Gemma Verification</h3>
                     <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Powered by Gemma 2</p>
                  </div>
               </div>
               <button 
                  onClick={runGemma}
                  disabled={gemmaLoading}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
               >
                  {gemmaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Re-Analyze'}
               </button>
            </div>
            
            <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
               {gemmaLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                     <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
                     <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Running Neural Fairness Check...</p>
                  </div>
               ) : gemmaAnalysis ? (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                     <p className="text-sm leading-relaxed text-indigo-100 font-bold mb-4 bg-indigo-500/20 p-4 rounded-lg border border-indigo-500/30">
                        {datasetAnalysis?.summary || "Audit results interpretation complete."}
                     </p>
                     <p className="text-sm leading-relaxed text-slate-200 font-medium">{gemmaAnalysis.executiveSummary}</p>
                     <div className="grid md:grid-cols-2 gap-4">
                        {gemmaAnalysis.keyFindings.slice(0, 2).map((f, i) => (
                           <div key={i} className="p-4 bg-white/5 border border-white/5 rounded-lg">
                              <p className="text-[10px] font-black text-indigo-400 uppercase mb-2">Finding {i+1}</p>
                              <p className="text-xs font-bold text-slate-100 mb-1">{f.finding}</p>
                              <p className="text-[10px] text-slate-400 leading-relaxed">{f.evidence}</p>
                           </div>
                        ))}
                     </div>
                  </div>
               ) : (
                  <div className="text-center py-12">
                     <p className="text-sm text-slate-400">Awaiting AI analysis of the technical metrics...</p>
                  </div>
               )}
            </div>

            <div className="flex justify-between items-center pt-4">
               <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-emerald-500" />
                     <span className="text-[10px] font-black text-slate-500 uppercase">Live Audit</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-indigo-500" />
                     <span className="text-[10px] font-black text-slate-500 uppercase">Zero External Storage</span>
                  </div>
               </div>
               <Link 
                  to="/remediation"
                  className="inline-flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
               >
                  See Fix Suggestions <ArrowRight className="h-4 w-4" />
               </Link>
            </div>
         </div>
      </div>

      {/* Chat Widget */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-w-3xl mx-auto w-full">
         <div className="flex items-center gap-3 mb-6">
            <MessageCircle className="h-5 w-5 text-indigo-600" />
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Stakeholder Consultation</h4>
         </div>
         
         <div className="space-y-4 max-h-[300px] overflow-y-auto mb-6 px-2 custom-scrollbar">
            {chatHistory.length === 0 && (
               <div className="text-center py-8">
                  <p className="text-xs text-slate-400 font-medium">Ask questions about legal impacts, mitigation steps, or specific data skews.</p>
               </div>
            )}
            {chatHistory.map((chat, i) => (
               <div key={i} className={cn(
                  "flex items-start gap-3 p-4 rounded-xl text-xs leading-relaxed",
                  chat.role === 'user' ? "ml-12 bg-slate-50 border border-slate-100 text-slate-700" : "mr-12 bg-indigo-50 border border-indigo-100 text-slate-800"
               )}>
                  {chat.role === 'assistant' && <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center shrink-0 mt-0.5"><Bot className="h-3.5 w-3.5 text-white" /></div>}
                  <div className="flex-1 font-medium">{chat.content}</div>
               </div>
            ))}
            {chatLoading && (
               <div className="flex items-center gap-2 p-4 text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Generating AI Response...</span>
               </div>
            )}
         </div>

         <div className="flex gap-2 relative">
            <input 
               type="text" 
               value={chatInput}
               onChange={e => setChatInput(e.target.value)}
               onKeyDown={e => e.key === 'Enter' && handleChat()}
               placeholder="How do these results compare to industry benchmarks?"
               className="flex-1 h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-medium focus:border-indigo-500 outline-none transition-all shadow-inner"
            />
            <button 
               onClick={handleChat}
               disabled={!chatInput.trim() || chatLoading}
               className="bg-slate-900 text-white px-6 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center gap-2"
            >
               <Send className="h-4 w-4" /> Consult
            </button>
         </div>
      </div>
    </motion.div>
  );
}
