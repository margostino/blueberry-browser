/**
 * CanvasId Value Object
 * Ensures canvas IDs are valid and provides type safety
 */

export class CanvasId {
  private readonly _value: string;

  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('CanvasId cannot be empty');
    }
    this._value = value;
  }

  static generate(): CanvasId {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return new CanvasId(`${timestamp}-${random}`);
  }

  get value(): string {
    return this._value;
  }

  equals(other: CanvasId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}