// API Gateway HTTP API payload v2 (also supports v1 request bodies).
import {createLambdaHandler} from 'sanity-plugin-gemini-ai-images-engine'
import {media} from './server.js'
export const handler = createLambdaHandler(media.handle)
