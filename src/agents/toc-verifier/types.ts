export interface VerificationResult {
  nodeId: string;
  title: string;
  pageStart: number;
  verified: boolean;
  confidence: number;
  appearsAtStart?: boolean;
}
