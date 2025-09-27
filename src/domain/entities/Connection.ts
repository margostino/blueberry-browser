export class Connection {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly type: 'straight' | 'curved' | 'step';
  readonly style: 'solid' | 'dashed' | 'dotted';
  readonly color: string;
  readonly label?: string;
  readonly fromPoint?: { x: number; y: number };
  readonly toPoint?: { x: number; y: number };
  readonly created: Date;

  constructor(params: {
    id: string;
    from: string;
    to: string;
    type?: 'straight' | 'curved' | 'step';
    style?: 'solid' | 'dashed' | 'dotted';
    color?: string;
    label?: string;
    fromPoint?: { x: number; y: number };
    toPoint?: { x: number; y: number };
    created?: Date;
  }) {
    this.id = params.id;
    this.from = params.from;
    this.to = params.to;
    this.type = params.type || 'curved';
    this.style = params.style || 'solid';
    this.color = params.color || '#3b82f6';
    this.label = params.label;
    this.fromPoint = params.fromPoint;
    this.toPoint = params.toPoint;
    this.created = params.created || new Date();
  }

  isValid(): boolean {
    return !!this.id &&
           !!this.from &&
           !!this.to &&
           this.from !== this.to; // Cannot connect to itself
  }

  static generateId(): string {
    return `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}