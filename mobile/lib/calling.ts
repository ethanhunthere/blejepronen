import { Platform, Vibration } from 'react-native'
import { supabase } from './supabase'

/**
 * Bleje Pronën — In-App Calling Engine (100% free, zero vendor lock-in)
 * ─────────────────────────────────────────────────────────────────────
 * Real WhatsApp-style voice calls over WebRTC with:
 *   • Transport:  react-native-webrtc (open source)
 *   • Signaling:  Supabase Realtime broadcast (already in the app — free tier)
 *   • NAT travel: Google STUN + openrelay.metered.ca free public TURN
 * Cost: $0/month. No SDK keys, no per-minute billing.
 *
 * Channel layout
 *   bp_call_ring_<userId>  → incoming-call notifications + accept/decline/busy
 *   bp_call_<callId>       → offer / answer / ICE candidates / hangup control
 *
 * IMPORTANT: react-native-webrtc ships native code — it cannot run inside
 * Expo Go. We therefore load it lazily and gracefully: in Expo Go the call
 * UI is simply disabled ("Thirrjet kërkojnë versionin e plotë") while the
 * rest of the app is unaffected. In a development/store build it works fully.
 */

// ─── Lazy, crash-proof WebRTC loading ────────────────────────────────
interface WebRTCModule {
  RTCPeerConnection: any
  RTCSessionDescription: any
  RTCIceCandidate: any
  mediaDevices: { getUserMedia: (c: any) => Promise<any> } | null
}

let webrtc: WebRTCModule | null = null
let webrtcLoadAttempted = false

function loadWebRTC(): WebRTCModule | null {
  if (webrtcLoadAttempted) return webrtc
  webrtcLoadAttempted = true
  try {
    // Lazy require — never at module scope, so Expo Go keeps working.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const m = require('react-native-webrtc')
    webrtc = {
      RTCPeerConnection: m.RTCPeerConnection,
      RTCSessionDescription: m.RTCSessionDescription,
      RTCIceCandidate: m.RTCIceCandidate,
      mediaDevices: m.mediaDevices ?? null,
    }
  } catch {
    // Expo Go / web without support — calls disabled, app keeps running
    webrtc = null
  }
  return webrtc
}

/** Whether in-app calling is available in the current runtime. */
export function isCallingSupported(): boolean {
  if (Platform.OS === 'web') return false
  return loadWebRTC() !== null
}

// ─── Free ICE servers ────────────────────────────────────────────────
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turn:openrelay.metered.ca:443?transport=tcp',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
]

// ─── Types ───────────────────────────────────────────────────────────
export type CallStatus =
  | 'idle'
  | 'outgoing' // ringing — waiting for the other side to accept
  | 'incoming' // our phone is ringing
  | 'connecting' // accepted, negotiating WebRTC
  | 'connected'
  | 'ended'

export interface CallPeerInfo {
  userId: string
  name: string
  avatarUrl?: string | null
  conversationId?: string | null
}

export interface CallState {
  status: CallStatus
  role: 'caller' | 'callee' | null
  peer: CallPeerInfo | null
  muted: boolean
  connectedAt: number | null
  endedReason: string | null
}

type Listener = (state: CallState) => void

interface IncomingPayload {
  type: 'incoming'
  callId: string
  from: string
  name: string
  avatarUrl?: string | null
  conversationId?: string | null
}

interface RingReply {
  type: 'accepted' | 'declined' | 'busy'
  callId: string
}

interface CallSignal {
  type: 'ready' | 'offer' | 'answer' | 'ice' | 'hangup' | 'cancel'
  callId: string
  sdp?: unknown
  candidate?: unknown
  /** Sender's user ID — lets each side ignore its own broadcast echoes */
  by?: string
}

const RING_TIMEOUT_MS = 45_000
const CONNECT_TIMEOUT_MS = 25_000

type AnyChannel = ReturnType<typeof supabase.channel>

// ─── Engine ──────────────────────────────────────────────────────────
class CallEngine {
  private state: CallState = {
    status: 'idle',
    role: null,
    peer: null,
    muted: false,
    connectedAt: null,
    endedReason: null,
  }

  private listeners = new Set<Listener>()

