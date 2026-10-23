export interface Country {
  name: string;
  path: string;
}
export type Countries = Readonly<Record<string, Country>>;
export type CountryId = string;
export type Direction = 'prev' | 'next';
export type Outcome = 'win' | 'loss';
export interface Score {
  user: string;
  result: number;
  time: number;
  rights: CountryId[];
  wrongs: CountryId[];
}
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
