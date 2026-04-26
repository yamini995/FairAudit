export interface Row {
  [key: string]: string | number;
}

export interface AuditConfig {
  datasetName: string;
  outcomeColumn: string;
  positiveValue: string;
  protectedAttributes: string[];
  featureColumns: string[];
}

export interface DisparateImpactFinding {
  attribute: string;
  group: string;
  outcomeRate: number;
  overallRate: number;
  disparateImpactRatio: number;
  flagged: boolean;
}

export interface RepresentationMetric {
  attribute: string;
  group: string;
  count: number;
  percentage: number;
  outcomeRate: number;
  status: 'fair' | 'review' | 'critical';
  explanation: string;
}

export interface FairnessMetric {
  name: string;
  value: number;
  status: 'fair' | 'review' | 'critical';
  description: string;
  idealValue: string;
}

export interface ProxyFeature {
  feature: string;
  protectedAttribute: string;
  correlation: number;
  proxyStrength: 'none' | 'moderate' | 'strong';
}

export interface DatasetAnalysisAI {
  disadvantaged_group: string;
  representation_warnings: string[];
  approval_rate_warnings: string[];
  overall_data_health: 'CLEAN' | 'NEEDS REVIEW' | 'CRITICALLY BIASED';
  summary: string;
}

export interface MetricExplanation {
  score: number;
  severity: 'PASS' | 'WARNING' | 'FAIL';
  plain_meaning: string;
  consequence: string;
}

export interface BiasExplanationAI {
  demographic_parity: MetricExplanation;
  disparate_impact: MetricExplanation;
  equalized_odds: MetricExplanation;
  overall_verdict: 'SAFE TO DEPLOY' | 'NEEDS REVIEW' | 'DO NOT DEPLOY';
  verdict_reason: string;
}

export interface FixRecommendationAI {
  primary_technique: string;
  primary_reason: string;
  backup_technique: string;
  backup_reason: string;
  expected_improvement: string;
  risk_note: string;
}

export interface AuditResult {
  config: AuditConfig;
  rowCount: number;
  score: number;
  riskLevel: 'low' | 'medium' | 'high';
  verdict: string;
  disparateImpactFindings: DisparateImpactFinding[];
  representationMetrics: RepresentationMetric[];
  fairnessMetrics: FairnessMetric[];
  inputDisparity: number;
  simulatedOutputDisparity: number;
  amplificationFactor: number;
  proxyMap: ProxyFeature[];
  dpd: number;
  dir: number;
  eod: number;
  advantagedGroup?: string;
  disadvantagedGroup?: string;
}

export interface Suggestion {
  priority: 1 | 2 | 3;
  title: string;
  explanation: string;
  effort: 'low' | 'medium' | 'high';
  category: 'data' | 'model' | 'process';
}

export interface GemmaFinding {
  severity: 'critical' | 'high' | 'medium' | 'low';
  finding: string;
  evidence: string;
  realWorldImpact: string;
}

export interface GemmaRecommendation {
  priority: number;
  action: string;
  rationale: string;
  effort: 'low' | 'medium' | 'high';
  expectedImpact: string;
}

export interface GemmaAnalysis {
  executiveSummary: string;
  keyFindings: GemmaFinding[];
  rootCauseAnalysis: string;
  legalRisk: string;
  prioritizedRecommendations: GemmaRecommendation[];
  confidenceNote: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
