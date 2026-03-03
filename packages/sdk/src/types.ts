// Minimal JSON Schema type — sufficient for tool input validation
export interface JSONSchema {
    type: 'object' | 'string' | 'number' | 'boolean' | 'array'
    properties?: Record<string, JSONSchema & { description?: string; default?: unknown }>
    required?: string[]
    items?: JSONSchema
    enum?: unknown[]
    description?: string
}
