import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AuditResult, AuditConfig, DatasetAnalysisAI, BiasExplanationAI, FixRecommendationAI } from './lib/types';
import { User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

interface AppContextType {
  data: any[] | null;
  setData: (data: any[] | null) => void;
  config: AuditConfig | null;
  setConfig: (config: AuditConfig | null) => void;
  result: AuditResult | null;
  setResult: (result: AuditResult | null) => void;
  user: User | null | undefined;
  loading: boolean;
  // AI States
  datasetAnalysis: DatasetAnalysisAI | null;
  setDatasetAnalysis: (val: DatasetAnalysisAI | null) => void;
  biasExplanation: BiasExplanationAI | null;
  setBiasExplanation: (val: BiasExplanationAI | null) => void;
  fixRecommendation: FixRecommendationAI | null;
  setFixRecommendation: (val: FixRecommendationAI | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<any[] | null>(null);
  const [config, setConfig] = useState<AuditConfig | null>(null);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [user, loading] = useAuthState(auth);

  const [datasetAnalysis, setDatasetAnalysis] = useState<DatasetAnalysisAI | null>(null);
  const [biasExplanation, setBiasExplanation] = useState<BiasExplanationAI | null>(null);
  const [fixRecommendation, setFixRecommendation] = useState<FixRecommendationAI | null>(null);

  return (
    <AppContext.Provider value={{ 
      data, setData, 
      config, setConfig, 
      result, setResult, 
      user, loading,
      datasetAnalysis, setDatasetAnalysis,
      biasExplanation, setBiasExplanation,
      fixRecommendation, setFixRecommendation
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
