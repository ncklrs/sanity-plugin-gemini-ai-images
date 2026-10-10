import {createGenerationHandler,environmentOptions,createEnvironmentMediaHandler,type EngineOptions} from 'sanity-plugin-gemini-ai-images-engine'
export * from 'sanity-plugin-gemini-ai-images-engine'
export function createNextHandlers(options:EngineOptions){const handler=createGenerationHandler(options);return {POST:handler,OPTIONS:handler}}
export const POST=createEnvironmentMediaHandler()??createGenerationHandler(environmentOptions())
export const GET=POST
export const DELETE=POST
export const OPTIONS=POST