  private pc: any | null = null
  private localStream: any | null = null
  private localTrack: any | null = null
  private ringHapticsInterval: ReturnType<typeof setInterval> | null = null

  private ringChannel: AnyChannel | null = null
  private callChannel: AnyChannel | null = null
  /** ICE candidates that arrived before the remote description was applied */
  private pendingIce: unknown[] = []

  private myUserId: string | null = null
  private incomingTeardown: (() => void) | null = null

  private callId: string | null = null
  private timers: ReturnType<typeof setTimeout>[] = []
  private lastOfferSdp: unknown = null
  /** Topic of the ring channel the CURRENT incoming call arrived on (callee side) */
  private incomingRingTopic: string | null = null

  // Caller display info (set before starting a call)
  private callerName = ''
  private callerAvatar: string | null = null

  setCallerIdentity(name: string, avatarUrl: string | null): void {
    this.callerName = name
    this.callerAvatar = avatarUrl
  }

  // ── Public API ────────────────────────────────────────────────────
  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    fn(this.state)
    return () => this.listeners.delete(fn)
  }

  getState(): CallState {
    return this.state
  }

  /** Listen for incoming calls. Call once per auth user (from the root layout). */
  listenForIncoming(userId: string | null): void {
    this.myUserId = userId
    this.incomingTeardown?.()
    this.incomingTeardown = null
    if (!userId) return

    let channel: AnyChannel | null = null

    channel = supabase.channel(`bp_call_ring_${userId}`)
    channel
      .on('broadcast', { event: 'ring' }, ({ payload }: { payload: IncomingPayload }) => {
        const inc = payload
        if (inc?.type !== 'incoming' || !inc.callId) return
        if (this.state.status !== 'idle' && this.state.status !== 'ended') {
          // Already on a call — politely answer "busy"
          void channel?.send({
            type: 'broadcast',
            event: 'ring-reply',
            payload: { type: 'busy', callId: inc.callId } as RingReply,
          })
          return
        }
        this.callId = inc.callId
        this.incomingRingTopic = `bp_call_ring_${this.myUserId}`
        this.reset({
          status: 'incoming',
          role: 'callee',
          peer: {
            userId: inc.from,
            name: inc.name || 'Përdorues',
            avatarUrl: inc.avatarUrl ?? null,
            conversationId: inc.conversationId ?? null,
          },
        })
        this.startIncomingRingback()
      })
      .on('broadcast', { event: 'ring-cancel' }, ({ payload }: { payload: { callId: string } }) => {
        if (this.state.status === 'incoming' && payload?.callId === this.callId) {
          this.stopRingback()
          this.reset({ status: 'idle', role: null, peer: null })
        }
      })
      .subscribe()

    this.incomingTeardown = () => {
      if (channel) supabase.removeChannel(channel)
    }
  }

  async startCall(peer: CallPeerInfo): Promise<void> {
    if (this.state.status !== 'idle' && this.state.status !== 'ended') return
    if (!this.myUserId || !peer?.userId) return

    // Expo Go / web: WebRTC native module is absent — show a graceful notice
    if (!isCallingSupported()) {
      this.reset({ status: 'ended', role: 'caller', peer })
      this.setState({ status: 'ended', endedReason: 'unsupported' })
      this.timers.push(
        setTimeout(() => {
          this.setState({ status: 'idle', role: null, peer: null, endedReason: null })
        }, 1800)
      )
      return
    }

    // Resolve the CALLER's own display identity from the profiles table so the
    // callee sees who is calling (self-contained — works from any screen).
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('first_name, last_name, company_name, avatar_url')
        .eq('id', this.myUserId)
        .single()
      if (prof) {
        const nm = prof.company_name || [prof.first_name, prof.last_name].filter(Boolean).join(' ')
        this.callerName = (nm || '').trim()
        this.callerAvatar = (prof as any).avatar_url ?? null
      }
    } catch {
      // Identity lookup is best-effort; call still proceeds
    }

    const callId = `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
    this.callId = callId
    this.reset({ status: 'outgoing', role: 'caller', peer })

    this.ringChannel = supabase.channel(`bp_call_ring_${peer.userId}`)
    this.ringChannel
      .on('broadcast', { event: 'ring-reply' }, ({ payload }: { payload: RingReply }) => {
        if (payload?.callId !== this.callId) return
        if (payload.type === 'accepted') {
          this.clearTimers()
          this.setState({ status: 'connecting' })
          void this.runCallerNegotiation()
        } else if (payload.type === 'declined') {
          this.finish('declined')
        } else if (payload.type === 'busy') {
          this.finish('busy')
        }
      })
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED' || this.state.status !== 'outgoing') return
        const incoming: IncomingPayload = {
          type: 'incoming',
          callId,
          from: this.myUserId!,
          name: this.callerName,
          avatarUrl: this.callerAvatar,
          conversationId: peer.conversationId ?? null,
        }
        void this.ringChannel?.send({ type: 'broadcast', event: 'ring', payload: incoming })
      })

    this.timers.push(
      setTimeout(() => {
        if (this.state.status === 'outgoing') this.finish('timeout')
      }, RING_TIMEOUT_MS)
    )
  }

  acceptIncoming(): void {
    if (this.state.status !== 'incoming' || !this.callId) return
    this.clearTimers()
    this.stopRingback()
    this.setState({ status: 'connecting' })
    // Tell the caller immediately (before WebRTC negotiation) so their UI
    // switches from "Po telefonon…" to "Po lidhet…" without waiting.
    if (this.incomingRingTopic) {
      const replyCh = supabase.channel(this.incomingRingTopic)
      replyCh
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            void replyCh.send({
              type: 'broadcast',
              event: 'ring-reply',
              payload: { type: 'accepted', callId: this.callId } as RingReply,
            })
            setTimeout(() => {
              supabase.removeChannel(replyCh)
            }, 1500)
          }
        })
    }
    void this.runCalleeNegotiation(this.callId)
  }

  declineIncoming(): void {
    if (this.state.status !== 'incoming' || !this.callId) return
    this.stopRingback()
    // Reply on the ring channel the call arrived on (callee side has no
    // this.ringChannel — that belongs to the caller only).
    if (this.incomingRingTopic) {
      const replyCh = supabase.channel(this.incomingRingTopic)
      replyCh
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            void replyCh.send({
              type: 'broadcast',
              event: 'ring-reply',
              payload: { type: 'declined', callId: this.callId } as RingReply,
            })
            setTimeout(() => {
              supabase.removeChannel(replyCh)
            }, 1500)
          }
        })
    }
    this.cleanupMedia()
    this.finish('declined')
  }

  endCall(): void {
    const { status } = this.state
    if (status === 'incoming') {
      this.declineIncoming()
      return
    }
    if (status === 'idle' || status === 'ended') return

    this.stopRingback()
    if (this.callChannel) {
      void this.callChannel.send({
        type: 'broadcast',
        event: 'signal',
        payload: {
          type: 'hangup',
          callId: this.callId,
          by: this.myUserId ?? undefined,
        } as CallSignal,
      })
    } else if (status === 'outgoing' && this.ringChannel) {
      void this.ringChannel.send({
        type: 'broadcast',
        event: 'ring-cancel',
        payload: { callId: this.callId },
      })
    }
    this.cleanupMedia()
    this.leaveChannels()
    this.finish('hangup')
  }

  toggleMute(): void {
    if (!this.localTrack) return
    const next = !this.state.muted
    try {
      this.localTrack.enabled = !next
    } catch {
      ;(this.localTrack as any).setEnabled?.(!next)
    }
    this.setState({ muted: next })
  }

  // ── Negotiation ───────────────────────────────────────────────────
  private async runCallerNegotiation(): Promise<void> {
    try {
      await this.openCallChannel(this.callId!)
      await this.setupPeerConnection()
      if (!this.pc) return

      const offer = await this.pc.createOffer({ offerToReceiveAudio: true })
      await this.pc.setLocalDescription(offer)
      this.lastOfferSdp = offer // kept so we can re-send on 'ready' (subscribe race)
      void this.callChannel?.send({
        type: 'broadcast',
        event: 'signal',
        payload: {
          type: 'offer',
          callId: this.callId,
          sdp: offer,
          by: this.myUserId ?? undefined,
        } as CallSignal,
      })

      this.timers.push(
        setTimeout(() => {
          if (this.state.status === 'connecting') this.finish('failed')
        }, CONNECT_TIMEOUT_MS)
      )
    } catch (e) {
      console.warn('Caller negotiation failed:', e)
      this.finish('failed')
    }
  }

  private async runCalleeNegotiation(callId: string): Promise<void> {
    try {
      await this.openCallChannel(callId)
      // CRITICAL: create the peer connection and mic BEFORE the offer arrives,
      // otherwise the offer would be silently dropped and the call would fail.
      await this.setupPeerConnection()
      // Tell the caller we are listening — it (re)sends the offer on this signal,
      // closing the subscribe-order race between the two devices.
      void this.callChannel?.send({
        type: 'broadcast',
        event: 'signal',
        payload: { type: 'ready', callId, by: this.myUserId ?? undefined } as CallSignal,
      })
      this.timers.push(
        setTimeout(() => {
          if (this.state.status === 'connecting') this.finish('failed')
        }, CONNECT_TIMEOUT_MS)
      )
    } catch (e) {
      console.warn('Callee negotiation failed:', e)
      this.finish('failed')
    }
  }

  private async setupPeerConnection(): Promise<void> {
    const rtc = loadWebRTC()
    if (!rtc?.mediaDevices || !rtc.RTCPeerConnection) {
      this.finish('unsupported')
      return
    }

    this.localStream = (await rtc.mediaDevices.getUserMedia({ audio: true })) as any
    this.localTrack = (this.localStream as any)?.getAudioTracks?.()[0] ?? null

    const pc = new rtc.RTCPeerConnection({ iceServers: ICE_SERVERS })
    this.pc = pc as any

    ;(this.localStream as any).getTracks().forEach((track: any) => {
      pc.addTrack(track, this.localStream)
    })

    ;(pc as any).addEventListener('icecandidate', (event: any) => {
      if (event?.candidate) {
        void this.callChannel?.send({
          type: 'broadcast',
          event: 'signal',
          payload: {
            type: 'ice',
            callId: this.callId,
            candidate: event.candidate,
          } as CallSignal,
        })
      }
    })

    ;(pc as any).addEventListener('connectionstatechange', () => {
      const cs = (this.pc as any)?.connectionState
      if (cs === 'connected') {
        this.clearTimers()
        this.setState({ status: 'connected', connectedAt: Date.now() })
      } else if (cs === 'failed') {
        if (this.state.status === 'connected' || this.state.status === 'connecting') {
          this.finish('failed')
        }
      }
    })
  }

  private openCallChannel(callId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const ch = supabase.channel(`bp_call_${callId}`)
        ch.on('broadcast', { event: 'signal' }, ({ payload }: { payload: CallSignal }) => {
          void this.handleSignal(payload)
        }).subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.callChannel = ch
            resolve()
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            reject(new Error(`Call channel error: ${status}`))
          }
        })
      } catch (e) {
        reject(e)
      }
    })
  }

  private async handleSignal(signal: CallSignal): Promise<void> {
    if (signal?.callId !== this.callId) return
    // Supabase echoes broadcasts back to the sender — never process our own signals
    if (signal.by && signal.by === this.myUserId) return

    switch (signal.type) {
      case 'ready':
        // Callee just joined the call channel — (re)send our offer to close
        // the subscribe-order race. Duplicates are ignored by the callee.
        if (this.state.role === 'caller' && this.lastOfferSdp) {
          void this.callChannel?.send({
            type: 'broadcast',
            event: 'signal',
            payload: {
              type: 'offer',
              callId: this.callId,
              sdp: this.lastOfferSdp,
              by: this.myUserId ?? undefined,
            } as CallSignal,
          })
        }
        break

      case 'offer':
        if (this.state.role === 'callee' && this.pc) {
          // Ignore duplicate offers (initial + ready-triggered resend)
          if (this.pc.remoteDescription) break
          try {
            await this.pc.setRemoteDescription(
              new (loadWebRTC()!.RTCSessionDescription)(signal.sdp)
            )
            // Flush any ICE candidates that arrived before the offer
            const queued = this.pendingIce.splice(0)
            for (const c of queued) {
              try {
                await this.pc.addIceCandidate(new (loadWebRTC()!.RTCIceCandidate)(c))
              } catch {}
            }
            const answer = await this.pc.createAnswer()
            await this.pc.setLocalDescription(answer)
            void this.callChannel?.send({
              type: 'broadcast',
              event: 'signal',
              payload: {
                type: 'answer',
                callId: this.callId,
                sdp: answer,
                by: this.myUserId ?? undefined,
              } as CallSignal,
            })
          } catch (e) {
            console.warn('Callee answer failed:', e)
            this.finish('failed')
          }
        }
        break

      case 'answer':
        if (this.state.role === 'caller' && this.pc) {
          // Ignore duplicate answers
          if (this.pc.remoteDescription) break
          try {
            await this.pc.setRemoteDescription(
              new (loadWebRTC()!.RTCSessionDescription)(signal.sdp)
            )
          } catch (e) {
            console.warn('Caller setRemoteDescription failed:', e)
          }
        }
        break

      case 'ice':
        if (this.pc && signal.candidate) {
          // If the remote description isn't set yet, queue — never drop.
          if (!this.pc.remoteDescription) {
            this.pendingIce.push(signal.candidate)
            break
          }
          try {
            await this.pc.addIceCandidate(new (loadWebRTC()!.RTCIceCandidate)(signal.candidate))
          } catch {
            // Malformed candidate — non-fatal
          }
        }
        break

      case 'hangup':
        this.cleanupMedia()
        this.leaveChannels()
        this.finish('hangup')
        break

      case 'cancel':
        // Caller withdrew the call while our phone was still ringing
        if (this.state.status === 'incoming') {
          this.stopRingback()
          this.cleanupMedia()
          this.reset({ status: 'idle', role: null, peer: null })
        }
        break
    }
  }

  private startIncomingRingback(): void {
    if (Platform.OS === 'web') return
    if (Platform.OS === 'android') {
      // Android supports repeating patterns natively
      Vibration.vibrate([600, 900, 600, 1400], true)
    } else {
      // iOS Vibration ignores patterns/repeat — pulse with haptics instead
      const buzz = () => {
        if (this.state.status !== 'incoming') return
        import('expo-haptics')
          .then((Haptics) => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning))
          .catch(() => {})
      }
      buzz()
      this.ringHapticsInterval = setInterval(buzz, 1400)
    }
    this.timers.push(
      setTimeout(() => {
        if (this.state.status === 'incoming') {
          this.stopRingback()
          this.finish('timeout')
        }
      }, RING_TIMEOUT_MS)
    )
  }

  private stopRingback(): void {
    Vibration.cancel()
    if (this.ringHapticsInterval) {
      clearInterval(this.ringHapticsInterval)
      this.ringHapticsInterval = null
    }
  }

  // ── State helpers ─────────────────────────────────────────────────
  private setState(patch: Partial<CallState>): void {
    this.state = { ...this.state, ...patch }
    for (const fn of this.listeners) {
      try {
        fn(this.state)
      } catch {
        // listener errors must never break the engine
      }
    }
  }

  private reset(patch: Partial<CallState>): void {
    this.clearTimers()
    this.setState({ ...patch, endedReason: null, connectedAt: null, muted: false })
  }

  private finish(reason: string): void {
    this.clearTimers()
    this.stopRingback()
    this.callId = null
    this.incomingRingTopic = null
    this.pendingIce = []
    this.lastOfferSdp = null
    this.setState({ status: 'ended', endedReason: reason, connectedAt: null })
    // Let the UI show the ended state briefly, then auto-dismiss
    this.timers.push(
      setTimeout(() => {
        this.setState({ status: 'idle', role: null, peer: null, endedReason: null })
      }, 1400)
    )
  }

  private cleanupMedia(): void {
    try {
      this.localStream?.getTracks().forEach((t: any) => t.stop())
    } catch {}
    try {
      this.pc?.close()
    } catch {}
    this.pc = null
    this.localStream = null
    this.localTrack = null
  }

  private leaveChannels(): void {
    try {
      if (this.callChannel) supabase.removeChannel(this.callChannel)
    } catch {}
    try {
      if (this.ringChannel && this.state.role === 'caller') {
        supabase.removeChannel(this.ringChannel)
      }
    } catch {}
    this.callChannel = null
    this.ringChannel = null
  }

  private clearTimers(): void {
    for (const t of this.timers) clearTimeout(t)
    this.timers = []
  }
}

export const callEngine = new CallEngine()




