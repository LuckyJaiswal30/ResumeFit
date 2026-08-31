import { registerHooks } from 'node:module'

const projectRoot = new URL('../../', import.meta.url).href

registerHooks({
  resolve(specifier, context, nextResolve) {
    const target = specifier.startsWith('@/')
      ? new URL(specifier.slice(2), projectRoot).href
      : specifier

    try {
      return nextResolve(target, context)
    } catch (error) {
      if (/^[.@]/.test(specifier) && !/\.[a-z]+$/.test(target)) {
        return nextResolve(`${target}.ts`, context)
      }
      throw error
    }
  },
})
