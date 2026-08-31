import { NativeModules, Platform } from 'react-native';

const { AudioRouteModule } = NativeModules;

export const AudioRouteService = {
  setSpeakerOn: async (enableSpeaker: boolean): Promise<boolean> => {
    if (Platform.OS === 'android' && AudioRouteModule?.setSpeakerphoneOn) {
      try {
        return await AudioRouteModule.setSpeakerphoneOn(enableSpeaker);
      } catch (e) {
        console.warn('[AudioRouteService] setSpeakerphoneOn error:', e);
      }
    }
    return enableSpeaker;
  },

  isSpeakerOn: async (): Promise<boolean> => {
    if (Platform.OS === 'android' && AudioRouteModule?.isSpeakerphoneOn) {
      try {
        return await AudioRouteModule.isSpeakerphoneOn();
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
    if (Platform.OS === 'android' && AudioRouteModule?.resetAudioMode) {
      try {
        await AudioRouteModule.resetAudioMode();
      } catch (e) {}
    }
  }
};
