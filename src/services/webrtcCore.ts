import { Platform } from 'react-native';

export let MediaDevices: any = null;
export let PeerConnection: any = null;
export let SessionDescription: any = null;
export let IceCandidate: any = null;
export let NativeRTCView: any = null;

if (Platform.OS !== 'web') {
  try {
    const webrtc = require('react-native-webrtc');
    MediaDevices = webrtc.mediaDevices;
    PeerConnection = webrtc.RTCPeerConnection;
    SessionDescription = webrtc.RTCSessionDescription;
    IceCandidate = webrtc.RTCIceCandidate;
    NativeRTCView = webrtc.RTCView;
  } catch (e) {
    console.warn('react-native-webrtc module not found or failed to load natively', e);
  }
} else {
  if (typeof window !== 'undefined') {
    MediaDevices = navigator.mediaDevices;
    PeerConnection = (window as any).RTCPeerConnection || (window as any).webkitRTCPeerConnection;
    SessionDescription = (window as any).RTCSessionDescription || (window as any).webkitRTCSessionDescription;
    IceCandidate = (window as any).RTCIceCandidate || (window as any).webkitRTCIceCandidate;
  }
}
