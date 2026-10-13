/**
 * ============================================================================
 * BLEJE PRONËN — PM2 SWARM ECOSYSTEM (PHASE 4)
 * File: services/swarm/daemon/ecosystem.config.cjs
 *
 * PM2 configuration for zero-downtime supervision, automatic log rotation,
 * and memory-capped restarting.
 * ============================================================================
 */

module.exports = {
  apps: [
    {
      name: 'blejepronen-thanos-swarm',
      script: 'services/swarm/index.ts',
      interpreter: 'node_modules/.bin/tsx',
      exec_mode: 'fork',
      cwd: '/home/f0id/Downloads/blejepronen',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      exp_backoff_restart_delay: 2000,
      env: {
        NODE_ENV: 'production',
        SWARM_ENVIRONMENT: 'production',
      },
      env_development: {
        NODE_ENV: 'development',
        SWARM_ENVIRONMENT: 'development',
      },
      error_file: 'var/logs/swarm-error.log',
      out_file: 'var/logs/swarm-out.log',
      merge_logs: true,
      time: true,
    },
  ],
}
