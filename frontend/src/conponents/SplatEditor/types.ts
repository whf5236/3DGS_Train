import { Scene } from './src/scene'
import { Events } from './src/events'

declare global {
  interface Window {
    scene: Scene & {
      events?: Events
      destroy?: () => void
      getSplats?: () => any
    }
    launchQueue?: {
      setConsumer: (callback: (launchParams: LaunchParams) => void) => void
    }
  }

  interface LaunchParams {
    readonly files: FileSystemFileHandle[]
  }
}

export {}
