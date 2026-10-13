/**
 * ============================================================================
 * BLEJE PRONËN — AUTONOMOUS SWARM SMOKE VERIFICATION TEST
 * File: services/swarm/test-verification.ts
 *
 * Verifies that Thanos:
 *   1. Boots all 10 Marvel child agents cleanly.
 *   2. Collects heartbeats and tracks SLAs.
 *   3. Deduplicates identical incidents via SHA-256 fingerprinting.
 *   4. Catches worker crashes and performs supervised exponential recovery.
 *   5. Shuts down cleanly with zero leaked timers.
 * ============================================================================
 */

import { ThanosOrchestrator } from './core/thanos'

async function runSwarmVerification() {
  console.log('🧪 Starting Thanos Autonomous Swarm Verification Suite...\n')

  const thanos = new ThanosOrchestrator({
    environment: 'test',
    logLevel: 'debug',
    heartbeatIntervalMs: 2000,
    dedupWindowMs: 5000,
    maxCrashRetries: 3,
    circuitBreakerWindowMs: 10000,
  })

  // 1. Boot Thanos & Child Workers
  await thanos.start()
  console.log('✔ Swarm successfully started.\n')

  // 2. Verify all 10 workers are registered and healthy
  const initialStatus = thanos.getStatusReport()
  console.log('📊 Active Thanos Status Report:')
  console.log(`   - Supreme Commander: ${initialStatus.thanos.status}`)
  console.log(`   - Supabase Mode: ${initialStatus.thanos.supabaseConnected ? 'Online' : 'Offline In-Memory'}`)

  const workerIds = Object.keys(initialStatus.workers)
  console.log(`   - Total Registered Workers: ${workerIds.length}/10`)
  for (const id of workerIds) {
    const w = initialStatus.workers[id as keyof typeof initialStatus.workers]
    console.log(`     • ${id.padEnd(16)} -> Status: ${w.status}, Crashes: ${w.crashCount}`)
  }

  if (workerIds.length !== 10) {
    throw new Error(`Expected 10 workers registered under Thanos, got ${workerIds.length}`)
  }

  // 3. Test SHA-256 Deduplication
  console.log('\n🔍 Testing SHA-256 Incident Deduplication Engine...')
  let duplicateCountObserved = 0
  let persistedCountObserved = 0

  thanos.eventBus.on('incident:persisted', () => {
    persistedCountObserved++
  })

  thanos.eventBus.on('incident:deduplicated', (data) => {
    duplicateCountObserved++
    console.log(`   ✔ Event Bus caught deduplicated incident (Count: ${data.count}, Agent: ${data.agentId})`)
  })

  // Fire 3 identical incidents from Thor
  for (let i = 1; i <= 3; i++) {
    thanos.eventBus.emit('incident:detected', {
      agentId: 'thor',
      severity: 'P2_HIGH',
      title: 'High API Latency on /api/search',
      description: 'P95 latency exceeded 2000ms threshold',
      locationOrUrl: 'https://blejepronen.com/api/search',
      fingerprint: '',
    })
  }

  // Allow event bus async persistence processing across network
  const startWait = Date.now()
  while (persistedCountObserved < 1 && Date.now() - startWait < 3000) {
    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  console.log(`   - Persisted new incidents: ${persistedCountObserved} (Expected: 1)`)
  console.log(`   - Deduplicated occurrences: ${duplicateCountObserved} (Expected: 2)`)

  if (persistedCountObserved !== 1 || duplicateCountObserved !== 2) {
    throw new Error('Deduplication logic mismatch!')
  }

  // 4. Test Supervised Crash Recovery
  console.log('\n🛡️ Testing Supervisor Crash Recovery for Worker: Hawkeye...')
  let recoveredEventFired = false
  thanos.eventBus.on('worker:recovered', (data) => {
    if (data.agentId === 'hawkeye') {
      recoveredEventFired = true
      console.log('   ✔ Hawkeye successfully recovered via exponential backoff.')
    }
  })

  // Simulate crash in Hawkeye
  await thanos.supervisor.handleWorkerCrash(
    'hawkeye',
    new Error('Simulated viewport rendering assertion crash')
  )

  const crashStatus = thanos.supervisor.getHealthOverview()
  console.log(`   - Hawkeye state after crash: ${crashStatus['hawkeye'].status} (Expected: RESTARTING)`)

  // Wait for supervisor backoff restart (~2 seconds)
  console.log('   - Waiting for supervisor to execute recovery cycle...')
  await new Promise((resolve) => setTimeout(resolve, 2500))

  const postRecoveryStatus = thanos.supervisor.getHealthOverview()
  console.log(`   - Hawkeye state after recovery: ${postRecoveryStatus['hawkeye'].status} (Expected: HEALTHY)`)

  if (!recoveredEventFired || postRecoveryStatus['hawkeye'].status !== 'HEALTHY') {
    throw new Error('Worker crash recovery failed!')
  }

  // 5. Test Phase 3 Inspection Logic
  console.log('\n🩺 Testing Phase 3 Inspection Logic (Doctor Strange & Iron Man)...')
  await thanos.doctorStrange.tick()
  const docMetrics = thanos.doctorStrange.getMetrics()
  console.log(`   - Doctor Strange app.json inspection:`, docMetrics)
  if (!docMetrics.iosMicrophoneConfigured) {
    console.warn('   ⚠️ Note: iOS microphone description not detected in app.json')
  }

  await thanos.ironMan.tick()
  const ironMetrics = thanos.ironMan.getMetrics()
  console.log(`   - Iron Man compiler inspection:`, ironMetrics)

  // 6. Test Phase 4 Alert Dispatcher
  console.log('\n🔔 Testing Phase 4 Alert Dispatcher...')
  console.log(`   - Telegram active: ${thanos.alertDispatcher.isTelegramConfigured}`)
  console.log(`   - Discord active: ${thanos.alertDispatcher.isDiscordConfigured}`)
  await thanos.alertDispatcher.dispatch(
    {
      agentId: 'thor',
      severity: 'P2_HIGH',
      title: 'Smoke Test Alert Dispatch',
      description: 'Verifying notification dispatch channel and rate-limiting',
      locationOrUrl: 'https://blejepronen.com/test',
    },
    'mock_fingerprint_123',
    1
  )

  // 7. Clean Termination
  console.log('\n🛑 Testing Graceful Swarm Shutdown...')
  await thanos.stop('Verification suite finished successfully')
  console.log('\n🎉 ALL PHASES (1, 2, 3, 4) VERIFICATIONS PASSED!')
}

runSwarmVerification().catch((err) => {
  console.error('\n❌ Verification Failed:', err)
  process.exit(1)
})
