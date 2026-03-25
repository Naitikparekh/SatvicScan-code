export type ClaudeVerdict = 'SAFE' | 'NOT_SAFE' | 'CAUTION';

export type ClaudeFlag = {
  type: 'bad' | 'caution' | 'good';
  ingredient: string;
  reason: string;
};

export type ClaudeDietResult = {
  verdict: ClaudeVerdict;
  productName: string;
  summary: string;
  flags: ClaudeFlag[];
  ambiguous: string[];
  analysis: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
};

export type ScanMode = 'photo' | 'barcode' | 'manual';

export type ScanHistoryItem = {
  id: string;
  createdAt: number;
  mode: ScanMode;
  inputPreview: string;
  result: ClaudeDietResult;
};

export type OpenFoodFactsProduct = {
  productName: string | null;
  brands: string | null;
  ingredientsText: string | null;
};
