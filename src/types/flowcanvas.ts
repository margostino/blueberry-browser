export interface FlowItemSource {
  url: string;
  title: string;
  timestamp: number;
}
export interface FlowItemPosition {
  x: number;
  y: number;
}
export interface FlowItemDimensions {
  width: number;
  height: number;
}
export interface FlowItem {
  id: string;
  type: 'text' | 'image' | 'screenshot' | 'note' | 'card';
  content: string;
  source: FlowItemSource;
  position: FlowItemPosition;
  dimensions: FlowItemDimensions;
  thumbnail?: string;
  connections?: string[];
  tags?: string[];
  color?: string;
}
export interface Connection {
  id: string;
  from: string;  
  to: string;    
  type?: 'straight' | 'curved' | 'step';
  color?: string;
  label?: string;
  style?: 'solid' | 'dashed' | 'dotted';
  fromPoint?: { x: number; y: number };  
  toPoint?: { x: number; y: number };    
}
export interface FlowCanvas {
  id: string;
  name: string;
  items: FlowItem[];
  connections: Connection[];
  created: number;
  modified: number;
  zoom?: number;
  viewport?: {
    x: number;
    y: number;
  };
  layout?: 'freeform' | 'grid' | 'list';
}
export interface CaptureRequest {
  type: 'text' | 'image' | 'screenshot';
  content: string;
  source: {
    url: string;
    title: string;
  };
}