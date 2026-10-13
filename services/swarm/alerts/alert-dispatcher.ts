/**
 * ============================================================================
 * BLEJE PRONËN : ALERT DISPATCHER (PHASE 4)
 * File: services/swarm/alerts/alert-dispatcher.ts
 *
 * Dispatches high-priority incidents (P1_CRITICAL & P2_HIGH) to Telegram
 * and/or Discord with Markdown formatting and alert rate-limiting.
 * ============================================================================
 */

import { SwarmConfig } from '../config'
import { IncidentReportPayload, IncidentSeverity } from '../types'

export class AlertDispatcher {
  private readonly config: SwarmConfig
  private readonly alertHistory = new Map<string, number>()
  private readonly cooldownMs = 15 * 60 * 1000 // 15-minute cooldown per incident fingerprint

  constructor(config: SwarmConfig) {
    this.config = config
  }

  get isTelegramConfigured(): boolean {
    return Boolean(this.config.telegramBotToken && this.config.telegramChatId)
  }

  get isDiscordConfigured(): boolean {
    return Boolean(this.config.discordWebhookUrl)
  }

  /**
   * Dispatch an incident alert to configured notification channels
   */
  async dispatch(
    payload: IncidentReportPayload,
    fingerprint: string,
    occurrenceCount = 1
  ): Promise<void> {
    // Only dispatch alerts for Critical, High, or Warning incidents
    if (payload.severity === 'P4_INFO') return

    // Cooldown check
    const now = Date.now()
    const lastAlertTime = this.alertHistory.get(fingerprint)
    if (lastAlertTime && now - lastAlertTime < this.cooldownMs && occurrenceCount > 1) {
      // Suppressed during cooldown
      return
    }

    this.alertHistory.set(fingerprint, now)

    const promises: Promise<void>[] = []

    if (this.isTelegramConfigured) {
      promises.push(this.sendTelegram(payload, fingerprint, occurrenceCount))
    }

    if (this.isDiscordConfigured) {
      promises.push(this.sendDiscord(payload, fingerprint, occurrenceCount))
    }

    // Always log to stdout
    this.logConsole(payload, fingerprint, occurrenceCount)

    if (promises.length > 0) {
      await Promise.allSettled(promises)
    }
  }

  private getSeverityBadge(severity: IncidentSeverity): string {
    switch (severity) {
      case 'P1_CRITICAL':
        return '🚨 [P1_CRITICAL]'
      case 'P2_HIGH':
        return '⚠️ [P2_HIGH]'
      case 'P3_WARNING':
        return '⚡ [P3_WARNING]'
      case 'P4_INFO':
        return 'ℹ️ [P4_INFO]'
    }
  }

  private logConsole(
    payload: IncidentReportPayload,
    fingerprint: string,
    occurrenceCount: number
  ): void {
    const badge = this.getSeverityBadge(payload.severity)
    console.log(
      `\n🔔 [ALERT DISPATCH] ${badge} ${payload.agentId.toUpperCase()}: ${payload.title} (Count: ${occurrenceCount}, FP: ${fingerprint.slice(0, 8)})`
    )
  }

  private async sendTelegram(
    payload: IncidentReportPayload,
    fingerprint: string,
    occurrenceCount: number
  ): Promise<void> {
    const botToken = this.config.telegramBotToken!
    const chatId = this.config.telegramChatId!
    const badge = this.getSeverityBadge(payload.severity)

    const text = [
      `<b>${badge} Bleje Pronën Incident</b>`,
      ``,
      `<b>Agent:</b> ${payload.agentId.toUpperCase()}`,
      `<b>Title:</b> ${payload.title}`,
      `<b>Occurrences:</b> ${occurrenceCount}`,
      payload.locationOrUrl ? `<b>Location:</b> <code>${payload.locationOrUrl}</code>` : null,
      `<b>Description:</b> ${payload.description}`,
      `<b>Fingerprint:</b> <code>${fingerprint.slice(0, 12)}</code>`,
      `<b>Timestamp:</b> ${new Date().toISOString()}`,
    ]
      .filter(Boolean)
      .join('\n')

    try {
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      })

      if (!res.ok) {
        const errorText = await res.text()
        console.warn('[AlertDispatcher] Telegram dispatch failed:', errorText)
      }
    } catch (err) {
      console.warn('[AlertDispatcher] Telegram network exception:', err)
    }
  }

  private async sendDiscord(
    payload: IncidentReportPayload,
    fingerprint: string,
    occurrenceCount: number
  ): Promise<void> {
    const webhookUrl = this.config.discordWebhookUrl!
    const badge = this.getSeverityBadge(payload.severity)

    const color =
      payload.severity === 'P1_CRITICAL'
        ? 0xff0000 // Red
        : payload.severity === 'P2_HIGH'
        ? 0xffa500 // Orange
        : 0xffff00 // Yellow

    const embed = {
      title: `${badge} ${payload.title}`,
      description: payload.description,
      color,
      fields: [
        { name: 'Agent', value: payload.agentId.toUpperCase(), inline: true },
        { name: 'Occurrences', value: String(occurrenceCount), inline: true },
        { name: 'Fingerprint', value: fingerprint.slice(0, 12), inline: true },
        ...(payload.locationOrUrl
          ? [{ name: 'Location', value: payload.locationOrUrl, inline: false }]
          : []),
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'Bleje Pronën Thanos Swarm' },
    }

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
      })

      if (!res.ok) {
        console.warn('[AlertDispatcher] Discord dispatch failed with status:', res.status)
      }
    } catch (err) {
      console.warn('[AlertDispatcher] Discord network exception:', err)
    }
  }
}
