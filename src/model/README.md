# FlowCanvas Zod Models

## Architecture Overview

This model layer provides comprehensive type-safe validation for the FlowCanvas feature using Zod schemas. The architecture follows these principles:

1. **Single Source of Truth**: All types are derived from Zod schemas
2. **Composable Schemas**: Reusable primitives build up to complex types
3. **Smart Defaults**: Schemas include sensible defaults where applicable
4. **Runtime Validation**: Catch data integrity issues early
5. **Type Inference**: TypeScript types automatically derived from schemas

## Schema Hierarchy

```
common/
  └── primitives.ts       # Reusable atomic schemas (UUID, URL, Color, etc.)

flowcanvas/
  ├── flowItem.ts         # Canvas item validation
  ├── connection.ts       # Item connection validation
  ├── flowCanvas.ts       # Canvas container validation
  ├── captureRequest.ts   # Content capture validation
  ├── validation.ts       # Validation utilities & error handling
  └── index.ts           # Public API exports
```

## Key Features

### Type Safety

- All data structures validated at runtime
- TypeScript types automatically inferred
- Custom error messages for better UX

### Smart Validation

- Cross-field validation (e.g., connections must reference existing items)
- Business rule enforcement (e.g., items can't connect to themselves)
- Size and boundary constraints

### Factory Functions

- `createFlowCanvas()` - Create validated canvases
- `createFlowItem()` - Create validated items with defaults
- `createConnection()` - Create validated connections
- `createCaptureRequest()` - Create validated capture requests

### Utilities

- Partial validation for updates
- Type guards for runtime checks
- Migration helpers for schema evolution
- Canvas merging with conflict resolution

## Integration Points

### 1. Storage Layer

Replace `FlowCanvasStorage` methods with validated versions:

```typescript
async saveCanvas(data: unknown) {
  const canvas = validateFlowCanvas(data);
  // Save validated canvas
}
```

### 2. IPC Handlers

Validate all incoming IPC data:

```typescript
ipcMain.handle('flowcanvas:create', async (_, data) => {
  const canvas = validateFlowCanvas(data);
  // Process validated canvas
});
```

### 3. Frontend API

Type-safe API with automatic validation:

```typescript
const api: FlowCanvasAPI = {
  createCanvas: (name) => createFlowCanvas(name),
  captureItem: (req) => validateCaptureRequest(req)
};
```

### 4. React Components

Use validated types in React state:

```typescript
const [canvas, setCanvas] = useState<FlowCanvas | null>(null);
const [items, setItems] = useState<FlowItem[]>([]);
```

## Error Handling

The `ValidationError` class provides detailed error information:

```typescript
try {
  const canvas = validateFlowCanvas(data);
} catch (error) {
  if (error instanceof ValidationError) {
    // Access detailed validation issues
    error.issues.forEach(issue => {
      console.log(`${issue.path}: ${issue.message}`);
    });
  }
}
```

## Migration Strategy

1. **Phase 1**: Add validation to IPC handlers (non-breaking)
2. **Phase 2**: Update storage layer with validation
3. **Phase 3**: Replace type definitions with Zod-inferred types
4. **Phase 4**: Add validation to frontend components

## Benefits

- **Data Integrity**: Ensure all canvas data is valid
- **Better Error Messages**: Users get clear feedback on invalid data
- **Type Safety**: Compile-time and runtime type checking
- **Documentation**: Schemas serve as living documentation
- **Maintainability**: Single source of truth for data shapes
- **Evolution**: Easy to version and migrate schemas
