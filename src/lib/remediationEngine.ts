import { AuditResult, Suggestion } from './types';

export function getRemediationSuggestions(result: AuditResult): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // Low DIR suggestions
  const flaggedFindings = result.disparateImpactFindings.filter(f => f.flagged && f.disparateImpactRatio < 0.8);
  if (flaggedFindings.length > 0) {
    const attrs = Array.from(new Set(flaggedFindings.map(f => f.attribute)));
    attrs.forEach(attr => {
      suggestions.push({
        priority: 1,
        title: `Re-balance training data for ${attr}`,
        explanation: `${attr} groups are significantly underrepresented in positive outcomes. Consider oversampling these groups or re-weighting their samples to ensure the model doesn't learn these historical skews.`,
        effort: 'medium',
        category: 'data'
      });
    });
  }

  // Amplification suggestions
  if (result.amplificationFactor > 1.2) {
    suggestions.push({
      priority: 1,
      title: "Apply fairness constraints at inference time",
      explanation: "The model is likely to amplify existing skew. Implementing techniques like Equalized Odds or Demographic Parity during model selection can help mitigate this behavior.",
      effort: 'high',
      category: 'model'
    });
  }

  // Proxy suggestions
  const strongProxies = result.proxyMap.filter(p => p.proxyStrength === 'strong');
  strongProxies.forEach(p => {
    suggestions.push({
      priority: 2,
      title: `Remove or de-correlate '${p.feature}'`,
      explanation: `'${p.feature}' is acting as a strong proxy for '${p.protectedAttribute}' (correlation: ${p.correlation.toFixed(2)}). Even if you remove the protected attribute, the model will recreate the bias through this feature.`,
      effort: 'medium',
      category: 'model'
    });
  });

  const moderateProxies = result.proxyMap.filter(p => p.proxyStrength === 'moderate');
  moderateProxies.forEach(p => {
    suggestions.push({
      priority: 3,
      title: `Monitor '${p.feature}' for proxy effects`,
      explanation: `'${p.feature}' shows moderate correlation with '${p.protectedAttribute}'. While not a strong proxy yet, it should be monitored as the model evolves or the data distribution shifts.`,
      effort: 'low',
      category: 'process'
    });
  });

  // Global suggestion
  suggestions.push({
    priority: 3,
    title: "Establish a bias monitoring pipeline",
    explanation: "Bias is not a one-time check. Automated triggers should run these audits every time a model is retrained or deployed to new segments.",
    effort: 'low',
    category: 'process'
  });

  return suggestions;
}
