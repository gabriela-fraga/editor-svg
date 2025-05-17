export interface Shape {
  type: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  x: number;
  y: number;
  rx?: number;
  ry?: number;
  width?: number;
  height?: number;
  points?: string;
}