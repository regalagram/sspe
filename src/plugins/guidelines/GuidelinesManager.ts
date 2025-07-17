import { Point, GuideLine, GuidelinePoint, SnappingConfig, ActiveSnap, SVGPath, TextElementType, SVGGroup, BoundingBox, DistanceGuideLine, DistanceMarker } from '../../types';
import { generateId } from '../../utils/id-utils';
import { 
  getPathBoundingBox, 
  getTextBoundingBox, 
  getGroupBoundingBox, 
  getBoundingBoxAlignmentPoints,
  getDraggedElementBoundingBox
} from '../../utils/bbox-utils';

export class GuidelinesManager {
  private static instance: GuidelinesManager;
  private config: SnappingConfig;
  private activeSnap: ActiveSnap | null = null;
  private listeners: Array<(snap: ActiveSnap | null) => void> = [];

  private constructor() {
    this.config = {
      enabled: false,
      detectionRadius: 20, // Aumentado para facilitar el snap
      snapDuration: 1000, // Aumentado para que las guías persistan más tiempo
      guidelineColor: '#ff0000',
      showStaticGuides: true,
      showDynamicGuides: true,
      showGridGuides: true,
      showDistanceGuides: true, // Enable distance snapping
      gridSize: 20, // Aumentado para mejor visibilidad
      distanceGuideColor: '#00aa00', // Green for distance guidelines
      distanceTolerance: 5 // pixels - tolerance for distance matching
    };
    //console.log('GuidelinesManager initialized with config:', this.config);
  }

  public static getInstance(): GuidelinesManager {
    if (!GuidelinesManager.instance) {
      GuidelinesManager.instance = new GuidelinesManager();
    }
    return GuidelinesManager.instance;
  }

  public updateConfig(updates: Partial<SnappingConfig>): void {
    this.config = { ...this.config, ...updates };
    console.log('GuidelinesManager config updated:', this.config);
  }

  public getConfig(): SnappingConfig {
    return { ...this.config };
  }

