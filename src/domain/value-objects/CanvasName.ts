/**
 * CanvasName Value Object
 * Ensures canvas names follow business rules
 */

export class CanvasName {
  private readonly _value: string;
  private static readonly MAX_LENGTH = 100;
  private static readonly MIN_LENGTH = 1;

  constructor(value: string) {
    const trimmedValue = value.trim();

    if (trimmedValue.length < CanvasName.MIN_LENGTH) {
      throw new Error(`Canvas name must be at least ${CanvasName.MIN_LENGTH} character`);
    }

    if (trimmedValue.length > CanvasName.MAX_LENGTH) {
      throw new Error(`Canvas name cannot exceed ${CanvasName.MAX_LENGTH} characters`);
    }

    this._value = trimmedValue;
  }

  static createDefault(): CanvasName {
    return new CanvasName(`Flow ${new Date().toLocaleDateString()}`);
  }

  get value(): string {
    return this._value;
  }

  isValid(): boolean {
    return this._value.length >= CanvasName.MIN_LENGTH &&
           this._value.length <= CanvasName.MAX_LENGTH;
  }

  equals(other: CanvasName): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}