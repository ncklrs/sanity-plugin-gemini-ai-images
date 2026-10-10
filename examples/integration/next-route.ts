// Copy to app/api/ai/[[...path]]/route.ts and adjust the server import.
import {media} from './server.js'
export const runtime = 'nodejs'
export const maxDuration = 180 // Confirm your host plan supports this duration.
export const POST = media.handle
export const GET = media.handle
export const DELETE = media.handle
export const OPTIONS = media.handle
