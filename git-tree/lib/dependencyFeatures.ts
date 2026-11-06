export const dependencyFeatureLabels = {
  authentication: "Authentication",
  authorization: "Authorization",
  data: "Data & persistence",
  ai: "AI features",
  github: "GitHub integration",
  api: "API layer",
  interface: "Interface",
  infrastructure: "Infrastructure",
  core: "Core logic",
} as const;

export type DependencyFeature = keyof typeof dependencyFeatureLabels;

const FEATURE_SIGNALS: Array<{ feature: DependencyFeature; pattern: RegExp }> = [
  { feature: "authorization", pattern: /\bauthori[sz](?:e|ation)|\bpermission(?:s)?\b|\brbac\b|\bacl\b|\baccess[ _-]?control\b|\brole(?:s)?\b/i },
  { feature: "authentication", pattern: /\bauth(?:entication)?\b|\bnextauth\b|\boauth\b|\bsign[ -]?in\b|\blog[ -]?in\b|\bsession(?:s)?\b|\bidentity\b/i },
  { feature: "ai", pattern: /\bopenai\b|\banthropic\b|\bgemini\b|\blanguage model\b|\bstreamText\b|\bai-sdk\b/i },
  { feature: "github", pattern: /\bgithub\b|\boctokit\b|\bgithub\.com\b/i },
  { feature: "data", pattern: /\bsupabase\b|\bpostgres(?:ql)?\b|\bdatabase\b|\bprisma\b|\bmongo(?:db)?\b|\bredis\b|\bpersistence\b/i },
];

export function classifyDependencyFeature(path: string, content: string): DependencyFeature {
  const source = `${path}\n${content}`;
  const matchedFeature = FEATURE_SIGNALS.find(({ pattern }) => pattern.test(source));
  if (matchedFeature) return matchedFeature.feature;

  if (/(^|\/)api(\/|$)|\/route\.[jt]sx?$/.test(path)) return "api";
  if (/(^|\/)(components?|pages?|app)(\/|$)|\.(jsx|tsx)$/.test(path)) return "interface";
  if (/(^|\/)(config|scripts?|infra|deploy|migrations?)(\/|$)|\.(config|setup)\.[jt]s$/.test(path)) return "infrastructure";

  return "core";
}
