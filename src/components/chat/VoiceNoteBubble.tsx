import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VoiceService } from '../../services/voiceRecordingService';

interface VoiceNoteBubbleProps {
  audioUrl?: string;
  duration?: string;
  isMe: boolean;
  time: string;
}

export default function VoiceNoteBubble({
  audioUrl,
  duration = '0:05',
  isMe,
  time,
}: VoiceNoteBubbleProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const active = VoiceService.getActiveAudioUrl();
    if (active && active === audioUrl) {
      setIsPlaying(true);
    }
  }, [audioUrl]);

  const togglePlay = async () => {
    if (!audioUrl) return;

    if (isPlaying) {
      await VoiceService.stopAudio();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      await VoiceService.playAudio(audioUrl, (playing) => {
        setIsPlaying(playing);
      });
    }
  };

  const waveHeights = [8, 14, 22, 16, 26, 12, 20, 28, 18, 10, 24, 15, 8, 19, 11, 23, 13, 7];

  return (
    <View style={[styles.container, isMe ? styles.containerMe : styles.containerThem]}>
      <View style={styles.topRow}>
        <TouchableOpacity
          style={[styles.playButton, isMe ? styles.playButtonMe : styles.playButtonThem]}
          onPress={togglePlay}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={18}
            color={isMe ? '#059669' : '#059669'}
            style={!isPlaying ? { marginLeft: 2 } : undefined}
          />
        </TouchableOpacity>

        {/* Waveform Visualization */}
        <View style={styles.waveformContainer}>
          {waveHeights.map((h, index) => {
            const isPlayedBar = isPlaying && index < 10;
            return (
              <View
                key={index}
                style={[
                  styles.waveBar,
                  { height: h },
                  isMe
                    ? isPlayedBar
                      ? styles.waveBarPlayedMe
                      : styles.waveBarMe
                    : isPlayedBar
                    ? styles.waveBarPlayedThem
                    : styles.waveBarThem,
                ]}
              />
            );
          })}
        </View>

        {/* Mic Badge */}
        <View style={styles.micBadge}>
          <Ionicons
            name="mic"
            size={13}
            color={isMe ? '#FFFFFF' : '#059669'}
          />
        </View>
      </View>

      {/* Meta Row: Duration + Timestamp + Blue Tick */}
      <View style={styles.metaRow}>
        <Text style={[styles.durationText, isMe ? styles.durationMe : styles.durationThem]}>
          {isPlaying ? 'Playing...' : duration}
        </Text>

        <View style={styles.timeAndTick}>
          <Text style={[styles.timeText, isMe && { color: 'rgba(255, 255, 255, 0.75)' }]}>{time}</Text>
          {isMe && (
            <Ionicons
              name="checkmark-done"
              size={14}
              color="#38BDF8"
              style={{ marginLeft: 3 }}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: 220,
    maxWidth: 280,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  containerMe: {
    backgroundColor: '#059669',
    borderTopRightRadius: 4,
  },
  containerThem: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonMe: {
    backgroundColor: '#FFFFFF',
  },
  playButtonThem: {
    backgroundColor: '#ECFDF5',
  },
  waveformContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 30,
    marginHorizontal: 10,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
  },
  waveBarMe: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  waveBarPlayedMe: {
    backgroundColor: '#FFFFFF',
  },
  waveBarThem: {
    backgroundColor: '#E2E8F0',
  },
  waveBarPlayedThem: {
    backgroundColor: '#059669',
  },
  micBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingLeft: 44,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '600',
  },
  durationMe: {
    color: '#FFFFFF',
  },
  durationThem: {
    color: '#64748B',
  },
  timeAndTick: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 11,
    color: '#94A3B8',
  },
});
