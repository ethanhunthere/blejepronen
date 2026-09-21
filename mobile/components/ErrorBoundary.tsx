import React, { Component, ErrorInfo, ReactNode } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
} from 'react-native'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'

interface Props {
  children: ReactNode
  fallback?: (error: Error, retry: () => void) => ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  showDetails: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })
    console.error('Uncaught application error caught by ErrorBoundary:', error, errorInfo)
  }

  private handleRetry = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    })
  }

  private handleGoHome = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    })
    try {
      router.replace('/(tabs)' as any)
    } catch {
      // Fallback if router fails
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback && this.state.error) {
        return this.props.fallback(this.state.error, this.handleRetry)
      }

      const errorMessage =
        this.state.error?.message || 'Ndodhi një problem i papritur në sistem.'

      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <AlertTriangle size={32} color="#D4AF37" strokeWidth={2.2} />
            </View>

            <Text style={styles.title}>Ndodhi një gabim</Text>
            <Text style={styles.subtitle}>
              Aplikacioni hasi një problem të papritur. Të dhënat tuaja janë të sigurta.
            </Text>

            <View style={styles.messageBox}>
              <Text style={styles.messageText} numberOfLines={3}>
                {errorMessage}
              </Text>
            </View>

            <View style={styles.buttonRow}>
              <Pressable style={styles.primaryBtn} onPress={this.handleRetry}>
                <RefreshCw size={16} color="#071C18" strokeWidth={2.4} />
                <Text style={styles.primaryBtnText}>Provo përsëri</Text>
              </Pressable>

              <Pressable style={styles.secondaryBtn} onPress={this.handleGoHome}>
                <Home size={16} color="#FFFFFF" strokeWidth={2.2} />
                <Text style={styles.secondaryBtnText}>Kthehu te Ballina</Text>
              </Pressable>
            </View>

            {__DEV__ && (
              <Pressable
                style={styles.detailsToggle}
                onPress={() =>
                  this.setState((prev) => ({ showDetails: !prev.showDetails }))
                }
              >
                <Text style={styles.detailsToggleText}>
                  {this.state.showDetails ? 'Fshih detajet teknike' : 'Shiko detajet teknike'}
                </Text>
              </Pressable>
            )}

            {this.state.showDetails && (
              <ScrollView style={styles.detailsScroll} nestedScrollEnabled>
                <Text style={styles.detailsText}>
                  {this.state.error?.stack || String(this.state.error)}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack}
                </Text>
              </ScrollView>
            )}
          </View>
        </View>
      )
    }

    return this.props.children
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#071C18',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0D2721',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(212, 175, 55, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.72)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  messageBox: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 20,
  },
  messageText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.65)',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center',
  },
  buttonRow: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: '#D4AF37',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#071C18',
  },
  secondaryBtn: {
    width: '100%',
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  detailsToggle: {
    marginTop: 16,
    paddingVertical: 6,
  },
  detailsToggleText: {
    fontSize: 12,
    color: '#D4AF37',
    fontWeight: '600',
  },
  detailsScroll: {
    width: '100%',
    maxHeight: 160,
    marginTop: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 10,
    padding: 10,
  },
  detailsText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
})
