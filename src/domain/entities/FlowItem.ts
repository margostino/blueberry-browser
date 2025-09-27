export class FlowItem {
  readonly id: { value: string };
  readonly type: 'note' | 'screenshot' | 'link' | 'code' | 'diagram';
  readonly content: any;
  readonly position: { x: number; y: number };
  readonly dimensions: { width: number; height: number };
  readonly metadata: Record<string, any>;
  readonly created: Date;
  readonly modified: Date;

  constructor(params: {
    id: string;
    type: 'note' | 'screenshot' | 'link' | 'code' | 'diagram';
    content: any;
    position: { x: number; y: number };
    dimensions: { width: number; height: number };
    metadata?: Record<string, any>;
    created?: Date;
    modified?: Date;
  }) {
    this.id = { value: params.id };
    this.type = params.type;
    this.content = params.content;
    this.position = params.position;
    this.dimensions = params.dimensions;
    this.metadata = params.metadata || {};
    this.created = params.created || new Date();
    this.modified = params.modified || new Date();
  }

  move(x: number, y: number): FlowItem {
    return new FlowItem({
      ...this,
      position: { x, y },
      modified: new Date()
    });
  }

  resize(width: number, height: number): FlowItem {
    return new FlowItem({
      ...this,
      dimensions: { width, height },
      modified: new Date()
    });
  }

  updateContent(content: any): FlowItem {
    return new FlowItem({
      ...this,
      content,
      modified: new Date()
    });
  }

  isValid(): boolean {
    return !!this.id.value &&
           !!this.type &&
           this.position.x >= 0 &&
           this.position.y >= 0 &&
           this.dimensions.width > 0 &&
           this.dimensions.height > 0;
  }
}