  public subscribe(listener: (snap: ActiveSnap | null) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.activeSnap));
  }

  public getActiveSnap(): ActiveSnap | null {
    return this.activeSnap;
  }

  // Generate dynamic guideline points from existing elements
  public generateDynamicGuides(
    paths: SVGPath[], 
    texts: TextElementType[], 
    groups: SVGGroup[],
    excludeElementId?: string,
    excludeElementType?: 'path' | 'text' | 'group'
  ): GuidelinePoint[] {
    const points: GuidelinePoint[] = [];
    console.log('Generating dynamic guides for:', { paths: paths.length, texts: texts.length, groups: groups.length, excludeElementId, excludeElementType });

    // Add points from paths (using bounding box alignment points)
    paths.forEach(path => {
      if (excludeElementId === path.id && excludeElementType === 'path') return;

      const bbox = getPathBoundingBox(path);
      if (bbox) {
        const alignmentPoints = getBoundingBoxAlignmentPoints(bbox);
        alignmentPoints.forEach((point, index) => {
          const descriptions = [
            'top-left', 'top-right', 'bottom-left', 'bottom-right', 'center',
            'top-center', 'bottom-center', 'left-center', 'right-center'
          ];
          
          points.push({
            x: point.x,
            y: point.y,
            type: 'dynamic',
            elementId: path.id,
            elementType: 'path',
            description: `Path ${descriptions[index]}`
          });
        });
      }
    });

    // Add points from text elements (using bounding box alignment points)
    texts.forEach(text => {
      if (excludeElementId === text.id && excludeElementType === 'text') return;
      if (text.locked) return;

      const bbox = getTextBoundingBox(text);
      const alignmentPoints = getBoundingBoxAlignmentPoints(bbox);
      alignmentPoints.forEach((point, index) => {
        const descriptions = [
          'top-left', 'top-right', 'bottom-left', 'bottom-right', 'center',
          'top-center', 'bottom-center', 'left-center', 'right-center'
        ];
        
        points.push({
          x: point.x,
          y: point.y,
          type: 'dynamic',
          elementId: text.id,
          elementType: 'text',
          description: `Text ${descriptions[index]}`
        });
      });
    });

    // Add points from groups (using bounding box alignment points)
    groups.forEach(group => {
      if (excludeElementId === group.id && excludeElementType === 'group') return;
      if (group.locked) return;

      const bbox = getGroupBoundingBox(group);
      const alignmentPoints = getBoundingBoxAlignmentPoints(bbox);
      alignmentPoints.forEach((point, index) => {
        const descriptions = [
          'top-left', 'top-right', 'bottom-left', 'bottom-right', 'center',
          'top-center', 'bottom-center', 'left-center', 'right-center'
        ];
        
        points.push({
          x: point.x,
          y: point.y,
          type: 'dynamic',
          elementId: group.id,
          elementType: 'group',
          description: `Group ${descriptions[index]}`
        });
      });
    });

    console.log('Generated', points.length, 'dynamic guide points from bounding boxes');
    return points;
  }

  // Generate distance guidelines by analyzing spacing patterns and proposed position
  public generateDistanceGuides(
    draggedElementBbox: BoundingBox | null,
    paths: SVGPath[],
    texts: TextElementType[],
    groups: SVGGroup[],
    draggedElementId?: string,
    draggedElementType?: 'path' | 'text' | 'group'
  ): { distanceGuidelines: DistanceGuideLine[]; distanceMarkers: DistanceMarker[] } {
    const distanceGuidelines: DistanceGuideLine[] = [];
    const distanceMarkers: DistanceMarker[] = [];

    if (!this.config.showDistanceGuides || !draggedElementBbox) {
      return { distanceGuidelines, distanceMarkers };
    }

    // Collect all static elements (excluding dragged element)
    const staticElements: Array<{ id: string; type: 'path' | 'text' | 'group'; bbox: BoundingBox }> = [];

    // Add paths
    paths.forEach(path => {
      if (draggedElementId === path.id && draggedElementType === 'path') return;
      const bbox = getPathBoundingBox(path);
      if (bbox) {
        staticElements.push({ id: path.id, type: 'path', bbox });
      }
    });

    // Add texts
    texts.forEach(text => {
      if (draggedElementId === text.id && draggedElementType === 'text') return;
      if (text.locked) return;
      const bbox = getTextBoundingBox(text);
      staticElements.push({ id: text.id, type: 'text', bbox });
    });

    // Add groups
    groups.forEach(group => {
      if (draggedElementId === group.id && draggedElementType === 'group') return;
      if (group.locked) return;
      const bbox = getGroupBoundingBox(group);
      staticElements.push({ id: group.id, type: 'group', bbox });
    });

    // Analyze horizontal spacing patterns with dragged element
    this.analyzeHorizontalDistancePattern(draggedElementBbox, staticElements, distanceGuidelines, distanceMarkers);

    // Analyze vertical spacing patterns with dragged element
    this.analyzeVerticalDistancePattern(draggedElementBbox, staticElements, distanceGuidelines, distanceMarkers);

    console.log('Generated', distanceGuidelines.length, 'distance guidelines and', distanceMarkers.length, 'distance markers');
    return { distanceGuidelines, distanceMarkers };
  }

  // Analyze horizontal distance patterns including dragged element
  private analyzeHorizontalDistancePattern(
    draggedBbox: BoundingBox,
    staticElements: Array<{ id: string; type: 'path' | 'text' | 'group'; bbox: BoundingBox }>,
    distanceGuidelines: DistanceGuideLine[],
    distanceMarkers: DistanceMarker[]
  ): void {
    // Sort static elements by their left edge X position
    const sortedElements = [...staticElements].sort((a, b) => a.bbox.x - b.bbox.x);

    // Try to find where the dragged element fits in the horizontal sequence
    for (let insertIndex = 0; insertIndex <= sortedElements.length; insertIndex++) {
      // Create sequence with dragged element inserted
      const fullSequence = [...sortedElements];
      fullSequence.splice(insertIndex, 0, { 
        id: 'dragged', 
        type: 'path' as const, 
        bbox: draggedBbox 
      });

      // Check if this creates a valid distance pattern
      const pattern = this.analyzeHorizontalSequencePattern(fullSequence);
      if (pattern.isValid) {
        // Create guidelines for all distances in the pattern
        pattern.distances.forEach((distanceInfo, index) => {
          // Create guideline for this distance
          const guideline: DistanceGuideLine = {
            id: generateId(),
            type: 'horizontal',
            startPosition: distanceInfo.startX,
            endPosition: distanceInfo.endX,
            distance: distanceInfo.distance,
            elements: distanceInfo.elements,
            color: distanceInfo.isPending ? '#ff8800' : this.config.distanceGuideColor, // Orange for pending distance
            visible: true,
            dashArray: distanceInfo.isPending ? '4 4' : 'none' // Dashed for pending
          };
          distanceGuidelines.push(guideline);

          // Create distance marker
          const centerY = (distanceInfo.y1 + distanceInfo.y2) / 2;
          distanceMarkers.push({
            id: generateId(),
            x: distanceInfo.startX + distanceInfo.distance / 2,
            y: centerY,
            type: 'cross',
            distance: distanceInfo.distance,
            color: distanceInfo.isPending ? '#ff8800' : this.config.distanceGuideColor
          });
        });
        
        // Only show the first valid pattern found
        break;
      }
    }
  }

  // Analyze a horizontal sequence to find distance patterns
  private analyzeHorizontalSequencePattern(
    sequence: Array<{ id: string; type: 'path' | 'text' | 'group'; bbox: BoundingBox }>
  ): { 
    isValid: boolean; 
    distances: Array<{
      startX: number;
      endX: number;
      distance: number;
      elements: string[];
      isPending: boolean;
      y1: number;
      y2: number;
    }> 
  } {
    if (sequence.length < 2) {
      return { isValid: false, distances: [] };
    }

    const distances = [];
    const distanceValues = [];

    // Calculate all distances between consecutive elements
    for (let i = 0; i < sequence.length - 1; i++) {
      const elem1 = sequence[i];
      const elem2 = sequence[i + 1];
      
      const distance = this.calculateHorizontalDistance(elem1.bbox, elem2.bbox);
      const isPending = elem1.id === 'dragged' || elem2.id === 'dragged';
      
      distances.push({
        startX: elem1.bbox.x + elem1.bbox.width,
        endX: elem2.bbox.x,
        distance,
        elements: [elem1.id, elem2.id],
        isPending,
        y1: elem1.bbox.y + elem1.bbox.height / 2,
        y2: elem2.bbox.y + elem2.bbox.height / 2
      });
      
      distanceValues.push(distance);
    }

    // Check if we have at least 2 distances for a pattern
    if (distanceValues.length < 2) {
      return { isValid: false, distances: [] };
    }

    // Find the most common distance (within tolerance)
    const patternDistance = this.findPatternDistance(distanceValues);
    
    if (patternDistance === null) {
      return { isValid: false, distances: [] };
    }

    // Count how many distances match the pattern
    const matchingDistances = distanceValues.filter(d => 
      Math.abs(d - patternDistance) <= this.config.distanceTolerance
    ).length;

    // Pattern is valid if at least 2 distances match (including the pending one)
    const isValid = matchingDistances >= 2;

    return { 
      isValid, 
      distances: isValid ? distances.filter(d => 
        Math.abs(d.distance - patternDistance) <= this.config.distanceTolerance
      ) : [] 
    };
  }

  // Find the distance that appears most frequently in the sequence
  private findPatternDistance(distances: number[]): number | null {
    if (distances.length === 0) return null;

    // Group distances by similarity (within tolerance)
    const groups: number[][] = [];
    
    distances.forEach(distance => {
      let found = false;
      for (const group of groups) {
        if (Math.abs(group[0] - distance) <= this.config.distanceTolerance) {
          group.push(distance);
          found = true;
          break;
        }
      }
      if (!found) {
        groups.push([distance]);
      }
    });

    // Find the group with the most distances
    let maxGroupSize = 0;
    let patternDistance = null;

    groups.forEach(group => {
      if (group.length > maxGroupSize) {
        maxGroupSize = group.length;
        // Use average of the group as pattern distance
        patternDistance = group.reduce((sum, d) => sum + d, 0) / group.length;
      }
    });

    // Only return pattern if at least 2 distances match
    return maxGroupSize >= 2 ? patternDistance : null;
  }

  // Analyze vertical distance patterns including dragged element
  private analyzeVerticalDistancePattern(
    draggedBbox: BoundingBox,
    staticElements: Array<{ id: string; type: 'path' | 'text' | 'group'; bbox: BoundingBox }>,
    distanceGuidelines: DistanceGuideLine[],
    distanceMarkers: DistanceMarker[]
  ): void {
    // Sort static elements by their top edge Y position
    const sortedElements = [...staticElements].sort((a, b) => a.bbox.y - b.bbox.y);

    // Try to find where the dragged element fits in the vertical sequence
    for (let insertIndex = 0; insertIndex <= sortedElements.length; insertIndex++) {
      // Create sequence with dragged element inserted
      const fullSequence = [...sortedElements];
      fullSequence.splice(insertIndex, 0, { 
        id: 'dragged', 
        type: 'path' as const, 
        bbox: draggedBbox 
      });

      // Check if this creates a valid distance pattern
      const pattern = this.analyzeVerticalSequencePattern(fullSequence);
      if (pattern.isValid) {
        // Create guidelines for all distances in the pattern
        pattern.distances.forEach((distanceInfo, index) => {
          // Create guideline for this distance
          const guideline: DistanceGuideLine = {
            id: generateId(),
            type: 'vertical',
            startPosition: distanceInfo.startY,
            endPosition: distanceInfo.endY,
            distance: distanceInfo.distance,
            elements: distanceInfo.elements,
            color: distanceInfo.isPending ? '#ff8800' : this.config.distanceGuideColor, // Orange for pending distance
            visible: true,
            dashArray: distanceInfo.isPending ? '4 4' : 'none' // Dashed for pending
          };
          distanceGuidelines.push(guideline);

          // Create distance marker
          const centerX = (distanceInfo.x1 + distanceInfo.x2) / 2;
          distanceMarkers.push({
            id: generateId(),
            x: centerX,
            y: distanceInfo.startY + distanceInfo.distance / 2,
            type: 'cross',
            distance: distanceInfo.distance,
            color: distanceInfo.isPending ? '#ff8800' : this.config.distanceGuideColor
          });
        });
        
        // Only show the first valid pattern found
        break;
      }
    }
  }

  // Analyze a vertical sequence to find distance patterns
  private analyzeVerticalSequencePattern(
    sequence: Array<{ id: string; type: 'path' | 'text' | 'group'; bbox: BoundingBox }>
  ): { 
    isValid: boolean; 
    distances: Array<{
      startY: number;
      endY: number;
      distance: number;
      elements: string[];
      isPending: boolean;
      x1: number;
      x2: number;
    }> 
  } {
    if (sequence.length < 2) {
      return { isValid: false, distances: [] };
    }

    const distances = [];
    const distanceValues = [];

    // Calculate all distances between consecutive elements
    for (let i = 0; i < sequence.length - 1; i++) {
      const elem1 = sequence[i];
      const elem2 = sequence[i + 1];
      
      const distance = this.calculateVerticalDistance(elem1.bbox, elem2.bbox);
      const isPending = elem1.id === 'dragged' || elem2.id === 'dragged';
      
      distances.push({
        startY: elem1.bbox.y + elem1.bbox.height,
        endY: elem2.bbox.y,
        distance,
        elements: [elem1.id, elem2.id],
        isPending,
        x1: elem1.bbox.x + elem1.bbox.width / 2,
        x2: elem2.bbox.x + elem2.bbox.width / 2
      });
      
      distanceValues.push(distance);
    }

    // Check if we have at least 2 distances for a pattern
    if (distanceValues.length < 2) {
      return { isValid: false, distances: [] };
    }

    // Find the most common distance (within tolerance)
    const patternDistance = this.findPatternDistance(distanceValues);
    
    if (patternDistance === null) {
      return { isValid: false, distances: [] };
    }

    // Count how many distances match the pattern
    const matchingDistances = distanceValues.filter(d => 
      Math.abs(d - patternDistance) <= this.config.distanceTolerance
    ).length;

    // Pattern is valid if at least 2 distances match (including the pending one)
    const isValid = matchingDistances >= 2;

    return { 
      isValid, 
      distances: isValid ? distances.filter(d => 
        Math.abs(d.distance - patternDistance) <= this.config.distanceTolerance
      ) : [] 
    };
  }

  // Calculate horizontal distance between two bounding boxes
  private calculateHorizontalDistance(bbox1: BoundingBox, bbox2: BoundingBox): number {
    const rightEdge1 = bbox1.x + bbox1.width;
    const leftEdge2 = bbox2.x;
    return Math.max(0, leftEdge2 - rightEdge1);
  }

  // Calculate vertical distance between two bounding boxes
  private calculateVerticalDistance(bbox1: BoundingBox, bbox2: BoundingBox): number {
    const bottomEdge1 = bbox1.y + bbox1.height;
    const topEdge2 = bbox2.y;
    return Math.max(0, topEdge2 - bottomEdge1);
  }

  // Generate grid guideline points
  public generateGridGuides(viewBox: { x: number; y: number; width: number; height: number }): GuidelinePoint[] {
    const points: GuidelinePoint[] = [];
    const { gridSize } = this.config;

    // Generate grid points within viewbox
    const startX = Math.floor(viewBox.x / gridSize) * gridSize;
    const endX = Math.ceil((viewBox.x + viewBox.width) / gridSize) * gridSize;
    const startY = Math.floor(viewBox.y / gridSize) * gridSize;
    const endY = Math.ceil((viewBox.y + viewBox.height) / gridSize) * gridSize;

    for (let x = startX; x <= endX; x += gridSize) {
      for (let y = startY; y <= endY; y += gridSize) {
        points.push({
          x,
          y,
          type: 'grid',
          description: `Grid point (${x}, ${y})`
        });
      }
    }

    return points;
  }

  // Find nearest snapping points
  public findSnapTargets(
    currentPoint: Point,
    allGuidePoints: GuidelinePoint[]
  ): { point: GuidelinePoint; distance: number }[] {
    const { detectionRadius } = this.config;
    const candidates: { point: GuidelinePoint; distance: number }[] = [];

    allGuidePoints.forEach(guidePoint => {
      const distance = Math.sqrt(
        Math.pow(currentPoint.x - guidePoint.x, 2) + 
        Math.pow(currentPoint.y - guidePoint.y, 2)
      );

      if (distance <= detectionRadius) {
        candidates.push({ point: guidePoint, distance });
      }
    });

    // Sort by distance (closest first)
    return candidates.sort((a, b) => a.distance - b.distance);
  }

  // Create guidelines for snapping
  public createSnapGuidelines(snapTarget: Point, currentPoint: Point): GuideLine[] {
    const guidelines: GuideLine[] = [];

    // Convert Point to GuidelinePoint for the guidelines
    const snapTargetGuidePoint: GuidelinePoint = {
      x: snapTarget.x,
      y: snapTarget.y,
      type: 'dynamic'
    };

    // Horizontal guideline
    if (Math.abs(snapTarget.y - currentPoint.y) <= this.config.detectionRadius) {
      guidelines.push({
        id: generateId(),
        type: 'horizontal',
        position: snapTarget.y,
        points: [snapTargetGuidePoint],
        color: this.config.guidelineColor,
        visible: true
      });
    }

    // Vertical guideline
    if (Math.abs(snapTarget.x - currentPoint.x) <= this.config.detectionRadius) {
      guidelines.push({
        id: generateId(),
        type: 'vertical',
        position: snapTarget.x,
        points: [snapTargetGuidePoint],
        color: this.config.guidelineColor,
        visible: true
      });
    }

    return guidelines;
  }

  // Start snapping operation with bounding box alignment
  public startSnapping(
    currentPoint: Point,
    paths: SVGPath[],
    texts: TextElementType[],
    groups: SVGGroup[],
    viewBox: { x: number; y: number; width: number; height: number },
    excludeElementId?: string,
    excludeElementType?: 'path' | 'text' | 'group'
  ): Point {
    console.log('GuidelinesManager startSnapping called - enabled:', this.config.enabled, 'currentPoint:', currentPoint);
    if (!this.config.enabled) {
      return currentPoint;
    }

    // Generate all guide points from other elements
    const allGuidePoints: GuidelinePoint[] = [];

    if (this.config.showDynamicGuides) {
      allGuidePoints.push(
        ...this.generateDynamicGuides(paths, texts, groups, excludeElementId, excludeElementType)
      );
    }

    if (this.config.showGridGuides) {
      allGuidePoints.push(...this.generateGridGuides(viewBox));
    }

    // Get the bounding box of the element being dragged
    const draggedBbox = this.getDraggedElementBoundingBox(
      excludeElementId,
      excludeElementType,
      paths,
      texts,
      groups,
      currentPoint
    );

    // Generate distance guidelines and markers
    const { distanceGuidelines, distanceMarkers } = this.generateDistanceGuides(
      draggedBbox, paths, texts, groups, excludeElementId, excludeElementType
    );

    if (!draggedBbox) {
      console.log('No dragged element bbox found, fallback to point snapping');
      return this.startPointSnapping(currentPoint, allGuidePoints);
    }

    // Get alignment points for the dragged element
    const draggedAlignmentPoints = getBoundingBoxAlignmentPoints(draggedBbox);
    console.log('Dragged element alignment points:', draggedAlignmentPoints.length);

    // Find the best alignment between dragged element points and guide points
    const bestAlignment = this.findBestBoundingBoxAlignment(draggedAlignmentPoints, allGuidePoints);

    if (!bestAlignment) {
      this.clearSnap();
      return currentPoint;
    }

    // Calculate the offset needed to align the dragged element
    const alignmentOffset = {
      x: bestAlignment.targetPoint.x - bestAlignment.sourcePoint.x,
      y: bestAlignment.targetPoint.y - bestAlignment.sourcePoint.y
    };

    const finalSnapPoint = {
      x: currentPoint.x + alignmentOffset.x,
      y: currentPoint.y + alignmentOffset.y
    };

    // Create guidelines for the alignment
    const guidelines = this.createSnapGuidelines(bestAlignment.targetPoint, bestAlignment.sourcePoint);

    // Set active snap
    this.activeSnap = {
      guidelines,
      distanceGuidelines,
      distanceMarkers,
      snapPoint: finalSnapPoint,
      targetPoint: currentPoint,
      snapTime: Date.now()
    };

    this.notifyListeners();
    console.log('Snapping to alignment:', bestAlignment, 'finalSnapPoint:', finalSnapPoint);
    return finalSnapPoint;
  }

  // Helper method to get bounding box of dragged element
  private getDraggedElementBoundingBox(
    excludeElementId?: string,
    excludeElementType?: 'path' | 'text' | 'group',
    paths?: SVGPath[],
    texts?: TextElementType[],
    groups?: SVGGroup[],
    currentPoint?: Point
  ): BoundingBox | null {
    if (!excludeElementId || !excludeElementType || !currentPoint) {
      return null;
    }

    if (excludeElementType === 'path' && paths) {
      const path = paths.find(p => p.id === excludeElementId);
      if (path) {
        return getPathBoundingBox(path);
      }
    } else if (excludeElementType === 'text' && texts) {
      const text = texts.find(t => t.id === excludeElementId);
      if (text) {
        return getTextBoundingBox(text);
      }
    } else if (excludeElementType === 'group' && groups) {
      const group = groups.find(g => g.id === excludeElementId);
      if (group) {
        return getGroupBoundingBox(group);
      }
    }

    return null;
  }

  // Find best alignment between dragged element points and guide points
  private findBestBoundingBoxAlignment(
    draggedPoints: Point[],
    guidePoints: GuidelinePoint[]
  ): { sourcePoint: Point; targetPoint: Point; distance: number } | null {
    let bestAlignment: { sourcePoint: Point; targetPoint: Point; distance: number } | null = null;
    let shortestDistance = this.config.detectionRadius;

    for (const draggedPoint of draggedPoints) {
      for (const guidePoint of guidePoints) {
        // Check for vertical alignment (same X coordinate)
        const verticalDistance = Math.abs(draggedPoint.x - guidePoint.x);
        if (verticalDistance <= shortestDistance) {
          const alignment = {
            sourcePoint: draggedPoint,
            targetPoint: { x: guidePoint.x, y: draggedPoint.y },
            distance: verticalDistance
          };
          
          if (!bestAlignment || verticalDistance < bestAlignment.distance) {
            bestAlignment = alignment;
            shortestDistance = verticalDistance;
          }
        }

        // Check for horizontal alignment (same Y coordinate)
        const horizontalDistance = Math.abs(draggedPoint.y - guidePoint.y);
        if (horizontalDistance <= shortestDistance) {
          const alignment = {
            sourcePoint: draggedPoint,
            targetPoint: { x: draggedPoint.x, y: guidePoint.y },
            distance: horizontalDistance
          };
          
          if (!bestAlignment || horizontalDistance < bestAlignment.distance) {
            bestAlignment = alignment;
            shortestDistance = horizontalDistance;
          }
        }
      }
    }

    return bestAlignment;
  }

  // Fallback to point-based snapping
  private startPointSnapping(currentPoint: Point, allGuidePoints: GuidelinePoint[]): Point {
    const snapTargets = this.findSnapTargets(currentPoint, allGuidePoints);
    console.log('GuidelinesManager found snapTargets:', snapTargets.length, 'allGuidePoints:', allGuidePoints.length);

    if (snapTargets.length === 0) {
      this.clearSnap();
      return currentPoint;
    }

    // Use the closest snap target
    const closestTarget = snapTargets[0];
    const snapPoint = closestTarget.point;

    // Create guidelines
    const guidelines = this.createSnapGuidelines(snapPoint, currentPoint);

    // Determine final snap position
    let finalSnapPoint = { ...currentPoint };
    
    // Snap to closest point if within radius
    if (closestTarget.distance <= this.config.detectionRadius) {
      finalSnapPoint = { x: snapPoint.x, y: snapPoint.y };
    }

    // Set active snap
    this.activeSnap = {
      guidelines,
      distanceGuidelines: [],
      distanceMarkers: [],
      snapPoint: finalSnapPoint,
      targetPoint: currentPoint,
      snapTime: Date.now()
    };

    this.notifyListeners();
    return finalSnapPoint;
  }

  // Clear current snap
  public clearSnap(): void {
    if (this.activeSnap) {
      this.activeSnap = null;
      this.notifyListeners();
    }
  }

  // Check if snap is still active (within duration)
  public isSnapActive(): boolean {
    if (!this.activeSnap) return false;
    return (Date.now() - this.activeSnap.snapTime) < this.config.snapDuration;
  }

  // Update snap position during drag
  public updateSnap(
    currentPoint: Point,
    paths: SVGPath[],
    texts: TextElementType[],
    groups: SVGGroup[],
    viewBox: { x: number; y: number; width: number; height: number },
    excludeElementId?: string,
    excludeElementType?: 'path' | 'text' | 'group'
  ): Point {
    return this.startSnapping(currentPoint, paths, texts, groups, viewBox, excludeElementId, excludeElementType);
  }
}

export const guidelinesManager = GuidelinesManager.getInstance();