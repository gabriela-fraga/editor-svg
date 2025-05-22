import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CanvasComponent } from './canvas.component';
import { FormBuilder } from '@angular/forms';
import { ColorPickerService } from 'ngx-color-picker';
import { By } from '@angular/platform-browser';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Shape } from './shape';

describe('CanvasComponent', () => {
  let component: CanvasComponent;
  let fixture: ComponentFixture<CanvasComponent>;
  let colorPickerServiceSpy: jasmine.SpyObj<ColorPickerService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('ColorPickerService', ['']);

    await TestBed.configureTestingModule({
      imports: [CanvasComponent], // standalone
      providers: [
        FormBuilder,
        { provide: ColorPickerService, useValue: spy }
      ],
      schemas: [NO_ERRORS_SCHEMA] // evitar erros em elementos externos
    }).compileComponents();

    fixture = TestBed.createComponent(CanvasComponent);
    component = fixture.componentInstance;
    colorPickerServiceSpy = TestBed.inject(ColorPickerService) as jasmine.SpyObj<ColorPickerService>;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize shapes from localStorage on ngOnInit', () => {
    const shapesMock = [{ type: 'rectangle', x: 1, y: 2 }];
    localStorage.setItem('svgShapes', JSON.stringify(shapesMock));
    component.ngOnInit();
    expect(component.shapes.length).toBe(1);
    expect(component.shapes[0].type).toBe('rectangle');
  });

  it('should add a rectangle and update shapes and currentShape', () => {
    const svgPoint = { x: 50, y: 50 } as SVGPoint;
    component.addRectangle(svgPoint);
    expect(component.shapes.length).toBe(1);
    expect(component.currentShape.type).toBe('rectangle');
    expect(component.currentShape.x).toBe(0); // 50 - 100/2 = 0
    expect(component.addingRectangle).toBeFalse();
  });

  it('should add a star and update shapes and currentShape', () => {
    const svgPoint = { x: 100, y: 100 } as SVGPoint;
    component.addStar(svgPoint);
    expect(component.shapes.length).toBe(1);
    expect(component.currentShape.type).toBe('star');
    expect(component.currentShape.x).toBe(100);
    expect(component.addingStar).toBeFalse();
  });

  it('should delete a shape', () => {
    const rect = {
      type: 'rectangle',
      x: 0,
      y: 0,
      rx: 0,
      ry: 0,
      width: 100,
      height: 50,
      fill: '#fff',
      stroke: '#000',
      strokeWidth: 1,
      scale: 1
    };
    component.shapes.push(rect);
    component.currentShape = rect;

    component.deleteShape();

    expect(component.shapes.length).toBe(0);
    expect(component.currentShape.type).toBe('');
  });

  it('should delete all shapes', () => {
    component.shapes.push({ type: 'rectangle' } as any);
    component.shapes.push({ type: 'star' } as any);

    component.deleteAll();

    expect(component.shapes.length).toBe(0);
    expect(component.currentShape.type).toBe('');
  });

  it('should calculate star points correctly', () => {
    component.currentShape = {
      x: 100,
      y: 100,
      scale: 1,
      starPoints: 5,
      starAngle: 25,
      type: 'star',
      fill: '',
      stroke: '',
      strokeWidth: 1
    };
    component.starPoints.setValue(5);
    component.starSlider.setValue(25);

    const points = component.calculateStar(100, 100);
    expect(points.length).toBe(10); // 2 * starPoints
  });

  it('should scale rectangle properly', () => {
    component.currentShape = {
      type: 'rectangle',
      width: 100,
      height: 50,
      scale: 1,
      x: 0,
      y: 0,
      rx: 0,
      ry: 0,
      fill: '',
      stroke: '',
      strokeWidth: 1
    };

    component.scaleRect(2);

    expect(component.currentShape.scale).toBe(2);
    expect(component.currentShape.width).toBe(200);
    expect(component.currentShape.height).toBe(100);
    expect(component.currentShape.x).toBeLessThan(0); // position adjusted
  });

  it('should scale polygon properly', () => {
    const points = [
      { x: 10, y: 10 },
      { x: 20, y: 10 },
      { x: 15, y: 20 }
    ];
    component.currentShape = {
      type: 'star',
      points: points,
      scale: 1,
      x: 15,
      y: 15,
      fill: '',
      stroke: '',
      strokeWidth: 1
    };

    component.scalePolygon(points, 2);

    expect(component.currentShape.scale).toBe(2);
    expect(component.currentShape.points!.length).toBe(3);
    // Pontos escalados em relação ao centro (15,15)
    expect(component.currentShape.points![0].x).toBeCloseTo(5);
    expect(component.currentShape.points![0].y).toBeCloseTo(5);
  });

  it('should toggle adding shape mode', () => {
    component.addingShape('rectangle');
    expect(component.addingRectangle).toBeTrue();
    expect(component.addingStar).toBeFalse();

    component.addingShape('star');
    expect(component.addingStar).toBeTrue();
    expect(component.addingRectangle).toBeFalse();

    component.addingShape('star');
    expect(component.addingStar).toBeFalse();
    expect(component.shapeType()).toBe('');
  });

  it('should handle onShapeClicked properly', () => {
    const rect = {
      type: 'rectangle',
      rx: 5,
      ry: 5,
      strokeWidth: 2,
      stroke: '#111111',
      fill: '#222222',
      scale: 1
    } as Shape;

    component.onShapeClicked(rect);

    expect(component.currentShape).toBe(rect);
    expect(component.roundControl.value).toBe(5);
    expect(component.strokeWidth.value).toBe(2);
    expect(component.strokeColorControl.value).toBe('#111111');
    expect(component.fillColorControl.value).toBe('#222222');
  });

  it('should get polygon points string', () => {
    const pts = [
      { x: 10, y: 10 },
      { x: 20, y: 30 }
    ];
    const str = component.getPolygonPoints(pts);
    expect(str).toBe('10,10 20,30');
  });

  it('should handle onMouseDown and onMouseMove for rectangle dragging', () => {
    const rect = {
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      scale: 1
    } as Shape;
    component.shapes.push(rect);
  
    const fakeCTMInverse = {};
  
    const fakeSVGElement = {
      createSVGPoint: () => ({
        x: 50,
        y: 50,
        matrixTransform: (matrix: any) => {
          if (matrix === fakeCTMInverse) {
            return { x: 60, y: 60 };
          }
          return { x: 50, y: 50 };
        }
      }),
      getScreenCTM: () => ({
        inverse: () => fakeCTMInverse
      })
    };
  
    const fakeTarget = {
      ownerSVGElement: fakeSVGElement
    } as any;
  
    const mouseDownEvent = {
      preventDefault: jasmine.createSpy(),
      clientX: 50,
      clientY: 50,
      target: fakeTarget
    } as unknown as MouseEvent;
  
    component.onMouseDown(mouseDownEvent, rect);
    expect(component.draggingShape).toBe(rect);
    expect(component.offsetX).toBeCloseTo(60 - rect.x);
    expect(component.offsetY).toBeCloseTo(60 - rect.y);
  });
    

  it('should handle onMouseUp and clear dragging', () => {
    component.draggingShape = { type: 'rectangle' } as Shape;
    component.shapes.push(component.draggingShape);
    spyOn(localStorage, 'setItem');

    component.onMouseUp();

    expect(component.draggingShape).toBeNull();
    expect(localStorage.setItem).toHaveBeenCalled();
  });

  it('should update stroke and fill colors and save to localStorage', () => {
    spyOn(localStorage, 'setItem');
    component.currentShape = { stroke: '', fill: '' } as Shape;

    component.onStrokeColorChange('#123456');
    expect(component.currentShape.stroke).toBe('#123456');
    expect(localStorage.setItem).toHaveBeenCalled();

    component.onFillColorChange('#654321');
    expect(component.currentShape.fill).toBe('#654321');
    expect(localStorage.setItem).toHaveBeenCalledTimes(2);
  });

});
