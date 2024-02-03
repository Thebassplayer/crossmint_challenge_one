type Position = { row: string; column: string };
type AstralObjectRequest = {
  method: string;
  headers: Record<string, string>;
  body: string;
};

type Polyanet = {
  row: string;
  column: string;
  candidateId: string;
};

type SoloonsColors = "blue" | "red" | "purple" | "white";

type Soloon = {
  row: string;
  column: string;
  candidateId: string;
  color: SoloonsColors;
};

type ComethDirection = "up" | "down" | "right" | "left";

type Cometh = {
  row: string;
  column: string;
  candidateId: string;
  direction: ComethDirection;
};

type ObjectType = "polyanets" | "soloons" | "comeths";

export type {
  Position,
  AstralObjectRequest,
  Polyanet,
  Soloon,
  Cometh,
  ObjectType,
  ComethDirection,
  SoloonsColors,
};
