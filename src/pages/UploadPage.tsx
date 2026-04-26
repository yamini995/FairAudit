import React, { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import { Upload, FileText, Database, Check, AlertCircle, Loader2, TrendingUp } from 'lucide-react';
import { useApp } from '../AppContext';
import { cn } from '../lib/utils';
import { generateHiringData, generateLoanData, generateContentData } from '../lib/demoData';
import { Row, AuditConfig } from '../lib/types';
import { runBiasAudit, getDatasetStats } from '../lib/biasEngine';
import { geminiService } from '../services/geminiService';

export default function UploadPage() {
  const { setData, setConfig, setResult, setDatasetAnalysis } = useApp();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [localData, setLocalData] = useState<Row[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  
  // Mapping state
  const [outcomeCol, setOutcomeCol] = useState('');
  const [posValue, setPosValue] = useState('');
  const [protectedAttrs, setProtectedAttrs] = useState<string[]>([]);
  const [featureCols, setFeatureCols] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const onFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, []);

  const handleFile = (file: File) => {
    setParsing(true);
    setFileName(file.name);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        setLocalData(results.data as Row[]);
        setParsing(false);
      },
      error: (err) => {
        console.error(err);
        setParsing(false);
      }
    });
  };

  const loadDemo = (type: 'hiring' | 'loans' | 'content') => {
    let data: Row[] = [];
    let name = '';
    if (type === 'hiring') {
      data = generateHiringData();
      name = 'Hiring Decisions';
      setOutcomeCol('hired');
      setPosValue('1');
      setProtectedAttrs(['gender', 'race']);
      setFeatureCols(['years_experience', 'department', 'education_level']);
    } else if (type === 'loans') {
      data = generateLoanData();
      name = 'Loan Approvals';
      setOutcomeCol('loan_approved');
      setPosValue('1');
      setProtectedAttrs(['gender', 'zip_code']);
      setFeatureCols(['age', 'income', 'credit_score']);
    } else {
      data = generateContentData();
      name = 'Content Recommendations';
      setOutcomeCol('engaged');
      setPosValue('1');
      setProtectedAttrs(['gender', 'user_age_group']);
      setFeatureCols(['session_length', 'content_type_shown']);
    }
    setLocalData(data);
    setFileName(name);
  };

  const runAudit = async () => {
    const newErrors = [];
    if (!outcomeCol) newErrors.push("Please select an outcome column.");
    if (!posValue) newErrors.push("Please specify the positive outcome value.");
    if (protectedAttrs.length === 0) newErrors.push("Please select at least one protected attribute.");
    if (featureCols.length === 0) newErrors.push("Please select at least one feature column.");
    
    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const config: AuditConfig = {
        datasetName: fileName || 'Uploaded Dataset',
        outcomeColumn: outcomeCol,
        positiveValue: posValue,
        protectedAttributes: protectedAttrs,
        featureColumns: featureCols
      };

      if (localData) {
        // Run Math
        const auditResult = runBiasAudit(localData, config);
        
        // Run Prompt 1 AI Analysis
        const stats = getDatasetStats(localData, config);
        const aiAnalysis = await geminiService.analyzeDataset(stats);
        
        setData(localData);
        setConfig(config);
        setResult(auditResult);
        setDatasetAnalysis(aiAnalysis);
        
        navigate('/audit');
      }
    } catch (err) {
      console.error(err);
      setErrors(["AI Analysis failed. Please check your data and API key."]);
    } finally {
      setLoading(false);
    }
  };

  const columns = localData && localData.length > 0 ? Object.keys(localData[0]) : [];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-4xl mx-auto w-full space-y-12 py-12"
    >
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 leading-tight">Audit Prep</h1>
        <p className="text-slate-500 max-w-lg mx-auto leading-relaxed">
          Upload your training dataset or model predictions (CSV format). We keep your data localized for maximum privacy.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        {parsing ? (
          <div className="py-12 flex flex-col items-center gap-4">
             <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
             <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Parsing Dataset...</p>
          </div>
        ) : (
          <div 
            className={cn(
              "relative group flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-12 transition-all min-h-[300px]",
              fileName ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200 hover:border-slate-300 bg-slate-50"
            )}
          >
            <input 
              type="file" 
              id="csv-upload" 
              className="hidden" 
              accept=".csv" 
              onChange={onFileUpload} 
            />
            
            <label 
              htmlFor="csv-upload" 
              className="flex flex-col items-center justify-center cursor-pointer w-full text-center"
            >
              <div className={cn(
                "w-16 h-16 rounded-full shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform",
                fileName ? "bg-emerald-100" : "bg-white"
              )}>
                 {fileName ? <Check className="h-8 w-8 text-emerald-600" /> : <Upload className="h-8 w-8 text-indigo-600" />}
              </div>
              
              <span className="block text-lg font-bold text-slate-800">
                {fileName ? fileName : 'Click to upload or drag and drop'}
              </span>
              <span className="block text-xs text-slate-400 mt-2 font-medium tracking-tight uppercase">CSV format • Max 50MB {localData && `• ${localData.length} rows`}</span>
            </label>

            <div className="mt-8 pt-8 border-t border-slate-100 w-full">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-4">Or use demo data</p>
              <div className="flex flex-wrap justify-center gap-3">
                {[
                  { id: 'hiring', name: 'Hiring', icon: <FileText className="h-3.5 w-3.5" /> },
                  { id: 'loans', name: 'Loans', icon: <Database className="h-3.5 w-3.5" /> },
                  { id: 'content', name: 'Engagement', icon: <TrendingUp className="h-3.5 w-3.5" /> }
                ].map(demo => (
                  <button
                    key={demo.id}
                    onClick={() => loadDemo(demo.id as any)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white hover:border-indigo-500 hover:text-indigo-600 transition-all text-xs font-bold shadow-sm"
                  >
                    {demo.icon}
                    {demo.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {localData && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-8"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center">2</div>
            <h2 className="text-xl font-bold text-slate-800">Attribute Mapping</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-4">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">
                  Outcome Column
                </label>
                <select 
                  value={outcomeCol} 
                  onChange={e => setOutcomeCol(e.target.value)}
                  className="w-full rounded-xl border-slate-200 bg-slate-50 p-3 text-sm focus:border-indigo-500 outline-none transition-all"
                >
                  <option value="">Select column...</option>
                  {columns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">
                  Positive Outcome Value
                </label>
                <input 
                  type="text" 
                  value={posValue} 
                  onChange={e => setPosValue(e.target.value)}
                  placeholder="e.g. '1', 'Hired', 'Approved'"
                  className="w-full rounded-xl border-slate-200 bg-slate-50 p-3 text-sm focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">
                  Protected Attributes
                </label>
                <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-xl border border-slate-100 max-h-40 overflow-y-auto">
                  {columns.map(col => (
                    <button
                      key={col}
                      onClick={() => {
                        setProtectedAttrs(prev => prev.includes(col) ? prev.filter(a => a !== col) : [...prev, col]);
                      }}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold transition-all",
                        protectedAttrs.includes(col)
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300"
                      )}
                    >
                      {protectedAttrs.includes(col) && <Check className="h-3 w-3" />}
                      {col}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">
                  Model Features
                </label>
                <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-xl border border-slate-100 max-h-40 overflow-y-auto">
                  {columns.map(col => (
                    <button
                      key={col}
                      onClick={() => {
                        setFeatureCols(prev => prev.includes(col) ? prev.filter(a => a !== col) : [...prev, col]);
                      }}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold transition-all",
                        featureCols.includes(col)
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300"
                      )}
                    >
                      {featureCols.includes(col) && <Check className="h-3 w-3" />}
                      {col}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {errors.length > 0 && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex gap-3 animate-in slide-in-from-top-2">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <ul className="text-xs font-bold text-rose-700 space-y-1">
                {errors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}

          <button
            onClick={runAudit}
            disabled={loading}
            className="w-full h-14 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              'Run Fairness Audit'
            )}
          </button>
        </motion.div>
      )}

      <div className="grid md:grid-cols-2 gap-6 pb-24">
         <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Privacy Policy</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
               Your datasets are processed entirely in your browser memory. We never store, transmit, or share your raw CSV data with external servers. 
            </p>
         </div>
         <div className="bg-slate-800 rounded-2xl p-6 text-white border border-slate-700 shadow-xl">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Gemma 4 Verification</h3>
            <p className="text-[11px] text-slate-200 opacity-80 leading-relaxed font-medium">
               Audit results are interpreted by Gemma 4. For best results, ensure your column names are descriptive (e.g. use "years_of_experience" instead of "feat_1").
            </p>
         </div>
      </div>
    </motion.div>
  );
}
