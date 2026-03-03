import { createStubSDK } from './stub.js'

export * from './sdk.js'
export * from './types.js'
export { createStubSDK }

/**
 * Default SDK instance. In production, the plugin loader replaces this
 * with a real implementation that communicates via postMessage to the main thread.
 * In development and testing, this stub is used.
 */
export const sdk = createStubSDK()
