export interface Country {
  name: {
    common: string;
    official?: string;
    nativeName?: Record<string, { common: string; official: string }>;
  };
  flags: {
    png: string;
    alt?: string;
  };
  capital?: string[];
  region?: string;
  subregion?: string;
  population: number;
  tld?: string[];
  languages?: Record<string, string>;
  currencies?: Record<string, { name: string; symbol?: string }>;
  borders?: string[];
}
