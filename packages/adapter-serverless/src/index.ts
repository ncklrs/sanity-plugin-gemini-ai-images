import {createGenerationHandler,environmentOptions,createEnvironmentMediaHandler} from 'sanity-plugin-gemini-ai-images-engine'
export * from 'sanity-plugin-gemini-ai-images-engine'
export const handler=createEnvironmentMediaHandler()??createGenerationHandler(environmentOptions())
export default handler
