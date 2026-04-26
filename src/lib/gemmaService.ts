import { GoogleGenerativeAI } from "@google/generative-ai";
import { AuditResult, GemmaAnalysis, ChatMessage } from './types';

// The model to use for analysis
const MODEL_NAME = "gemini-3-flash-preview";

export async function analyzeWithGemma(auditResult: AuditResult): Promise<GemmaAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  const prompt = `You are an expert in algorithmic fairness and AI bias detection. Analyze the following bias audit results from a real dataset and provide a detailed, specific assessment.

AUDIT DATA:
- Dataset: ${auditResult.config.datasetName} with ${auditResult.rowCount} rows
- Composite Bias Risk Score: ${auditResult.score}/100 (${auditResult.riskLevel} risk)
- Protected attributes analyzed: ${auditResult.config.protectedAttributes.join(', ')}

DISPARATE IMPACT FINDINGS:
${auditResult.disparateImpactFindings.map(f => `- Group '${f.group}' of '${f.attribute}': outcome rate ${f.outcomeRate.toFixed(1)}%, Disparate Impact Ratio ${f.disparateImpactRatio.toFixed(2)}. ${f.flagged ? 'Flagged' : 'Within range'}`).join('\n')}

AMPLIFICATION:
- Input data disparity: ${auditResult.inputDisparity.toFixed(2)}
- Model would amplify this to: ${auditResult.simulatedOutputDisparity.toFixed(2)}  
- Amplification factor: ${auditResult.amplificationFactor.toFixed(1)}x

PROXY CORRELATIONS (top 5 by strength):
${auditResult.proxyMap.sort((a,b) => Math.abs(b.correlation) - Math.abs(a.correlation)).slice(0, 5).map(p => `- Feature '${p.feature}' correlates with '${p.protectedAttribute}' at r=${p.correlation.toFixed(2)} — ${p.proxyStrength} proxy`).join('\n')}

Respond in this exact JSON format with no markdown, no backticks, just raw JSON:
{
  "executiveSummary": "2-3 sentence plain-language summary of the most critical bias findings.",
  "keyFindings": [
    {
      "severity": "critical|high|medium|low",
      "finding": "Specific finding in one sentence",
      "evidence": "The specific numbers that prove this",
      "realWorldImpact": "What this means for real people in concrete terms"
    }
  ],
  "rootCauseAnalysis": "Explanation of historical/systemic factors",
  "legalRisk": "Assessment of legal exposure",
  "prioritizedRecommendations": [
    {
      "priority": 1,
      "action": "Specific action",
      "rationale": "Why",
      "effort": "low|medium|high",
      "expectedImpact": "Metric improvement"
    }
  ],
  "confidenceNote": "Caveats about the data"
}`;

  try {
    const model = genAI.getGenerativeModel({ 
      model: MODEL_NAME,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemma Analysis Error:", error);
    return {
      executiveSummary: "AI analysis temporarily unavailable. Please review the quantitative findings above.",
      keyFindings: [],
      rootCauseAnalysis: "Analysis failed to load.",
      legalRisk: "Analysis failed to load.",
      prioritizedRecommendations: [],
      confidenceNote: "Model reached a limit or encountered an error."
    };
  }
}

export async function chatWithGemma(
  userMessage: string,
  auditResult: AuditResult,
  messageHistory: ChatMessage[]
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "API Key missing.";

  const genAI = new GoogleGenerativeAI(apiKey);
  
  const systemContext = `You are an AI bias analyst. The user has run a bias audit on '${auditResult.config.datasetName}'.
Risk Score: ${auditResult.score}/100. Verdict: ${auditResult.verdict}.
Findings Summary: ${auditResult.disparateImpactFindings.length} groups analyzed. ${auditResult.disparateImpactFindings.filter(f => f.flagged).length} flagged.
Input Disparity: ${auditResult.inputDisparity.toFixed(2)}. 
Answer specifically using these numbers. Be direct and use plain language.`;

  try {
    const model = genAI.getGenerativeModel({ 
      model: MODEL_NAME,
      systemInstruction: systemContext
    });

    const chat = model.startChat({
      history: messageHistory.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      })),
    });

    const result = await chat.sendMessage(userMessage);
    return result.response.text() || "No response from AI.";
  } catch (error) {
    console.error("Chat Error:", error);
    return "Something went wrong chatting with Gemma.";
  }
}
