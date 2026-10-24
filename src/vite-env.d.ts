/// <reference types="vite/client" />

declare module 'onnxruntime-web' {
  const env: { wasm: unknown; [key: string]: unknown };
  class InferenceSession {
    static create(path: string, options?: Record<string, unknown>): Promise<InferenceSession>;
    run(inputs: Record<string, unknown>): Promise<Record<string, unknown>>;
  }
  export { env, InferenceSession };
}

