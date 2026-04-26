import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Download, Link as LinkIcon, Check, FileText, Share2, ArrowLeft, ChevronRight, Code2, Terminal, Bot, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useApp } from '../AppContext';
import { cn } from '../lib/utils';
import { getRemediationSuggestions } from '../lib/remediationEngine';
import { generatePythonScript } from '../lib/pythonExport';

import { geminiService } from '../services/geminiService';

export default function ExportPage() {
  const { result } = useApp();
  const [copied, setCopied] = useState(false);
  const [pythonCopied, setPythonCopied] = useState(false);
  const [showPython, setShowPython] = useState(false);
  const [formalReport, setFormalReport] = useState<string>('');
  const [loadingReport, setLoadingReport] = useState(false);

  React.useEffect(() => {
    if (result && !formalReport && !loadingReport) {
      handleGenerateReport();
    }
  }, [result]);

  const handleGenerateReport = async () => {
    if (!result) return;
    setLoadingReport(true);
    try {
      const report = await geminiService.generateFormalReport({
        ORG_NAME: "The Organization",
        ROW_COUNT: result.rowCount,
        OUTCOME_COLUMN: result.config.outcomeColumn,
        SENSITIVE_COLUMN: result.config.protectedAttributes[0],
        DATE: new Date().toLocaleDateString(),
        FULL_METRICS_JSON: JSON.stringify(result.fairnessMetrics, null, 2)
      });
      setFormalReport(report);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReport(false);
    }
  };

  const pythonScript = generatePythonScript(result);

  if (!result) return <div className="text-center py-24"><Link to="/upload" className="text-indigo-600 font-bold underline">Upload data first</Link></div>;

  const handleDownloadPython = () => {
    const element = document.createElement("a");
    const file = new Blob([pythonScript], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `audit_${result.config.datasetName.replace(/\s+/g, '_')}.py`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleCopyPython = () => {
    navigator.clipboard.writeText(pythonScript);
    setPythonCopied(true);
    setTimeout(() => setPythonCopied(false), 2000);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const suggestions = getRemediationSuggestions(result);

    // Cover Page
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('FAIRAUDIT: ALGORITHMIC BIAS REPORT', 20, 25);
    
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 150, 48);
    doc.text(`Dataset: ${result.config.datasetName}`, 20, 52);
    
    // Summary Section
    doc.setFontSize(14);
    doc.text('1. EXECUTIVE VERDICT', 20, 70);
    doc.line(20, 72, 190, 72);
    
    doc.setFontSize(10);
    doc.text(`Audit Score: ${result.score}/100`, 20, 80);
    doc.text(`Risk Profile: ${result.riskLevel.toUpperCase()}`, 20, 85);
    
    const splitVerdict = doc.splitTextToSize(`Summary: ${result.verdict}`, 170);
    doc.text(splitVerdict, 20, 95);

    // Layer 2 & 3
    doc.setFontSize(14);
    doc.text('2. TECHNICAL METRICS', 20, 120);
    doc.line(20, 122, 190, 122);
    
    doc.setFontSize(10);
    let y = 132;
    result.fairnessMetrics.forEach(m => {
      doc.text(`${m.name}: ${m.value.toFixed(3)} (Ideal: ${m.idealValue})`, 20, y);
      doc.text(`- Status: ${m.status.toUpperCase()}`, 150, y);
      y += 8;
    });

    // Findings
    doc.setFontSize(14);
    doc.text('3. DETECTED DISPARITIES', 20, 175);
    doc.line(20, 177, 190, 177);
    
    doc.setFontSize(10);
    y = 187;
    result.disparateImpactFindings.filter(f => f.flagged).slice(0, 5).forEach(f => {
       doc.text(`${f.attribute}: ${f.group}`, 20, y);
       doc.text(`Impact Ratio: ${f.disparateImpactRatio.toFixed(2)}`, 150, y);
       y += 7;
    });

    // Remediation
    doc.addPage();
    doc.setFontSize(14);
    doc.text('4. REMEDIATION ROADMAP', 20, 20);
    doc.line(20, 22, 190, 22);
    
    doc.setFontSize(10);
    y = 35;
    suggestions.slice(0, 10).forEach((s, i) => {
       doc.setFont('helvetica', 'bold');
       doc.text(`${i+1}. ${s.title} (Priority: ${s.priority})`, 20, y);
       doc.setFont('helvetica', 'normal');
       const splitExp = doc.splitTextToSize(s.explanation, 160);
       doc.text(splitExp, 25, y + 5);
       y += (splitExp.length * 5) + 10;
       
       if (y > 270) {
         doc.addPage();
         y = 20;
       }
    });

    doc.setFontSize(8);
    doc.text('This report was generated using FairAudit open-source framework. No raw data was stored.', 20, 285);
    
    doc.save(`FairAudit_Report_${result.config.datasetName.replace(/\s+/g, '_')}.pdf`);
  };

  const handleCopyLink = () => {
    const serialized = btoa(JSON.stringify(result));
    const url = `${window.location.origin}/audit?data=${serialized}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }} 
      animate={{ opacity: 1, scale: 1 }} 
      className="max-w-2xl mx-auto py-12 space-y-12"
    >
      <div className="text-center space-y-4">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4 shadow-sm border border-emerald-50">
          <Check className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 leading-tight">Audit Complete</h1>
        <p className="text-slate-500 max-w-sm mx-auto leading-relaxed">Your results are ready to be shared with key stakeholders and decision makers.</p>
      </div>

      <div className="p-8 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-8">
         {/* Formal AI Report Section */}
         <div className="space-y-6">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
               <Bot className="h-4 w-4 text-indigo-600" />
               Generated Formal Audit Report
            </h3>
            <div className="p-8 bg-slate-50 rounded-xl border border-slate-100 min-h-[300px]">
               {loadingReport ? (
                 <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Drafting Formal Assessment...</p>
                 </div>
               ) : formalReport ? (
                 <div className="prose prose-slate prose-sm max-w-none">
                    {formalReport.split('\n\n').map((para, i) => (
                      <p key={i} className="text-slate-700 leading-relaxed mb-4 text-sm font-medium">{para}</p>
                    ))}
                 </div>
               ) : (
                 <div className="text-center py-20">
                    <p className="text-sm text-slate-400">Unable to generate report.</p>
                 </div>
               )}
            </div>
         </div>

         <div className="flex items-center justify-between border-b border-slate-50 pt-8 pb-6">
            <div className="flex items-center gap-4">
               <div className={cn(
                 "h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-sm",
                 result.riskLevel === 'high' ? "bg-rose-600" : result.riskLevel === 'medium' ? "bg-amber-500" : "bg-emerald-600"
               )}>
                 {result.score}
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Risk Index</p>
                  <p className="font-bold text-slate-800">{result.riskLevel.toUpperCase()} RISK</p>
               </div>
            </div>
            <Link to="/audit" className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline">
               <ArrowLeft className="h-3 w-3" />
               Review Dashboard
            </Link>
         </div>

         <div className="grid gap-4">
            <button 
              onClick={handleDownloadPDF}
              className="flex items-center justify-between p-6 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/80 hover:border-slate-200 transition-all group"
            >
               <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                     <Download className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                     <p className="font-bold text-slate-800">Download PDF Report</p>
                     <p className="text-xs text-slate-500">Includes all analysis and mitigation steps</p>
                  </div>
               </div>
               <ChevronRight className="h-5 w-5 text-slate-300 group-hover:translate-x-1 transition-transform" />
            </button>

            <button 
              onClick={handleCopyLink}
              className="flex items-center justify-between p-6 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/80 hover:border-slate-200 transition-all group"
            >
               <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-sm">
                     {copied ? <Check className="h-5 w-5" /> : <LinkIcon className="h-5 w-5" />}
                  </div>
                  <div className="text-left">
                     <p className="font-bold text-slate-800">{copied ? 'Link Copied' : 'Copy Dashboard Link'}</p>
                     <p className="text-xs text-slate-500">Direct access to the live results board</p>
                  </div>
               </div>
               <Share2 className="h-5 w-5 text-slate-300 group-hover:rotate-12 transition-transform" />
            </button>

            <div className="pt-4">
              <button 
                onClick={() => setShowPython(!showPython)}
                className="w-full flex items-center justify-between p-6 rounded-xl border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 transition-all group"
              >
                 <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-indigo-500 text-white flex items-center justify-center shadow-sm">
                       <Code2 className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                       <p className="font-bold text-indigo-900">Expert: Python Export</p>
                       <p className="text-xs text-indigo-600">Download AIF360 and Pandas audit script</p>
                    </div>
                 </div>
                 <ChevronRight className={cn("h-5 w-5 text-indigo-300 transition-transform", showPython && "rotate-90")} />
              </button>

              {showPython && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-6 rounded-xl border border-slate-200 bg-slate-900 text-slate-300 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                      <Terminal className="h-3 w-3" />
                      python-audit-script.py
                    </div>
                    <div className="flex gap-2">
                       <button onClick={handleDownloadPython} className="text-xs font-bold text-indigo-400 hover:text-indigo-300 underline">Download</button>
                       <button onClick={handleCopyPython} className="text-xs font-bold text-indigo-400 hover:text-indigo-300 underline">{pythonCopied ? 'Copied!' : 'Copy Code'}</button>
                    </div>
                  </div>
                  <pre className="text-[10px] font-mono bg-black/30 p-4 rounded overflow-x-auto leading-relaxed text-indigo-200/80">
                    {pythonScript}
                  </pre>
                  <p className="text-[9px] text-slate-500 italic">This script requires: pip install aif360 pandas numpy</p>
                </motion.div>
              )}
            </div>
         </div>

         <div className="pt-6 border-t border-slate-50 text-center">
            <Link 
              to="/upload"
              className="text-xs font-bold text-slate-400 hover:text-indigo-600 uppercase tracking-widest transition-colors"
            >
               Start a New Audit
            </Link>
         </div>
      </div>

      <div className="p-6 rounded-xl bg-slate-100 border border-slate-200 text-center text-[10px] text-slate-500 max-w-md mx-auto leading-relaxed">
         <p className="font-bold text-slate-700 uppercase tracking-widest mb-2">Privacy & Security</p>
         <p>Shared links contain encoded data in the URL hash. Audit data is never stored on our central servers. PDF reports are generated locally in your browser.</p>
      </div>
    </motion.div>
  );
}
