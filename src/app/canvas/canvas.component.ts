import { CommonModule } from '@angular/common';
import { Component, effect, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { Shape } from './shape';
import { ColorPickerModule, ColorPickerService } from 'ngx-color-picker';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { environment } from '../../environments/environments';

export type Point = { x: number; y: number };

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ColorPickerModule
  ],
  templateUrl: './canvas.component.html'
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
    y: 0,
    scale: 1
  };
  roundControl: FormControl = new FormControl(0);
  starPoints: FormControl = new FormControl(5);
  starSlider: FormControl = new FormControl(25);
  shapeScale: FormControl = new FormControl(1);
  strokeWidth: FormControl = new FormControl(2);
  strokeColorControl: FormControl = new FormControl('#000000');
  fillColorControl: FormControl = new FormControl('#FFFFFF');

  strokeColor: string = '#000000';
  fillColor: string = '#FFFFFF';
  draggingShape: Shape | null = null;
  initialMouse: { x: number; y: number } | null = null;
  offsetX = 0;
  offsetY = 0;
  scale = 1;
  hasClickedShape = false;

  constructor(private fb: FormBuilder, private cpService: ColorPickerService) {
    this.form = new FormGroup({});  
    this.trackForm();  
    this.buildForm();
  }

  ngOnInit(): void {
    const savedShapes = localStorage.getItem('svgShapes');
    if (savedShapes) {
      this.shapes = JSON.parse(savedShapes);
    }
  }  

  /** Marca os formControls do formulário de edição das formas para observar as alterações */
  trackForm() {
    this.roundControl.valueChanges.subscribe((val) => {
      if(!this.hasClickedShape) {
        const value = val ?? 0;
        if (this.currentShape && this.currentShape.type == 'rectangle') {
          this.currentShape.rx = value;
          this.currentShape.ry = value;
        }
        localStorage.setItem('svgShapes', JSON.stringify(this.shapes));
      }
    });

    this.starPoints.valueChanges.pipe(
      debounceTime(environment.test ? 0 : 300),
      distinctUntilChanged()
    ).subscribe((val) => {
      let value = val;
      if(!this.hasClickedShape) {
        if (!val || val < 3) {
          this.form.get('starPoints')?.setValue(3, { emitEvent: false });
          value = 3;
        }
        if (!val || val > 20) {
          this.form.get('starPoints')?.setValue(20, { emitEvent: false });
          value = 20;
        }
        this.currentShape.starPoints = value;
        this.updateStar();
      }
    });

    this.starSlider.valueChanges.subscribe((val) => {
      if (!this.hasClickedShape) {
        this.currentShape.starAngle = val;
        this.updateStar();
      }
    });

    this.shapeScale.valueChanges.subscribe((val) => {
      if (!this.hasClickedShape) {
        const scale = val ?? 1;
        if(this.currentShape && this.currentShape.type === 'rectangle') {
          this.scaleRect(scale);
        } else if (this.currentShape && this.currentShape.type === 'star') {
          this.scalePolygon(this.currentShape.points!, scale);
        }
        localStorage.setItem('svgShapes', JSON.stringify(this.shapes));
      }
    });

    this.strokeWidth.valueChanges.pipe(
      debounceTime(environment.test ? 0 : 300),
      distinctUntilChanged()
    ).subscribe((val) => {
      let value = val;
      if(!this.hasClickedShape) {
        if (!val || val < 1) {
          this.form.get('strokeWidth')?.setValue(1, { emitEvent: false });
          value = 1;
        }
        this.currentShape.strokeWidth = value;
        this.updateStar();
        localStorage.setItem('svgShapes', JSON.stringify(this.shapes));
      }
    });

    this.strokeColorControl.valueChanges.subscribe((val) => {
      if (!this.hasClickedShape) {
        const value = val ?? '#000000';
        if (this.currentShape) {
          this.currentShape.stroke = value;
        }
        localStorage.setItem('svgShapes', JSON.stringify(this.shapes));
      }
    });

    this.fillColorControl.valueChanges.subscribe((val) => {
      if (!this.hasClickedShape) {
        const value = val ?? '#FFFFFF';
        if (this.currentShape) {
          this.currentShape.fill = value;
        }
        localStorage.setItem('svgShapes', JSON.stringify(this.shapes));
      }
    });
  }

  /** Constrói o formulário de acordo com o tipo de forma */
  buildForm() {
    effect(() => {
      const shape = this.shapeType();
  
      if (shape === 'rectangle') {
        this.form = this.fb.group({
          roundControl: this.roundControl,
          strokeWidth: this.strokeWidth,
          strokeColor: this.strokeColorControl,
          fillColor: this.fillColorControl,
          shapeScale: this.shapeScale,
        });
      } else if (shape === 'star') {
        this.form = this.fb.group({
          starPoints: this.starPoints,
          starSlider: this.starSlider,
          strokeWidth: this.strokeWidth,
          strokeColor: this.strokeColorControl,
          fillColor: this.fillColorControl,
          shapeScale: this.shapeScale,
        });
      } else {
        this.form = new FormGroup({});
      }
    });
  }

  /** Ativa o modo de adição de forma */
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
      fill: '#FFFFFF',
      stroke: '#000000',
      strokeWidth: 2,
      type: 'rectangle',
      scale: 1
    };
    this.fillColor = "#FFFFFF";
    this.strokeColor = "#000000";
    this.shapes.push(newRect);
    this.currentShape = newRect;
    this.addingRectangle = false;
    localStorage.setItem('svgShapes', JSON.stringify(this.shapes));
  }
  
  addStar(cursorpt: SVGPoint) {
    const centerX = cursorpt.x;
    const centerY = cursorpt.y;
    const points = this.calculateStar(centerX, centerY);
  
    const newPolygon: Shape = {
      points,
      fill: '#FFFFFF',
      stroke: '#000000',
      strokeWidth: 2,
      type: 'star',
      x: centerX,
      y: centerY,
      scale: 1,
      starPoints: 5,
      starAngle: 25
    };
  
    this.fillColor = "#FFFFFF";
    this.strokeColor = "#000000";
    this.shapes.push(newPolygon);
    this.currentShape = newPolygon;
    this.addingStar = false;
    localStorage.setItem('svgShapes', JSON.stringify(this.shapes));
  }

  updateStar() {
    if (this.currentShape?.type !== 'star') return;

    this.currentShape.points = this.calculateStar(this.currentShape.x, this.currentShape.y);
    localStorage.setItem('svgShapes', JSON.stringify(this.shapes));
  }

  calculateStar(x: number, y: number): Point[] {
    const outer = (100 - (this.starSlider.value ?? 0)) * this.currentShape.scale;
    const inner = (this.starSlider.value ?? 0) * this.currentShape.scale;
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

  deleteAll() {
    this.shapes = [];
    this.resetShape();
    this.shapeType.set('');
    localStorage.setItem('svgShapes', JSON.stringify(this.shapes));
  }

  scaleRect(scale: number) {
    const originalWidth = (this.currentShape.width ?? 0) / (this.currentShape.scale ?? 1);
    const originalHeight = (this.currentShape.height ?? 0) / (this.currentShape.scale ?? 1);

    this.currentShape.scale = scale;
    const newWidth = originalWidth * scale;
    const newHeight = originalHeight * scale;

    const dx = (newWidth - (this.currentShape.width ?? 0)) / 2;
    const dy = (newHeight - (this.currentShape.height ?? 0)) / 2;

    this.currentShape.width = newWidth;
    this.currentShape.height = newHeight;
    this.currentShape.x -= dx;
    this.currentShape.y -= dy;
  }

  scalePolygon(points: Point[], newScale: number): void {
    const oldScale = this.currentShape.scale ?? 1;
    const centerX = this.currentShape.x;
    const centerY = this.currentShape.y;
  
    const scaleFactor = newScale / oldScale;
  
    const newPoints = points.map(p => ({
      x: centerX + (p.x - centerX) * scaleFactor,
      y: centerY + (p.y - centerY) * scaleFactor
    }));
  
    this.currentShape.points = newPoints;
    this.currentShape.scale = newScale;
  }
  

  onSvgClick(event: MouseEvent) {

    if(!event.target || (!this.addingRectangle && !this.addingStar)) {
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
    this.hasClickedShape = true;
    this.currentShape = clickedShape;

    this.shapeType.set(this.currentShape.type);

    if(this.currentShape.type === 'rectangle') {
      this.roundControl.setValue(this.currentShape.rx);
    } else if(this.currentShape.points){
      this.starPoints.setValue(this.currentShape.starPoints);
      this.starSlider.setValue(this.currentShape.starAngle);   
    }
    
    this.strokeWidth.setValue(this.currentShape.strokeWidth);
    this.strokeColorControl.setValue(this.currentShape.stroke);
    this.strokeColor = this.currentShape.stroke;
    this.fillColorControl.setValue(this.currentShape.fill);
    this.fillColor = this.currentShape.fill;
    this.shapeScale.setValue(this.currentShape.scale);
    this.hasClickedShape = false;
    
  }

  resetShape() {
    this.currentShape = {
      type: '',
      fill: '',
      stroke: '',
      strokeWidth: 0,
      x: 0,
      y: 0,
      scale: 1
    };
    this.scale = 1;
    this.form.controls['roundControl']?.setValue(0);
    this.form.controls['starPoints']?.setValue(5);
    this.form.controls['starSlider']?.setValue(25);
    this.form.controls['strokeWidth']?.setValue(2);
    this.form.controls['strokeColor']?.setValue('#000000');
    this.form.controls['fillColor']?.setValue('#FFFFFF');
    this.form.controls['shapeScale']?.setValue(1);
    this.shapeType.set('')

  }

  /** Método auxiliar que gera o array de pontos que compõem as pontas da estrela */
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
  
  /** Mapeia os pontos da estrela para o formato esperado pelo <polygon>*/
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

  onStrokeColorChange(color: string): void {
    this.strokeColor = color;
    this.currentShape.stroke = color;
    localStorage.setItem('svgShapes', JSON.stringify(this.shapes));
  }

  onFillColorChange(color: string): void {
    this.fillColor = color;
    this.currentShape.fill = color;
    localStorage.setItem('svgShapes', JSON.stringify(this.shapes));
  }
  
}
