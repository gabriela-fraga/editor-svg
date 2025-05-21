import { Point } from "./canvas.component";

export interface Shape {
  type: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  x: number;
  y: number;
  scale: number;
  rx?: number;
  ry?: number;
  width?: number;
  height?: number;
  points?: Point[];
  starAngle?: number;
  starPoints?: number;
}