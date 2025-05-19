import { CommonModule } from '@angular/common';
import { Component, effect, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { Shape } from './shape';

export type Point = { x: number; y: number };

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './canvas.component.html',
  styleUrl: './canvas.scss'
})
export class CanvasComponent implements OnInit{
  
  shapes: Shape[] = [];
  addingRectangle = false;
  addingStar = false;
  shapeType = signal<string>('');
  form: FormGroup;
  currentShape: Shape = {
    type: '',
    fill: '',
    stroke: '',
    strokeWidth: 0,
    x: 0,
    y: 0
  };
  roundControl: FormControl = new FormControl(0);
  starPoints: FormControl = new FormControl(5);
  starSlider: FormControl = new FormControl(25);
  strokeWidth: FormControl = new FormControl(2);

  draggingShape: Shape | null = null;
  initialMouse: { x: number; y: number } | null = null;
  offsetX = 0;
  offsetY = 0;

  constructor(private fb: FormBuilder) {
    this.form = new FormGroup({});
  
    this.roundControl.valueChanges.subscribe((val) => {
      const value = val ?? 0;
      if (this.currentShape && this.currentShape.type == 'rectangle') {
        this.currentShape.rx = value;
        this.currentShape.ry = value;
      }
      localStorage.setItem('svgShapes', JSON.stringify(this.shapes));
    });

    this.starPoints.valueChanges.subscribe(() => {
      this.updateStar();
    });

    this.starSlider.valueChanges.subscribe(() => {
      this.updateStar();
    });

    this.strokeWidth.valueChanges.subscribe((val) => {
      const value = val ?? 0;
      if (this.currentShape) {
        this.currentShape.strokeWidth = value;
      }
      localStorage.setItem('svgShapes', JSON.stringify(this.shapes));
    });
  
    effect(() => {
      const shape = this.shapeType();
  
      if (shape === 'rectangle') {
        this.form = this.fb.group({
          roundControl: this.roundControl,
          strokeWidth: this.strokeWidth
        });
      } else if (shape === 'star') {
        this.form = this.fb.group({
          starPoints: this.starPoints,
          starSlider: this.starSlider,
          strokeWidth: this.strokeWidth
        });
      } else {
        this.form = new FormGroup({});
      }
    });
  }

  ngOnInit(): void {
    const savedShapes = localStorage.getItem('svgShapes');
    if (savedShapes) {
      this.shapes = JSON.parse(savedShapes);
    }
  }  

  addingShape(shape: string) {
    if(shape == 'rectangle' && !this.addingRectangle) {
      this.addingRectangle = true;
      this.addingStar = false;
    } else if(shape == 'star' && !this.addingStar){
      this.addingStar = true;
      this.addingRectangle = false;
    } else {
      this.addingRectangle = false;
      this.addingStar = false;
      this.shapeType.set('');
    }
  }

  addRectangle(cursorpt: SVGPoint) {
    this.addingRectangle = true;
    const newRect: Shape = {
      x: cursorpt.x - 100 / 2,
      y: cursorpt.y - 50 / 2,
      rx: this.roundControl.value ?? 0,
      ry: this.roundControl.value ?? 0,
      width: 100,
      height: 50,
      fill: 'skyblue',
      stroke: 'black',
      strokeWidth: 2,
      type: 'rectangle'
    };
    this.shapes.push(newRect);
    this.currentShape = newRect;
    localStorage.setItem('svgShapes', JSON.stringify(this.shapes));
  }
  
  addStar(cursorpt: SVGPoint) {
    const centerX = cursorpt.x;
    const centerY = cursorpt.y;
    const points = this.calculateStar(centerX, centerY);
  
    const newPolygon: Shape = {
      points,
      fill: 'gold',
      stroke: 'black',
      strokeWidth: 2,
      type: 'star',
      x: centerX,
      y: centerY
    };
  
    this.shapes.push(newPolygon);
    this.currentShape = newPolygon;
    localStorage.setItem('svgShapes', JSON.stringify(this.shapes));
  }

