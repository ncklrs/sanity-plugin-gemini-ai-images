import type {Principal} from './types.js'
export function createSanityAuthorizer(options: {
  projectId: string
  dataset: string
  fetch?: typeof fetch
  allowVideo?: boolean
  allowedRoles?: string[]
  allowUser?: (user: any) => Promise<boolean>
}) {
  const transport = options.fetch ?? fetch
  if (
    !/^[a-z0-9]+$/.test(options.projectId) ||
    !/^[-\w]+$/.test(options.dataset)
  )
    throw new Error('Invalid project or dataset')
  return async (request: Request): Promise<Principal | null> => {
    const authorization = request.headers.get('authorization')
    if (!authorization?.startsWith('Bearer ') || authorization.length > 4096)
      return null
    try {
      const identity = await transport(
        'https://api.sanity.io/v2021-06-07/users/me',
        {headers: {Authorization: authorization}},
      )
      if (!identity.ok) return null
      const user = (await identity.json()) as any
      if (!user.id || (options.allowUser && !(await options.allowUser(user))))
        return null
      const project = await transport(
        `https://api.sanity.io/v2021-06-07/projects/${options.projectId}`,
        {headers: {Authorization: authorization}},
      )
      if (!project.ok) return null
      const membership = (await project.json()) as {
        members?: Array<{
          id: string
          isRobot?: boolean
          role?: string
          roles?: Array<{name: string}>
        }>
      }
      const member = membership.members?.find(
        (member) => member.id === user.id && !member.isRobot,
      )
      const allowedRoles = options.allowedRoles ?? [
        'administrator',
        'admin',
        'developer',
        'editor',
        'contributor',
      ]
      if (
        !member ||
        ![member.role, ...(member.roles ?? []).map((role) => role.name)].some(
          (role) => role && allowedRoles.includes(role),
        )
      )
        return null
      // Use the user's token, not the server token, to verify dataset read access.
      const query = await transport(
        `https://${options.projectId}.api.sanity.io/v2024-01-01/data/query/${options.dataset}?query=count(*)`,
        {headers: {Authorization: authorization}},
      )
      if (!query.ok) return null
      return {
        id: user.id,
        sanityToken: authorization.slice(7),
        canGenerate: true,
        canUseVideo: options.allowVideo ?? false,
      }
    } catch {
      return null
    }
  }
}
