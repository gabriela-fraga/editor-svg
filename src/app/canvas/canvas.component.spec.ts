import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CanvasComponent, Point } from './canvas.component';
import { FormBuilder } from '@angular/forms';
import { ColorPickerService } from 'ngx-color-picker';
import { By } from '@angular/platform-browser';
import { Injector, NO_ERRORS_SCHEMA, runInInjectionContext, signal } from '@angular/core';
import { Shape } from './shape';
import { environment } from '../../environments/environments';

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
  
  it('should update currentShape rx and ry on roundControl value change if not clicked and shape is rectangle', () => {
    component.hasClickedShape = false;
    component.currentShape = { 
      type: 'rectangle', 
      rx: 0, 
      ry: 0,
      fill: '',
      stroke: '',
      strokeWidth: 1,
      x: 1,
      y: 1,
      scale: 1 
    };
    component.shapes = [component.currentShape];
  
    spyOn(localStorage, 'setItem');
  
    component.roundControl.setValue(15);
  
    expect(component.currentShape.rx).toBe(15);
    expect(component.currentShape.ry).toBe(15);
    expect(localStorage.setItem).toHaveBeenCalledWith('svgShapes', JSON.stringify(component.shapes));
  });

  it('should call scaleRect or scalePolygon when shapeScale changes and hasClickedShape is false', fakeAsync(() => {
    component.hasClickedShape = false;
  
    // Spy nos métodos chamados
    spyOn(component, 'scaleRect');
    spyOn(component, 'scalePolygon');
  
    // Teste com shape do tipo 'rectangle'
    component.currentShape = { type: 'rectangle' } as any;
    component.shapeScale.setValue(1.5);
    tick();
    expect(component.scaleRect).toHaveBeenCalledWith(1.5);
    expect(component.scalePolygon).not.toHaveBeenCalled();
  
    // Teste com shape do tipo 'star'
    const points = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
    component.currentShape = { type: 'star', points } as any;
    component.shapeScale.setValue(2);
    tick();
    expect(component.scalePolygon).toHaveBeenCalledWith(points, 2);
  }));

  it('should update currentShape.stroke when strokeColorControl value changes and hasClickedShape is false', fakeAsync(() => {
    component.hasClickedShape = false;
    component.currentShape = { type: 'rectangle' } as any;
  
    component.strokeColorControl.setValue('#FF0000');
    tick();
    expect(component.currentShape.stroke).toBe('#FF0000');
  
    // Teste valor null -> valor padrão
    component.strokeColorControl.setValue(null);
    tick();
    expect(component.currentShape.stroke).toBe('#000000');
  }));

  it('should update currentShape.fill when fillColorControl value changes and hasClickedShape is false', fakeAsync(() => {
    component.hasClickedShape = false;
    component.currentShape = { type: 'rectangle' } as any;
  
    component.fillColorControl.setValue('#00FF00');
    tick();
    expect(component.currentShape.fill).toBe('#00FF00');
  
    // Teste valor undefined -> valor padrão
    component.fillColorControl.setValue(undefined);
    tick();
    expect(component.currentShape.fill).toBe('#FFFFFF');
  }));
  
  it('should reset shape and add rectangle on SVG click when addingRectangle is true', () => {
    component.addingRectangle = true;
    component.addingStar = false;
    component.currentShape = { type: 'rectangle' } as any;
  
    spyOn(component, 'resetShape');
    spyOn(component, 'addRectangle');
    spyOn(component.shapeType, 'set');
  
    const fakeSVG = {
      createSVGPoint: () => ({
        x: 0,
        y: 0,
        matrixTransform: () => ({ x: 100, y: 150 })
      }),
      getScreenCTM: () => ({
        inverse: () => ({})
      })
    } as any;
  
    const fakeTarget = {
      closest: (selector: string) => selector === 'svg' ? fakeSVG : null
    } as any;
  
    const event = {
      clientX: 100,
      clientY: 150,
      target: fakeTarget
    } as MouseEvent;
  
    component.onSvgClick(event);
  
    expect(component.resetShape).toHaveBeenCalled();
    expect(component.shapeType.set).toHaveBeenCalledWith('rectangle');
    expect(component.addRectangle).toHaveBeenCalled();
  });
  
  it('should reset shape and add star on SVG click when addingStar is true', () => {
    component.addingRectangle = false;
    component.addingStar = true;
    component.currentShape = { type: 'star' } as any;
  
    spyOn(component, 'resetShape');
    spyOn(component, 'addStar');
    spyOn(component.shapeType, 'set');
  
    const fakeSVG = {
      createSVGPoint: () => ({
        x: 0,
        y: 0,
        matrixTransform: () => ({ x: 200, y: 250 })
      }),
      getScreenCTM: () => ({
        inverse: () => ({})
      })
    } as any;
  
    const fakeTarget = {
      closest: (selector: string) => selector === 'svg' ? fakeSVG : null
    } as any;
  
    const event = {
      clientX: 200,
      clientY: 250,
      target: fakeTarget
    } as MouseEvent;
  
    component.onSvgClick(event);
  
    expect(component.resetShape).toHaveBeenCalled();
    expect(component.shapeType.set).toHaveBeenCalledWith('star');
    expect(component.addStar).toHaveBeenCalled();
  });
  
  it('should return early if event.target is null or not adding any shape', () => {
    spyOn(component, 'resetShape');
    const event = { target: null } as unknown as MouseEvent;
  
    component.onSvgClick(event);
    expect(component.resetShape).not.toHaveBeenCalled();
  
    const event2 = { target: {} } as unknown as MouseEvent;
    component.addingRectangle = false;
    component.addingStar = false;
  
    component.onSvgClick(event2);
    expect(component.resetShape).not.toHaveBeenCalled();
  });

  it('should update form controls when a star shape is clicked', () => {
    const starShape: Shape = {
      type: 'star',
      starPoints: 7,
      starAngle: 25,
      strokeWidth: 3,
      stroke: '#123456',
      fill: '#abcdef',
      scale: 1.2,
      points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
      x: 0,
      y: 0
    };
  
    spyOn(component.shapeType, 'set');
    spyOn(component.starPoints, 'setValue');
    spyOn(component.starSlider, 'setValue');
    spyOn(component.strokeWidth, 'setValue');
    spyOn(component.strokeColorControl, 'setValue');
    spyOn(component.fillColorControl, 'setValue');
    spyOn(component.shapeScale, 'setValue');
  
    component.onShapeClicked(starShape);
  
    expect(component.shapeType.set).toHaveBeenCalledWith('star');
    expect(component.starPoints.setValue).toHaveBeenCalledWith(7);
    expect(component.starSlider.setValue).toHaveBeenCalledWith(25);
    expect(component.strokeWidth.setValue).toHaveBeenCalledWith(3);
    expect(component.strokeColorControl.setValue).toHaveBeenCalledWith('#123456');
    expect(component.fillColorControl.setValue).toHaveBeenCalledWith('#abcdef');
    expect(component.shapeScale.setValue).toHaveBeenCalledWith(1.2);
  
    expect(component.hasClickedShape).toBeFalse(); // volta a ser false no final
  });

  it('should return an empty string when points is undefined', () => {
    const result = component.getPolygonPoints(undefined);
    expect(result).toBe('');
  });

  it('should set initialMouse for non-rectangle shape on mouse down', () => {
    const shape = {
      type: 'star',
      x: 100,
      y: 100,
      points: [],
      scale: 1,
      fill: '',
      stroke: '',
      strokeWidth: 1
    } as Shape;
  
    const fakeSVGElement = {
      createSVGPoint: () => ({
        x: 0,
        y: 0,
        matrixTransform: () => ({ x: 200, y: 150 })
      }),
      getScreenCTM: () => ({
        inverse: () => ({})
      })
    };
  
    const fakeTarget = {
      ownerSVGElement: fakeSVGElement
    } as any;
  
    const event = {
      preventDefault: jasmine.createSpy(),
      clientX: 200,
      clientY: 150,
      target: fakeTarget
    } as unknown as MouseEvent;
  
    component.onMouseDown(event, shape);
  
    expect(event.preventDefault).toHaveBeenCalled();
    expect(component.draggingShape).toBe(shape);
    expect(component.initialMouse).toEqual({ x: 200, y: 150 });
  });

  it('should return early if draggingShape is not defined', () => {
    component.draggingShape = null;
    const event = new MouseEvent('mousemove');
    expect(() => component.onMouseMove(event)).not.toThrow();
  });
  
  it('should update rectangle position on mouse move', () => {
    component.draggingShape = {
      type: 'rectangle',
      x: 10,
      y: 20,
      scale: 1
    } as Shape;
    component.offsetX = 5;
    component.offsetY = 10;
  
    const fakeSVGElement = {
      createSVGPoint: () => ({
        x: 0,
        y: 0,
        matrixTransform: () => ({ x: 50, y: 60 })
      }),
      getScreenCTM: () => ({
        inverse: () => ({})
      })
    };
  
    const fakeTarget = {
      ownerSVGElement: fakeSVGElement
    } as any;
  
    const event = {
      clientX: 50,
      clientY: 60,
      target: fakeTarget
    } as unknown as MouseEvent;
  
    component.onMouseMove(event);
  
    expect(component.draggingShape.x).toBe(45); // 50 - 5
    expect(component.draggingShape.y).toBe(50); // 60 - 10
  });

  it('should move star shape and its points on mouse move', () => {
    component.draggingShape = {
      type: 'star',
      x: 100,
      y: 100,
      scale: 1,
      points: [
        { x: 110, y: 110 },
        { x: 120, y: 120 }
      ]
    } as Shape;
    component.initialMouse = { x: 200, y: 150 };
  
    const fakeSVGElement = {
      createSVGPoint: () => ({
        x: 0,
        y: 0,
        matrixTransform: () => ({ x: 220, y: 180 }) // +20, +30
      }),
      getScreenCTM: () => ({
        inverse: () => ({})
      })
    };
  
    const fakeTarget = {
      ownerSVGElement: fakeSVGElement
    } as any;
  
    const event = {
      clientX: 220,
      clientY: 180,
      target: fakeTarget
    } as unknown as MouseEvent;
  
    component.onMouseMove(event);
  
    expect(component.draggingShape.x).toBe(120); // 100 + 20
    expect(component.draggingShape.y).toBe(130); // 100 + 30
    expect(component.draggingShape.points).toEqual([
      { x: 130, y: 140 },
      { x: 140, y: 150 }
    ]);
    expect(component.initialMouse).toEqual({ x: 220, y: 180 });
  });

  it('should move star shape without updating points if points is not an array', () => {
    component.draggingShape = {
      type: 'star',
      x: 50,
      y: 60,
      scale: 1,
      points: null as any
    } as Shape;
    component.initialMouse = { x: 100, y: 100 };
  
    const fakeSVGElement = {
      createSVGPoint: () => ({
        x: 0,
        y: 0,
        matrixTransform: () => ({ x: 110, y: 120 }) // +10, +20
      }),
      getScreenCTM: () => ({
        inverse: () => ({})
      })
    };
  
    const fakeTarget = {
      ownerSVGElement: fakeSVGElement
    } as any;
  
    const event = {
      clientX: 110,
      clientY: 120,
      target: fakeTarget
    } as unknown as MouseEvent;
  
    component.onMouseMove(event);
  
    expect(component.draggingShape.x).toBe(60); // 50 + 10
    expect(component.draggingShape.y).toBe(80); // 60 + 20
    expect(component.draggingShape.points).toBeNull();
  });

  it('should set currentShape.rx and ry to 0 when roundControl emits null and currentShape is rectangle', (done) => {
    component.hasClickedShape = false;
    component.currentShape = { type: 'rectangle', rx: 5, ry: 5 } as any;
    component.shapes = [component.currentShape];
  
    component.roundControl.setValue(10); 
  
    component.roundControl.valueChanges.subscribe(val => {
      expect(component.currentShape.rx).toBe(0);
      expect(component.currentShape.ry).toBe(0);
      done();
    });
    component.roundControl.setValue(null);
  });
  
  it('should call scaleRect with 1 when shapeScale emits null and currentShape is rectangle', (done) => {
    component.hasClickedShape = false;
    component.currentShape = { type: 'rectangle' } as any;
    component.shapes = [component.currentShape];
  
    spyOn(component, 'scaleRect');
    spyOn(localStorage, 'setItem');
  
    component.shapeScale.setValue(2); // valor inicial diferente para garantir mudança
  
    component.shapeScale.valueChanges.subscribe(val => {
      expect(component.scaleRect).toHaveBeenCalledWith(1);
      expect(localStorage.setItem).toHaveBeenCalledWith('svgShapes', JSON.stringify(component.shapes));
      done();
    });
  
    component.shapeScale.setValue(null);
  });
  
  it('should call scalePolygon with 1 when shapeScale emits null and currentShape is star', (done) => {
    component.hasClickedShape = false;
    component.currentShape = { type: 'star', points: [{x:0,y:0}] } as any;
    component.shapes = [component.currentShape];
  
    spyOn(component, 'scalePolygon');
    spyOn(localStorage, 'setItem');
  
    component.shapeScale.setValue(2);
  
    component.shapeScale.valueChanges.subscribe(val => {
      const points = component.currentShape.points as Point[]; 
      expect(component.scalePolygon).toHaveBeenCalledWith(points, 1);
      expect(localStorage.setItem).toHaveBeenCalledWith('svgShapes', JSON.stringify(component.shapes));
      done();
    });
  
    component.shapeScale.setValue(null);
  });
  
  it('should add rectangle with rx and ry = 0 when roundControl.value is null', () => {
    component.roundControl.setValue(null);
  
    const cursorpt = {
      x: 200,
      y: 150
    } as SVGPoint;
  
    component.addRectangle(cursorpt);
  
    const addedRect = component.shapes[component.shapes.length - 1];
  
    expect(addedRect.rx).toBe(0);
    expect(addedRect.ry).toBe(0);
  });
  
  it('should not update points if currentShape type is not star', () => {
    component.currentShape = { type: 'rectangle' } as Shape;
    spyOn(component, 'calculateStar');
    spyOn(localStorage, 'setItem');
  
    component.updateStar();
  
    expect(component.calculateStar).not.toHaveBeenCalled();
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });
  
  it('should use default values when starSlider.value and starPoints.value are null', () => {
    component.currentShape = {
      type: 'star',
      x: 10,
      y: 20,
      scale: 1,
      points: [],
      stroke: '',
      strokeWidth: 1,
      fill: ''
    } as Shape;
  
    // Mock dos controls com value null
    component.starSlider = { value: null } as any;
    component.starPoints = { value: null } as any;
  
    const generateSpy = spyOn(component, 'generateStarPoints').and.callThrough();
    spyOn(localStorage, 'setItem');
  
    component.updateStar();
  
    expect(generateSpy).toHaveBeenCalledWith(
      10, // x
      20, // y
      (100 - 0) * 1, // outer = 100 - 0 * scale
      0 * 1,         // inner = 0 * scale
      5              // numPoints default
    );
  
    expect(component.currentShape.points).toBeDefined();
    expect(localStorage.setItem).toHaveBeenCalledWith('svgShapes', JSON.stringify(component.shapes));
  });
  
  it('should handle null or undefined width, height, and scale in scaleRect method', () => {
    component.currentShape = {
      type: 'rectangle',
      x: 10,
      y: 20,
      width: undefined,
      height: null,
      scale: null
    } as any;
  
    const initialX = component.currentShape.x;
    const initialY = component.currentShape.y;
  
    component.scaleRect(2);
  
    expect(component.currentShape.scale).toBe(2);
    expect(component.currentShape.width).toBe(0);
    expect(component.currentShape.height).toBe(0);
  
    expect(component.currentShape.x).toBe(initialX);
    expect(component.currentShape.y).toBe(initialY);
  });
  
  it('should use default oldScale = 1 when currentShape.scale is null or undefined in scalePolygon', () => {
    component.currentShape = {
      type: 'star',
      x: 50,
      y: 50,
      scale: null, 
      points: [
        { x: 40, y: 40 },
        { x: 60, y: 40 },
        { x: 50, y: 60 }
      ]
    } as any;
  
    const newScale = 2;
  
    component.scalePolygon(component.currentShape.points!, newScale);
    expect(component.currentShape.scale).toBe(newScale);
    expect(component.currentShape.points).toEqual([
      { x: 50 + (40 - 50) * 2, y: 50 + (40 - 50) * 2 },  // {30, 30}
      { x: 50 + (60 - 50) * 2, y: 50 + (40 - 50) * 2 },  // {70, 30}
      { x: 50 + (50 - 50) * 2, y: 50 + (60 - 50) * 2 }   // {50, 70}
    ]);
  });
  
  it('should return early if closest svg element is not found', () => {
    component.currentShape = { type: 'rectangle' } as any;
    component.addingRectangle = true;
    component.addingStar = false;
  
    // Simula target com closest retornando null
    const fakeTarget = {
      closest: jasmine.createSpy('closest').and.returnValue(null)
    } as any;
  
    const event = {
      target: fakeTarget,
      clientX: 100,
      clientY: 100
    } as MouseEvent;
  
    spyOn(component, 'resetShape');
    spyOn(component.shapeType, 'set');
    spyOn(component, 'addRectangle');
    spyOn(component, 'addStar');
  
    component.onSvgClick(event);
  
    expect(fakeTarget.closest).toHaveBeenCalledWith('svg');
    expect(component.resetShape).toHaveBeenCalled(); // resetShape roda antes da verificação do svg
    expect(component.shapeType.set).not.toHaveBeenCalled();
    expect(component.addRectangle).not.toHaveBeenCalled();
    expect(component.addStar).not.toHaveBeenCalled();
  });
   
  
});
