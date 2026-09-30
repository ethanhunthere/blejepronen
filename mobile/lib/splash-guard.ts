import * as SplashScreen from 'expo-splash-screen'
import { Asset } from 'expo-asset'

const SPLASH_LOGO = require('../assets/images/splash-logo.png')

SplashScreen.preventAutoHideAsync().catch(() => {})
Asset.loadAsync([SPLASH_LOGO]).catch(() => {})
