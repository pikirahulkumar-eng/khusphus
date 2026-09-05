import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Platform, Switch } from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { KhusPhusTheme } from '../../constants/theme';

interface ProfileTabProps {
  currentUserPhone: string;
  onLogout: () => void;
}

export default function ProfileTab({ currentUserPhone, onLogout }: ProfileTabProps) {
  const [activeMood, setActiveMood] = useState('Available');
  const [isIncognito, setIsIncognito] = useState(false);
  const [isNoiseCancellation, setIsNoiseCancellation] = useState(true);

  const moods = [
    { label: 'Available', emoji: '🟢' },
    { label: 'In a Call', emoji: '🎧' },
    { label: 'Focus Mode', emoji: '⚡' },
    { label: 'Do Not Disturb', emoji: '🔕' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* 1. Gradient Cover & Hero Header */}
      <View style={styles.heroContainer}>
        <LinearGradient
          colors={['#047857', '#059669', '#10B981']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.coverGradient}
        >
          <View style={styles.coverTopBar}>
            <View style={styles.verifiedBadge}>
              <MaterialCommunityIcons name="shield-check" size={14} color="#FFFFFF" />
              <Text style={styles.verifiedText}>Verified Account</Text>
            </View>

            <TouchableOpacity
              style={styles.qrShareBtn}
              onPress={() => Alert.alert('Sunao Card', 'Profile link copied!')}
            >
              <MaterialCommunityIcons name="share-variant" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Floating Identity Card */}
        <View style={styles.floatingProfileCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarGlowWrapper}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200' }}
                style={styles.avatarImg}
              />
              <View style={styles.liveIndicatorRing} />
            </View>

            <View style={styles.identityDetails}>
              <Text style={styles.userName}>Rahul Kumar</Text>
              <View style={styles.handleRow}>
                <Text style={styles.userHandle}>@rahul_kp</Text>
                <TouchableOpacity onPress={() => Alert.alert('Copied', 'ID copied to clipboard!')}>
                  <Feather name="copy" size={13} color="#059669" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
              <Text style={styles.userPhone}>+91 {currentUserPhone || '9876543210'}</Text>
            </View>
          </View>

          {/* Quick Mood / Presence Selector */}
          <View style={styles.moodSelectorWrapper}>
            <Text style={styles.sectionMiniLabel}>CURRENT STATUS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moodsScroll}>
              {moods.map((m) => {
                const isSelected = activeMood === m.label;
                return (
                  <TouchableOpacity
                    key={m.label}
                    style={[styles.moodChip, isSelected && styles.moodChipActive]}
                    onPress={() => setActiveMood(m.label)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.moodEmoji}>{m.emoji}</Text>
                    <Text style={[styles.moodText, isSelected && styles.moodTextActive]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </View>

      {/* 2. Security & Privacy Highlights Bar */}
      <View style={styles.telemetryCard}>
        <View style={styles.telemetryItem}>
          <Text style={styles.telemetryValue}>PRIVATE</Text>
          <Text style={styles.telemetryLabel}>Zero Tracking</Text>
        </View>
        <View style={styles.telemetryDivider} />
        <View style={styles.telemetryItem}>
          <Text style={[styles.telemetryValue, { color: '#059669' }]}>100%</Text>
          <Text style={styles.telemetryLabel}>Private</Text>
        </View>
        <View style={styles.telemetryDivider} />
        <View style={styles.telemetryItem}>
          <Text style={[styles.telemetryValue, { color: '#0284C7' }]}>ACTIVE</Text>
          <Text style={styles.telemetryLabel}>Instant Calls</Text>
        </View>
      </View>

      {/* 2.1 Private Phone Storage Pill */}
      <View style={styles.zeroCostBanner}>
        <View style={styles.zeroCostLeft}>
          <MaterialCommunityIcons name="shield-check" size={20} color="#059669" />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.zeroCostTitle}>Private On-Device Storage</Text>
            <Text style={styles.zeroCostSub}>All messages and voice notes stay securely on your phone</Text>
          </View>
        </View>
        <View style={styles.zeroCostBadge}>
          <Text style={styles.zeroCostBadgeText}>SECURE</Text>
        </View>
      </View>

      {/* 3. Bento-Style Grid Dashboard */}
      <Text style={styles.bentoSectionTitle}>SETTINGS & TOOLS</Text>
      
      <View style={styles.bentoGrid}>
        {/* Bento 1: Privacy Vault */}
        <TouchableOpacity
          style={styles.bentoCard}
          onPress={() => Alert.alert('Privacy Vault', 'Configuring App Lock & Auto-Clear Timers')}
          activeOpacity={0.8}
        >
          <View style={[styles.bentoIconBadge, { backgroundColor: '#F5F3FF' }]}>
            <Ionicons name="finger-print" size={22} color="#7C3AED" />
          </View>
          <Text style={styles.bentoCardTitle}>Privacy Vault</Text>
          <Text style={styles.bentoCardSubtitle}>Biometric lock, hidden chats & privacy</Text>
          <View style={[styles.bentoFooterPill, { backgroundColor: '#F5F3FF' }]}>
            <Text style={[styles.bentoFooterPillText, { color: '#7C3AED' }]}>LOCKED</Text>
          </View>
        </TouchableOpacity>

        {/* Bento 2: Call Studio (Noise & Audio) */}
        <TouchableOpacity
          style={styles.bentoCard}
          onPress={() => Alert.alert('Call Studio', 'Microphone, camera filters & noise reduction')}
          activeOpacity={0.8}
        >
          <View style={[styles.bentoIconBadge, { backgroundColor: '#ECFDF5' }]}>
            <MaterialCommunityIcons name="broadcast" size={22} color="#059669" />
          </View>
          <Text style={styles.bentoCardTitle}>Call Studio</Text>
          <Text style={styles.bentoCardSubtitle}>Noise reduction & crystal clear voice</Text>
          <View style={[styles.bentoFooterPill, { backgroundColor: '#ECFDF5' }]}>
            <Text style={[styles.bentoFooterPillText, { color: '#059669' }]}>CLEAR VOICE</Text>
          </View>
        </TouchableOpacity>

        {/* Bento 3: Appearance & Bubbles */}
        <TouchableOpacity
          style={styles.bentoCard}
          onPress={() => Alert.alert('Theme Studio', 'Themes, wallpapers & styling')}
          activeOpacity={0.8}
        >
          <View style={[styles.bentoIconBadge, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="color-palette" size={22} color="#0284C7" />
          </View>
          <Text style={styles.bentoCardTitle}>Theme Studio</Text>
          <Text style={styles.bentoCardSubtitle}>Clean light aesthetic & fast UI</Text>
          <View style={[styles.bentoFooterPill, { backgroundColor: '#EFF6FF' }]}>
            <Text style={[styles.bentoFooterPillText, { color: '#0284C7' }]}>ACTIVE</Text>
          </View>
        </TouchableOpacity>

        {/* Bento 4: Linked Devices */}
        <TouchableOpacity
          style={styles.bentoCard}
          onPress={() => Alert.alert('Linked Devices', 'Managing active device sessions')}
          activeOpacity={0.8}
        >
          <View style={[styles.bentoIconBadge, { backgroundColor: '#FEF2F2' }]}>
            <MaterialCommunityIcons name="laptop" size={22} color="#EF4444" />
          </View>
          <Text style={styles.bentoCardTitle}>Devices</Text>
          <Text style={styles.bentoCardSubtitle}>2 active sessions (Web + Mobile)</Text>
          <View style={[styles.bentoFooterPill, { backgroundColor: '#FEF2F2' }]}>
            <Text style={[styles.bentoFooterPillText, { color: '#EF4444' }]}>ONLINE</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* 4. Quick Toggles Card */}
      <View style={styles.togglesCard}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleLeft}>
            <MaterialCommunityIcons name="incognito" size={22} color="#059669" />
            <View style={styles.toggleTextGroup}>
              <Text style={styles.toggleTitle}>Ghost Mode</Text>
              <Text style={styles.toggleSubtitle}>Hide online status & delivery receipts</Text>
            </View>
          </View>
          <Switch
            value={isIncognito}
            onValueChange={setIsIncognito}
            trackColor={{ false: '#E2E8F0', true: '#059669' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.toggleDivider} />

        <View style={styles.toggleRow}>
          <View style={styles.toggleLeft}>
            <MaterialCommunityIcons name="waveform" size={22} color="#0284C7" />
            <View style={styles.toggleTextGroup}>
              <Text style={styles.toggleTitle}>Noise Cancellation</Text>
              <Text style={styles.toggleSubtitle}>Filter ambient background noise during calls</Text>
            </View>
          </View>
          <Switch
            value={isNoiseCancellation}
            onValueChange={setIsNoiseCancellation}
            trackColor={{ false: '#E2E8F0', true: '#059669' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* 5. Modern Logout Button */}
      <TouchableOpacity
        style={styles.modernLogoutBtn}
        onPress={() => {
          Alert.alert('Sign Out', 'Sign out of Sunao?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log Out', style: 'destructive', onPress: onLogout },
          ]);
        }}
        activeOpacity={0.8}
      >
        <Feather name="log-out" size={18} color="#EF4444" style={{ marginRight: 8 }} />
        <Text style={styles.modernLogoutText}>Sign Out of Device</Text>
      </TouchableOpacity>

      <View style={styles.brandFooter}>
        <Text style={styles.footerTech}>ZERO TRACKERS • PRIVATE CALLS</Text>
        <Text style={styles.footerCopy}>Sunao App</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingBottom: 60,
  },
  heroContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  coverGradient: {
    height: 130,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 44 : 16,
  },
  coverTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  verifiedText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  qrShareBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingProfileCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -40,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarGlowWrapper: {
    position: 'relative',
    marginRight: 16,
  },
  avatarImg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#059669',
  },
  liveIndicatorRing: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#059669',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  identityDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  userHandle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  userPhone: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  moodSelectorWrapper: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  sectionMiniLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  moodsScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  moodChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  moodEmoji: {
    fontSize: 12,
  },
  moodText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  moodTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  telemetryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  telemetryItem: {
    flex: 1,
    alignItems: 'center',
  },
  telemetryValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  telemetryLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  telemetryDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#F1F5F9',
  },
  zeroCostBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  zeroCostLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  zeroCostTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  zeroCostSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  zeroCostBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginLeft: 8,
  },
  zeroCostBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  bentoSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 10,
    marginBottom: 14,
  },
  bentoCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bentoIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  bentoCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 3,
  },
  bentoCardSubtitle: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    marginBottom: 8,
    minHeight: 30,
  },
  bentoFooterPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bentoFooterPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  togglesCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  toggleTextGroup: {
    marginLeft: 12,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  toggleSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  toggleDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
  },
  modernLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    marginHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  modernLogoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
  brandFooter: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerTech: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  footerCopy: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
});
