import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { CanvasComponent } from './canvas.component';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ColorPickerService } from 'ngx-color-picker';

describe('CanvasComponent', () => {
  let component: CanvasComponent;
  let fixture: ComponentFixture<CanvasComponent>;
  let cpServiceSpy: jasmine.SpyObj<ColorPickerService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('ColorPickerService', ['']);

    await TestBed.configureTestingModule({
      imports: [CanvasComponent, ReactiveFormsModule],
      providers: [FormBuilder, { provide: ColorPickerService, useValue: spy }],
    }).compileComponents();

    fixture = TestBed.createComponent(CanvasComponent);
    component = fixture.componentInstance;
    cpServiceSpy = TestBed.inject(
      ColorPickerService
    ) as jasmine.SpyObj<ColorPickerService>;

    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create component and initialize empty shapes array', () => {
    expect(component).toBeTruthy();
    expect(component.shapes).toEqual([]);
  });

  it('should load shapes from localStorage on ngOnInit', () => {
    const shapes = [{ type: 'rectangle', x: 10, y: 20 }];
    localStorage.setItem('svgShapes', JSON.stringify(shapes));
    component.ngOnInit();
    expect(component.shapes.length).toBe(1);
    expect(component.shapes[0].type).toBe('rectangle');
  });

  it('should add rectangle shape on addRectangle call', () => {
    const svgPoint = { x: 100, y: 100 } as SVGPoint;
    component.addRectangle(svgPoint);
    expect(component.shapes.length).toBe(1);
    expect(component.shapes[0].type).toBe('rectangle');
    expect(component.currentShape).toBe(component.shapes[0]);
  });

  it('should add star shape on addStar call', () => {
    const svgPoint = { x: 50, y: 50 } as SVGPoint;
    component.addStar(svgPoint);
    expect(component.shapes.length).toBe(1);
    expect(component.shapes[0].type).toBe('star');
    expect(component.currentShape).toBe(component.shapes[0]);
  });

  it('should delete current shape', () => {
    const svgPoint = { x: 0, y: 0 } as SVGPoint;
    component.addRectangle(svgPoint);
    expect(component.shapes.length).toBe(1);
    component.deleteShape();
    expect(component.shapes.length).toBe(0);
    expect(component.currentShape.type).toBe('');
  });

  it('should update star points when updateStar is called', () => {
    const svgPoint = { x: 0, y: 0 } as SVGPoint;
    component.addStar(svgPoint);
    spyOn(component, 'calculateStar').and.callThrough();

    component.updateStar();
    expect(component.calculateStar).toHaveBeenCalled();
    expect(component.currentShape.points?.length).toBeGreaterThan(0);
  });

  it('should reset shape properties on resetShape', fakeAsync(() => {
    component.shapeType.set('rectangle');
    tick();

    component.resetShape();

    expect(component.currentShape.type).toBe('');
    expect(component.scale).toBe(1);
    expect(component.form.controls['strokeWidth']?.value).toBe(2);
  }));

  it('should scale rectangle correctly', () => {
    const svgPoint = { x: 0, y: 0 } as SVGPoint;
    component.addRectangle(svgPoint);

    const originalWidth = component.currentShape.width!;
    const originalHeight = component.currentShape.height!;
    component.scaleRect(2);

    expect(component.currentShape.width).toBeCloseTo(originalWidth * 2);
    expect(component.currentShape.height).toBeCloseTo(originalHeight * 2);
  });

  it('should handle onShapeClicked and update form controls', () => {
    component.addRectangle({ x: 0, y: 0 } as SVGPoint);
    component.currentShape.rx = 10;
    component.onShapeClicked(component.currentShape);

    expect(component.shapeType()).toBe('rectangle');
    expect(component.roundControl.value).toBe(10);
  });

  it('should handle addingShape toggling flags correctly', () => {
    component.addingShape('rectangle');
    expect(component.addingRectangle).toBeTrue();
    expect(component.addingStar).toBeFalse();

    component.addingShape('star');
    expect(component.addingStar).toBeTrue();
    expect(component.addingRectangle).toBeFalse();

    component.addingShape('star'); // toggle off
    expect(component.addingStar).toBeFalse();
    expect(component.addingRectangle).toBeFalse();
    expect(component.shapeType()).toBe('');
  });

  describe('CanvasComponent additional methods', () => {

    beforeEach(() => {
      // Limpa o localStorage antes de cada teste para evitar interferências
      localStorage.clear();
      // Define uma forma atual para testes que dependem dela
      component.currentShape = {
        type: 'rectangle',
        fill: '#fff',
        stroke: '#000',
        strokeWidth: 2,
        x: 0,
        y: 0,
        scale: 1
      };
      component.shapes = [component.currentShape];
    });
  
    it('should clear draggingShape and initialMouse and save shapes on onMouseUp', () => {
      component.draggingShape = component.currentShape;
      component.initialMouse = { x: 10, y: 20 };
  
      component.onMouseUp();
  
      expect(component.draggingShape).toBeNull();
      expect(component.initialMouse).toBeNull();
  
      const saved = localStorage.getItem('svgShapes');
      expect(saved).toBe(JSON.stringify(component.shapes));
    });
  
    it('should update stroke color and save shapes on onStrokeColorChange', () => {
      const newColor = '#123456';
  
      component.onStrokeColorChange(newColor);
  
      expect(component.strokeColor).toBe(newColor);
      expect(component.currentShape.stroke).toBe(newColor);
  
      const saved = localStorage.getItem('svgShapes');
      expect(saved).toBe(JSON.stringify(component.shapes));
    });
  
    it('should update fill color and save shapes on onFillColorChange', () => {
      const newColor = '#abcdef';
  
      component.onFillColorChange(newColor);
  
      expect(component.fillColor).toBe(newColor);
      expect(component.currentShape.fill).toBe(newColor);
  
      const saved = localStorage.getItem('svgShapes');
      expect(saved).toBe(JSON.stringify(component.shapes));
    });

    it('should set draggingShape and calculate offsets for rectangle on onMouseDown', () => {
      const shape = {
        type: 'rectangle',
        x: 10,
        y: 15,
        stroke: '',
        fill: '',
        strokeWidth: 1,
        scale: 1,
      };
    
      const mockSVGPoint = {
        x: 25,
        y: 30,
        matrixTransform: jasmine.createSpy('matrixTransform').and.returnValue({ x: 50, y: 60 })
      };
    
      const mockSVG = {
        createSVGPoint: () => mockSVGPoint,
        getScreenCTM: () => ({
          inverse: () => ({})
        })
      } as unknown as SVGSVGElement;
    
      const event = {
        preventDefault: jasmine.createSpy('preventDefault'),
        target: {
          ownerSVGElement: mockSVG
        },
        clientX: 25,
        clientY: 30
      } as unknown as MouseEvent;
    
      component.onMouseDown(event, shape);
    
      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.draggingShape).toBe(shape);
      expect(component.offsetX).toBe(50 - shape.x); 
      expect(component.offsetY).toBe(60 - shape.y); 
      expect(component.initialMouse).toBeNull();
    });
    
    it('should set draggingShape and initialMouse for non-rectangle shape on onMouseDown', () => {
      const shape = {
        type: 'star',
        x: 10,
        y: 15,
        stroke: '',
        fill: '',
        strokeWidth: 1,
        scale: 1,
      };
    
      const mockSVGPoint = {
        x: 25,
        y: 30,
        matrixTransform: jasmine.createSpy('matrixTransform').and.returnValue({ x: 50, y: 60 })
      };
    
      const mockSVG = {
        createSVGPoint: () => mockSVGPoint,
        getScreenCTM: () => ({
          inverse: () => ({})
        })
      } as unknown as SVGSVGElement;
    
      const event = {
        preventDefault: jasmine.createSpy('preventDefault'),
        target: {
          ownerSVGElement: mockSVG
        },
        clientX: 25,
        clientY: 30
      } as unknown as MouseEvent;
    
      component.onMouseDown(event, shape);
    
      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.draggingShape).toBe(shape);
      expect(component.initialMouse).toEqual({ x: 50, y: 60 });
      expect(component.offsetX).toBe(0);
      expect(component.offsetY).toBe(0);
    });    

    it('should update rectangle position on onMouseMove when draggingShape is rectangle', () => {
      
      component.draggingShape = {
        type: 'rectangle',
        x: 10,
        y: 20,
        stroke: '',
        fill: '',
        strokeWidth: 1,
        scale: 1,
      };
    
      component.offsetX = 5;
      component.offsetY = 5;
    
      const mockSVGPoint = {
        x: 15,
        y: 25,
        matrixTransform: jasmine.createSpy('matrixTransform').and.returnValue({ x: 30, y: 40 })
      };
    
      const mockSVG = {
        createSVGPoint: () => mockSVGPoint,
        getScreenCTM: () => ({
          inverse: () => ({})
        })
      } as unknown as SVGSVGElement;
    
      const event = {
        target: {
          ownerSVGElement: mockSVG
        },
        clientX: 15,
        clientY: 25
      } as unknown as MouseEvent;
    
      component.onMouseMove(event);
    
      expect(component.draggingShape.x).toBe(30 - component.offsetX);
      expect(component.draggingShape.y).toBe(40 - component.offsetY);
    });
    
    it('should update star points and position on onMouseMove when draggingShape is star and initialMouse is set', () => {
      const initialPoints = [{ x: 10, y: 10 }, { x: 20, y: 10 }, { x: 15, y: 20 }];
    
      component.draggingShape = {
        type: 'star',
        points: initialPoints,
        x: 15,
        y: 15,
        stroke: '',
        fill: '',
        strokeWidth: 1,
        scale: 1,
      };
    
      component.initialMouse = { x: 5, y: 5 };
    
      const mockSVGPoint = {
        x: 25,
        y: 30,
        matrixTransform: jasmine.createSpy('matrixTransform').and.returnValue({ x: 25, y: 30 })
      };
    
      const mockSVG = {
        createSVGPoint: () => mockSVGPoint,
        getScreenCTM: () => ({
          inverse: () => ({})
        })
      } as unknown as SVGSVGElement;
    
      const event = {
        target: {
          ownerSVGElement: mockSVG
        },
        clientX: 25,
        clientY: 30
      } as unknown as MouseEvent;
    
      component.onMouseMove(event);
    
      const dx = 25 - 5;
      const dy = 30 - 5;
    
      expect(component.draggingShape.points).toEqual(initialPoints.map(p => ({
        x: p.x + dx,
        y: p.y + dy
      })));
    
      expect(component.draggingShape.x).toBe(15 + dx);
      expect(component.draggingShape.y).toBe(15 + dy);
    
      expect(component.initialMouse).toEqual({ x: 25, y: 30 });
    });

    it('should return early if not addingRectangle or addingStar', () => {
      component.addingRectangle = false;
      component.addingStar = false;
    
      const event = {
        target: {}
      } as unknown as MouseEvent;
    
      spyOn(component, 'resetShape');
      spyOn(component, 'addRectangle');
      spyOn(component, 'addStar');
    
      component.onSvgClick(event);
    
      expect(component.resetShape).not.toHaveBeenCalled();
      expect(component.addRectangle).not.toHaveBeenCalled();
      expect(component.addStar).not.toHaveBeenCalled();
    });
    
    it('should resetShape if currentShape.type is rectangle or star', () => {
      component.addingRectangle = true;
      component.currentShape = { type: 'rectangle' } as any;
    
      const mockSVGPoint = {
        x: 10,
        y: 20,
        matrixTransform: jasmine.createSpy('matrixTransform').and.returnValue({ x: 15, y: 25 })
      };
    
      const mockSVG = {
        createSVGPoint: () => mockSVGPoint,
        getScreenCTM: () => ({
          inverse: () => ({})
        }),
      } as unknown as SVGSVGElement;
    
      const event = {
        target: {
          closest: jasmine.createSpy('closest').and.returnValue(mockSVG)
        },
        clientX: 10,
        clientY: 20
      } as unknown as MouseEvent;
    
      spyOn(component, 'resetShape').and.callThrough();
      spyOn(component, 'addRectangle').and.callThrough();
      spyOn(component, 'addStar').and.callThrough();
    
      component.onSvgClick(event);
    
      expect(component.resetShape).toHaveBeenCalled();
      expect(component.addRectangle).toHaveBeenCalled();
      expect(component.addStar).not.toHaveBeenCalled();
    });

    it('should scale polygon points correctly and update currentShape scale', () => {
      
      component.currentShape = {
        type: 'star',
        x: 10,
        y: 20,
        points: [
          { x: 15, y: 25 },
          { x: 20, y: 30 },
          { x: 25, y: 35 }
        ],
        scale: 1,
        stroke: '',
        fill: '',
        strokeWidth: 1,
      };
    
      const originalPoints = component.currentShape.points ??  [
        { x: 15, y: 25 },
        { x: 20, y: 30 },
        { x: 25, y: 35 }
      ];
      const scale = 2;
    
      
      component.scalePolygon(originalPoints, scale);
    
      // Calcula os pontos esperados após a escala
      const expectedPoints = originalPoints.map(p => ({
        x: component.currentShape.x + (p.x - component.currentShape.x) * scale,
        y: component.currentShape.y + (p.y - component.currentShape.y) * scale,
      }));
    
      expect(component.currentShape.points).toEqual(expectedPoints);
      expect(component.currentShape.scale).toBe(scale);
    });
    
    
    it('should call addStar if addingStar is true and addingRectangle is false', () => {
      component.addingRectangle = false;
      component.addingStar = true;
      component.currentShape = { type: '' } as any;
    
      const mockSVGPoint = {
        x: 50,
        y: 60,
        matrixTransform: jasmine.createSpy('matrixTransform').and.returnValue({ x: 55, y: 65 })
      };
    
      const mockSVG = {
        createSVGPoint: () => mockSVGPoint,
        getScreenCTM: () => ({
          inverse: () => ({})
        }),
      } as unknown as SVGSVGElement;
    
      const event = {
        target: {
          closest: jasmine.createSpy('closest').and.returnValue(mockSVG)
        },
        clientX: 10,
        clientY: 20
      } as unknown as MouseEvent;
    
      spyOn(component, 'resetShape').and.callThrough();
      spyOn(component, 'addRectangle').and.callThrough();
      spyOn(component, 'addStar').and.callThrough();
      spyOn(component.shapeType, 'set').and.callThrough();
    
      component.onSvgClick(event);
    
      expect(component.resetShape).not.toHaveBeenCalled();
      expect(component.addRectangle).not.toHaveBeenCalled();
      expect(component.addStar).toHaveBeenCalled();
      expect(component.shapeType.set).toHaveBeenCalledWith('star');
    });    
  
  });

  describe('getPolygonPoints', () => {
    it('should return empty string if no points', () => {
      expect(component.getPolygonPoints()).toBe('');
      expect(component.getPolygonPoints(undefined)).toBe('');
    });
  
    it('should return correctly formatted string of points', () => {
      const points = [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
        { x: 5, y: 6 }
      ];
      expect(component.getPolygonPoints(points)).toBe('1,2 3,4 5,6');
    });
  });
  
  describe('estimateStarValuesFromPoints', () => {
    it('should calculate numPoints and starSlider correctly', () => {
      const points = [
        { x: 4, y: 0 },  // outer
        { x: 2, y: 0 },  // inner
        { x: 0, y: 4 },  // outer
        { x: 0, y: 2 }   // inner
      ];
      const centerX = 0;
      const centerY = 0;
  
      const result = component.estimateStarValuesFromPoints(points, centerX, centerY);
      // numPoints = points.length / 2 = 4 / 2 = 2
      // Distances:
      // outerRadii: sqrt(4^2 + 0) = 4, sqrt(0 + 4^2) = 4 -> avg = 4
      // innerRadii: sqrt(2^2 + 0) = 2, sqrt(0 + 2^2) = 2 -> avg = 2
      // starSlider = round(2) = 2
  
      expect(result.numPoints).toBe(2);
      expect(result.starSlider).toBe(2);
    });
  });  
  
});
