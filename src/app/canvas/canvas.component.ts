import { CommonModule } from '@angular/common';
import { Component, effect, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { Shape } from './shape';

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
export class CanvasComponent {

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
  maxStarSlider = signal(100);

  constructor(private fb: FormBuilder) {
    this.form = new FormGroup({});
  
    this.roundControl.valueChanges.subscribe((val) => {
      const value = val ?? 0;
      if (this.currentShape && this.currentShape.type == 'rectangle') {
        this.currentShape.rx = value;
        this.currentShape.ry = value;
      }
    });

    this.starPoints.valueChanges.subscribe(() => {
      this.updateStar();
    });

    this.starSlider.valueChanges.subscribe(() => {
      this.updateStar();
    });
  
    effect(() => {
      const shape = this.shapeType();
  
      if (shape === 'rectangle') {
        this.form = this.fb.group({
          roundControl: this.roundControl,
        });
      } else if (shape === 'star') {
        this.form = this.fb.group({
          starPoints: this.starPoints,
          starSlider: this.starSlider,
        });
      } else {
        this.form = new FormGroup({});
      }
    });
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
  }
  
  addStar(cursorpt: SVGPoint) {
    this.addingStar = true;
    const centerX = cursorpt.x;
    const centerY = cursorpt.y;  
    const points = this.calculateStar(centerX, centerY)

  
    const newPolygon = {
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
  }

  updateStar() {
    if (this.currentShape?.type !== 'star') return;

    this.currentShape.points = this.calculateStar(this.currentShape.x, this.currentShape.y);
  }

  calculateStar(x: number, y:number) {
    const outer = 100 - (this.starSlider.value ?? 0);
    const inner = this.starSlider.value ?? 0;
    const numPoints = this.starPoints.value ?? 5;

    const points = this.generateStarPoints(x, y, outer, inner, numPoints);

    return points;
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
