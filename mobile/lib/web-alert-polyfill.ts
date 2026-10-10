import { Alert, Platform } from 'react-native'

/**
 * react-native-web ships Alert.alert as an empty function, so every
 * confirmation gate, validation dialog and error path that reports through
 * Alert is silently dead on the web target (delete listing, price validation,
 * forgot-password dialog…). Map it onto the browser's modal dialogs so those
 * paths reach the user there. Native is untouched.
 */
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  ;(Alert as unknown as { alert: unknown }).alert = (
    title?: string,
    message?: string,
    buttons?: { text?: string; onPress?: () => void; style?: 'cancel' | 'destructive' | 'default' }[]
  ) => {
    const text = message ? `${title}\n\n${message}` : String(title ?? '')
    const list = buttons?.length ? buttons : [{ text: 'OK', onPress: () => {} }]
    if (list.length === 1) {
      window.alert(text)
      list[0].onPress?.()
      return
    }
    const confirmed = window.confirm(text)
    if (confirmed) {
      const positive = list.find((b) => b.style !== 'cancel') ?? list[list.length - 1]
      positive.onPress?.()
    } else {
      list.find((b) => b.style === 'cancel')?.onPress?.()
    }
  }
}

export {}
