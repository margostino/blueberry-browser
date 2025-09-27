export interface FlowCanvasDTO {
  id: string;
  name: string;
  items: FlowItemDTO[];
  connections: ConnectionDTO[];
  created: number;
  modified: number;
  zoom: number;
  viewport: { x: number; y: number };
  layout: 'freeform' | 'grid' | 'tree';
}

export interface FlowItemDTO {
  id: string;
  type: 'note' | 'screenshot' | 'link' | 'code' | 'diagram';
  content: any;
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
  metadata?: Record<string, any>;
  created?: number;
  modified?: number;
}

export interface ConnectionDTO {
  id: string;
  from: string;
  to: string;
  type?: 'straight' | 'curved' | 'step';
  style?: 'solid' | 'dashed' | 'dotted';
  color?: string;
  label?: string;
  fromPoint?: { x: number; y: number };
  toPoint?: { x: number; y: number };
  created?: number;
}

export interface CreateCanvasRequestDTO {
  name?: string;
  layout?: 'freeform' | 'grid' | 'tree';
}

export interface UpdateCanvasRequestDTO {
  id: string;
  name?: string;
  items?: FlowItemDTO[];
  connections?: ConnectionDTO[];
  zoom?: number;
  viewport?: { x: number; y: number };
}

export interface CanvasResponseDTO {
  success: boolean;
  data?: FlowCanvasDTO;
  error?: string;
}