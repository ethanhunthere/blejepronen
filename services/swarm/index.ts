/**
 * ============================================================================
 * BLEJE PRONËN : AUTONOMOUS SWARM ENTRYPOINT
 * File: services/swarm/index.ts
 *
 * Boots Supreme Commander Thanos supervising the 10 Marvel child agents.
 * Can be imported programmatically or run directly via node / tsx.
 * ============================================================================
 */

import { ThanosOrchestrator } from './core/thanos'

export * from './types'
export * from './config'
export * from './core/thanos'
export * from './core/event-bus'
export * from './core/deduplicator'
export * from './core/supervisor'

/**
 * Bootstrap function to start the swarm daemon
 */
export async function bootstrapSwarm(): Promise<ThanosOrchestrator> {
  const thanos = new ThanosOrchestrator()
  thanos.attachProcessSignalHandlers()
  await thanos.start()
  return thanos
}

// Auto-start if executed directly as the entry file
if (require.main === module) {
  bootstrapSwarm().catch((err) => {
    console.error('Fatal crash during Thanos Swarm initialization:', err)
    process.exit(1)
  })
}