  updateStar() {
    if (this.currentShape?.type !== 'star') return;

    this.currentShape.points = this.calculateStar(this.currentShape.x, this.currentShape.y);
    localStorage.setItem('svgShapes', JSON.stringify(this.shapes));
  }

  calculateStar(x: number, y:number) {
    const outer = 100 - (this.starSlider.value ?? 0);
    const inner = this.starSlider.value ?? 0;
    const numPoints = this.starPoints.value ?? 5;

    const points = this.generateStarPoints(x, y, outer, inner, numPoints);

    return points;
  }

  deleteShape() {
    const index = this.shapes.indexOf(this.currentShape);
    if (index > -1) {
      this.shapes.splice(index, 1);
    }
    this.resetShape();
    this.shapeType.set('');
    localStorage.setItem('svgShapes', JSON.stringify(this.shapes));
  }

  onSvgClick(event: MouseEvent) {

    if(!this.addingRectangle && !this.addingStar) {
      return;
    }

    if(this.currentShape.type === 'rectangle' || this.currentShape.type === 'star') {
      this.resetShape();
    }

    const svg = (event.target as SVGElement).closest('svg');
    if(!svg) return;

    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const cursorpt = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    if(this.addingRectangle) {
      this.shapeType.set('rectangle');
      this.addRectangle(cursorpt);
    } else {
      this.shapeType.set('star');
      this.addStar(cursorpt);
    }
  }

  onShapeClicked(clickedShape: Shape) {
    this.currentShape = clickedShape;
    this.shapeType.set(this.currentShape.type);
  }

  resetShape() {
    this.currentShape = {
      type: '',
      fill: '',
      stroke: '',
      strokeWidth: 0,
      x: 0,
      y: 0
    };
    this.form.controls['roundControl']?.setValue(0);
    this.form.controls['starPoints']?.setValue(5);
    this.form.controls['starSlider']?.setValue(25);
    this.form.controls['strokeWidth']?.setValue(2);
  }

  generateStarPoints(
    centerX: number,
    centerY: number,
    outerRadius: number,
    innerRadius: number,
    numPoints: number
  ): Point[] {
    const angleStep = (Math.PI * 2) / (numPoints * 2);
    const points: Point[] = [];
  
    for (let i = 0; i < numPoints * 2; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      points.push({ x, y });
    }
  
    return points;
  }
  
  getPolygonPoints(points?: Point[]): string {
    if (!points) return '';
    return points.map(p => `${p.x},${p.y}`).join(' ');
  }

  onMouseDown(event: MouseEvent, shape: Shape) {
    event.preventDefault();
  
    this.draggingShape = shape;
  
    const svg = (event.target as SVGElement).ownerSVGElement!;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const cursorpt = pt.matrixTransform(svg.getScreenCTM()!.inverse());
  
    if(shape.type == 'rectangle') {
      this.offsetX = cursorpt.x - shape.x;
      this.offsetY = cursorpt.y - shape.y;
    } else {
      this.initialMouse = { x: cursorpt.x, y: cursorpt.y };
    }
    
  }
  
  onMouseMove(event: MouseEvent) {
    if (!this.draggingShape) return;
  
    const svg = (event.target as SVGElement).ownerSVGElement!;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const cursorpt = pt.matrixTransform(svg.getScreenCTM()!.inverse());

    if(this.draggingShape.type == 'rectangle') {      
      this.draggingShape.x = cursorpt.x - this.offsetX;
      this.draggingShape.y = cursorpt.y - this.offsetY;
    } else if (this.initialMouse && this.draggingShape.type === 'star') {
      const dx = cursorpt.x - this.initialMouse.x;
      const dy = cursorpt.y - this.initialMouse.y;
    
      if (Array.isArray(this.draggingShape.points)) {
        this.draggingShape.points = this.draggingShape.points.map(p => ({
          x: p.x + dx,
          y: p.y + dy
        }));
      }
    
      this.draggingShape.x += dx;
      this.draggingShape.y += dy;
      this.initialMouse = { x: cursorpt.x, y: cursorpt.y };
    }
  }
  
  onMouseUp() {
    localStorage.setItem('svgShapes', JSON.stringify(this.shapes));
    this.draggingShape = null;
    this.initialMouse = null;
  }

}
