import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './canvas.component.html',
  styleUrl: './canvas.scss'
})
export class CanvasComponent {

  rects: {
    x: number;
    y: number;
    width: number;
    height: number;
    fill: string;
    stroke: string;
    strokeWidth: number;
  }[] = [];

  polygons: {
    points: string;
    fill: string;
    stroke: string;
    strokeWidth: number;
  }[] = [];

  addingRectangle = false;
  addingStar = false;

  adding(shape: string) {
    if(shape == 'rectangle' && !this.addingRectangle) {
      this.addingRectangle = true;
      this.addingStar = false;
    } else if(shape == 'star' && !this.addingStar){
      this.addingStar = true;
      this.addingRectangle = false;
    } else {
      this.addingRectangle = false;
      this.addingStar = false;
    }
  }

  addRectangle(cursorpt: SVGPoint) {
    this.addingRectangle = true;
    const newRect = {
      x: cursorpt.x - 100 / 2,
      y: cursorpt.y - 50 / 2,
      width: 100,
      height: 50,
      fill: 'skyblue',
      stroke: 'black',
      strokeWidth: 2
    };
    this.rects.push(newRect);
  }
  
  addStar(cursorpt: SVGPoint) {
    this.addingStar = true;
    const offset = this.polygons.length * 40;
    const centerX = cursorpt.x;
    const centerY = cursorpt.y;
    const outerRadius = 40;
    const innerRadius = 20;
    const numPoints = 5;
  
    const points = this.generateStarPoints(centerX, centerY, outerRadius, innerRadius, numPoints);
  
    const newPolygon = {
      points,
      fill: 'gold',
      stroke: 'black',
      strokeWidth: 2
    };
  
    this.polygons.push(newPolygon);
  }

  onSvgClick(event: MouseEvent) {

    if(!this.addingRectangle && !this.addingStar) {
      return;
    }

    const svg = (event.target as SVGElement).closest('svg');
    if(!svg) return;

    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const cursorpt = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    if(this.addingRectangle) {
      this.addRectangle(cursorpt);
    } else {
      this.addStar(cursorpt);
    }
  }

  generateStarPoints(
    centerX: number,
    centerY: number,
    outerRadius: number,
    innerRadius: number,
    numPoints: number
  ): string {
    const angleStep = (Math.PI * 2) / (numPoints * 2);
    const points: string[] = [];
  
    for (let i = 0; i < numPoints * 2; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      points.push(`${x},${y}`);
    }
  
    return points.join(' ');
  }
  
}
