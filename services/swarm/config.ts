/**
 * ============================================================================
 * BLEJE PRONËN — SWARM CONFIGURATION LOADER
 * File: services/swarm/config.ts
 *
 * Reads isolated swarm environment variables with safe defaults and
 * seamless local dev fallback without leaking secrets.
 * ============================================================================
 */

import * as fs from 'fs'
import * as path from 'path'

function parseAndLoadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    for (const rawLine of content.split('\n')) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue
      const eqIndex = line.indexOf('=')
      if (eqIndex === -1) continue
      const key = line.slice(0, eqIndex).trim()
      let val = line.slice(eqIndex + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) {
        process.env[key] = val
      }
    }
  } catch {
    // Non-fatal if unreadable
  }
}

export interface SwarmConfig {
  readonly environment: 'development' | 'production' | 'test'
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error'
  readonly targetWebUrl: string
  readonly targetApiUrl: string
  readonly cronSecret?: string

  readonly supabaseUrl?: string
  readonly supabaseServiceRoleKey?: string
  readonly supabaseAnonKey?: string
  readonly databaseUrl?: string

  readonly githubToken?: string
  readonly githubRepo: string
  readonly gitWorkingDir: string

  readonly telegramBotToken?: string
  readonly telegramChatId?: string
  readonly discordWebhookUrl?: string

  readonly geminiApiKey?: string
  readonly openAiApiKey?: string

  readonly heartbeatIntervalMs: number
  readonly dedupWindowMs: number
  readonly maxCrashRetries: number
  readonly circuitBreakerWindowMs: number
}

export function loadSwarmConfig(): SwarmConfig {
  const cwd = process.env.SWARM_GIT_WORKING_DIR || process.cwd()
  parseAndLoadEnvFile(path.join(cwd, '.env.swarm'))
  parseAndLoadEnvFile(path.join(cwd, '.env.local'))

  const env = process.env.SWARM_ENVIRONMENT || process.env.NODE_ENV || 'development'
  const isProd = env === 'production'

  const targetWebUrl =
    process.env.SWARM_TARGET_WEB_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (isProd ? 'https://blejepronen.com' : 'http://localhost:3000')

  const targetApiUrl =
    process.env.SWARM_TARGET_API_URL ||
    `${targetWebUrl.replace(/\/$/, '')}/api`

  const supabaseUrl =
    process.env.SWARM_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL

  const supabaseServiceRoleKey =
    process.env.SWARM_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY

  const supabaseAnonKey =
    process.env.SWARM_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const workingDir =
    process.env.SWARM_GIT_WORKING_DIR ||
    process.cwd()

  return {
    environment: isProd ? 'production' : 'development',
    logLevel: (process.env.SWARM_LOG_LEVEL as SwarmConfig['logLevel']) || 'info',
    targetWebUrl,
    targetApiUrl,
    cronSecret: process.env.SWARM_CRON_SECRET || process.env.CRON_SECRET,

    supabaseUrl,
    supabaseServiceRoleKey,
    supabaseAnonKey,
    databaseUrl: process.env.SWARM_DATABASE_URL || process.env.DATABASE_URL,

    githubToken: process.env.SWARM_GITHUB_TOKEN || process.env.GITHUB_TOKEN,
    githubRepo: process.env.SWARM_GITHUB_REPO || 'ethanhunthere/blejepronen',
    gitWorkingDir: path.resolve(workingDir),

    telegramBotToken: process.env.SWARM_TELEGRAM_BOT_TOKEN,
    telegramChatId: process.env.SWARM_TELEGRAM_CHAT_ID,
    discordWebhookUrl: process.env.SWARM_DISCORD_WEBHOOK_URL,

    geminiApiKey: process.env.SWARM_GEMINI_API_KEY,
    openAiApiKey: process.env.SWARM_OPENAI_API_KEY,

    heartbeatIntervalMs: Number(process.env.SWARM_HEARTBEAT_INTERVAL_MS) || 30_000,
    dedupWindowMs: Number(process.env.SWARM_DEDUP_WINDOW_MS) || 3_600_000, // 1 hour
    maxCrashRetries: Number(process.env.SWARM_MAX_CRASH_RETRIES) || 5,
    circuitBreakerWindowMs: Number(process.env.SWARM_CIRCUIT_BREAKER_WINDOW_MS) || 300_000, // 5 minutes
  }
}
