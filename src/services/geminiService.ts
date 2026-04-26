import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { DatasetAnalysisAI, BiasExplanationAI, FixRecommendationAI, AuditResult } from "../lib/types";

// Initialize AI with the API key from environment
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const MODEL_NAME = "gemini-3-flash-preview";

export const geminiService = {
  /**
   * Prompt 1 — Dataset Analysis
   */
  async analyzeDataset(stats: {
    DATASET_STATS: string;
    OUTCOME_COLUMN: string;
    SENSITIVE_COLUMN: string;
    GROUP_COUNTS: string;
    APPROVAL_RATES: string;
  }): Promise<DatasetAnalysisAI> {
    const prompt = `You are an expert AI fairness auditor. A user has uploaded a dataset for bias analysis.

Here is a statistical summary of the dataset:
${stats.DATASET_STATS}

Outcome column: ${stats.OUTCOME_COLUMN}
Sensitive attribute column: ${stats.SENSITIVE_COLUMN}
Group breakdown: ${stats.GROUP_COUNTS}
Approval rate per group: ${stats.APPROVAL_RATES}

Your job:
1. Identify which group appears to be the disadvantaged group based on approval rates
2. Flag if any group has less than 15% representation — this is a representation crisis
3. Flag if the approval rate gap between the highest and lowest group exceeds 15 percentage points
4. Write a plain English warning for each problem found — assume the reader is a non-technical business manager, not a data scientist
5. Rate overall data health as: CLEAN / NEEDS REVIEW / CRITICALLY BIASED
6. Return ONLY valid JSON in this exact format, no extra text:

{
  "disadvantaged_group": "string",
  "representation_warnings": ["string"],
  "approval_rate_warnings": ["string"],
  "overall_data_health": "CLEAN | NEEDS REVIEW | CRITICALLY BIASED",
  "summary": "2-3 sentence plain English summary of what was found"
}`;

    try {
      const model = genAI.getGenerativeModel({ 
        model: MODEL_NAME,
        generationConfig: { responseMimeType: "application/json" }
      });
      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());
    } catch (error) {
      console.error("Gemini Error (P1):", error);
      throw error;
    }
  },

  /**
   * Prompt 2 — Bias Metrics Explanation
   */
  async explainBiasMetrics(result: AuditResult): Promise<BiasExplanationAI> {
    const prompt = `You are an AI fairness expert writing for a non-technical audience.

Here are the bias metric scores calculated for this dataset:

Metric 1 — Demographic Parity Difference: ${result.dpd.toFixed(4)}
(0 = perfectly fair, above 0.10 = concerning, above 0.20 = serious violation)

Metric 2 — Disparate Impact Ratio: ${result.dir.toFixed(4)}
(1.0 = perfectly fair, below 0.80 = legal red flag in most countries, below 0.50 = severe)

Metric 3 — Equalized Odds Difference: ${result.eod.toFixed(4)}
(0 = fair, above 0.10 = model misses qualified people from one group more than another)

Outcome column: ${result.config.outcomeColumn}
Sensitive attribute: ${result.config.protectedAttributes[0]}
Disadvantaged group: ${result.disadvantagedGroup}

For each metric:
- Give it a severity: PASS / WARNING / FAIL
- Write exactly one sentence explaining what this score means in real human terms
- Write exactly one sentence explaining the real-world consequence if this goes unfixed

Return ONLY valid JSON, no extra text:
{
  "demographic_parity": {
    "score": number,
    "severity": "PASS | WARNING | FAIL",
    "plain_meaning": "string",
    "consequence": "string"
  },
  "disparate_impact": {
    "score": number,
    "severity": "PASS | WARNING | FAIL",
    "plain_meaning": "string",
    "consequence": "string"
  },
  "equalized_odds": {
    "score": number,
    "severity": "PASS | WARNING | FAIL",
    "plain_meaning": "string",
    "consequence": "string"
  },
  "overall_verdict": "SAFE TO DEPLOY | NEEDS REVIEW | DO NOT DEPLOY",
  "verdict_reason": "string"
}`;

    try {
      const model = genAI.getGenerativeModel({ 
        model: MODEL_NAME,
        generationConfig: { responseMimeType: "application/json" }
      });
      const res = await model.generateContent(prompt);
      return JSON.parse(res.response.text());
    } catch (error) {
      console.error("Gemini Error (P2):", error);
      throw error;
    }
  },

  /**
   * Prompt 3 — Fix Recommendation
   */
  async recommendFix(result: AuditResult, repPct: number): Promise<FixRecommendationAI> {
    const prompt = `You are a machine learning fairness engineer. Based on the bias audit results below,
recommend the best bias mitigation technique for this specific situation.

Dataset size: ${result.rowCount} rows
Bias findings:
- Demographic Parity Difference: ${result.dpd.toFixed(4)}
- Disparate Impact Ratio: ${result.dir.toFixed(4)}
- Equalized Odds Difference: ${result.eod.toFixed(4)}
- Representation of disadvantaged group: ${repPct.toFixed(1)}%

Available techniques:
1. Reweighing — adjusts sample weights before training. Best when data imbalance is the root cause.
2. Equalized Odds Post-processing — adjusts decision thresholds after training. Best when you cannot retrain the model.
3. Disparate Impact Remover — transforms feature values. Best when features correlate with the sensitive attribute.

Rules for recommendation:
- If representation is below 20%, always recommend Reweighing first
- If DIR is below 0.6, recommend Reweighing
- If DPD is above 0.25 but DIR is above 0.7, recommend Equalized Odds Post-processing
- Recommend only ONE primary technique and one backup

Return ONLY valid JSON:
{
  "primary_technique": "string",
  "primary_reason": "string (one sentence, plain English)",
  "backup_technique": "string",
  "backup_reason": "string",
  "expected_improvement": "string (e.g. DPD should drop from 0.33 to under 0.10)",
  "risk_note": "string (one sentence — any trade-off the user should know about)"
}`;

    try {
      const model = genAI.getGenerativeModel({ 
        model: MODEL_NAME,
        generationConfig: { responseMimeType: "application/json" }
      });
      const res = await model.generateContent(prompt);
      return JSON.parse(res.response.text());
    } catch (error) {
      console.error("Gemini Error (P3):", error);
      throw error;
    }
  },

  /**
   * Prompt 4 — Report Generation
   */
  async generateFormalReport(data: {
    ORG_NAME: string;
    ROW_COUNT: number;
    OUTCOME_COLUMN: string;
    SENSITIVE_COLUMN: string;
    DATE: string;
    FULL_METRICS_JSON: string;
    FIX_NAME?: string;
    DPD_BEFORE?: number;
    DPD_AFTER?: number;
  }): Promise<string> {
    const prompt = `You are writing a professional AI bias audit report for a business executive audience.
This report will be printed and shared with regulators.

Organization context: ${data.ORG_NAME} (if provided, else "the organization")
Dataset: ${data.ROW_COUNT} rows, ${data.OUTCOME_COLUMN} as outcome, ${data.SENSITIVE_COLUMN} as sensitive attribute
Audit date: ${data.DATE}

Findings:
${data.FULL_METRICS_JSON}

${data.FIX_NAME ? `Fix applied: ${data.FIX_NAME}\nBefore DPD: ${data.DPD_BEFORE} → After DPD: ${data.DPD_AFTER}` : ''}

Write a formal audit report with these exact sections:
1. Executive Summary (3 sentences max)
2. Dataset Assessment (representation, data quality issues found)
3. Bias Findings (explain each metric in formal but accessible language)
4. Risk Assessment (what was the legal and human risk level)
5. Remediation Applied (what fix was used and did it work)
6. Recommendation (deploy / do not deploy / conditional deploy with conditions listed)

Tone: Professional, direct, no jargon, no bullet points — write in proper paragraphs.
Length: 350-450 words total.
Return plain text only, no JSON, no markdown formatting.`;

    try {
      const model = genAI.getGenerativeModel({ model: MODEL_NAME });
      const res = await model.generateContent(prompt);
      return res.response.text();
    } catch (error) {
      console.error("Gemini Error (P4):", error);
      return "Unable to generate formal report at this time.";
    }
  }
};
