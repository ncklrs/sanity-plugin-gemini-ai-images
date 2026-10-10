// Configure one Web Request function for /api/ai and every /api/ai/* route.
import {media} from './server.js'
export default media.handle
export const config = {path: ['/api/ai', '/api/ai/*']}
