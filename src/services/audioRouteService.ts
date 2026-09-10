import { NativeModules, Platform } from 'react-native';

const { AudioRouteModule, TelecomModule } = NativeModules;

export const AudioRouteService = {
  setSpeakerOn: async (enableSpeaker: boolean): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        if (AudioRouteModule?.setSpeakerphoneOn) {
          await AudioRouteModule.setSpeakerphoneOn(enableSpeaker);
        }
        if (TelecomModule?.setSpeakerOn) {
          await TelecomModule.setSpeakerOn(enableSpeaker);
        }
        return enableSpeaker;
      } catch (e) {
        console.warn('[AudioRouteService] setSpeakerphoneOn error:', e);
      }
    }
    return enableSpeaker;
  },

  isSpeakerOn: async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        if (AudioRouteModule?.isSpeakerphoneOn) {
          return await AudioRouteModule.isSpeakerphoneOn();
        }
      } catch (e) {}
    }
    return false;
  },

  isBluetoothConnected: async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        if (AudioRouteModule?.isBluetoothConnected) {
          return await AudioRouteModule.isBluetoothConnected();
        }
      } catch (e) {}
    }
    return false;
  },

  setProximitySensorEnabled: async (enabled: boolean): Promise<void> => {
    if (Platform.OS === 'android' && AudioRouteModule?.setProximitySensorEnabled) {
      try {
        await AudioRouteModule.setProximitySensorEnabled(enabled);
      } catch (e) {}
    }
  },

  resetAudioRoute: async (): Promise<void> => {
    if (Platform.OS === 'android') {
      try {
        if (AudioRouteModule?.resetAudioMode) {
          await AudioRouteModule.resetAudioMode();
        }
        if (TelecomModule?.resetAudioRoute) {
          await TelecomModule.resetAudioRoute();
        }
      } catch (e) {}
    }
  }
};

