import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, Switch, Modal, Pressable, TextInput } from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { KhusPhusTheme } from '../../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ProfileTabProps {
  currentUserPhone: string;
  onLogout: () => void;
}

export default function ProfileTab({ currentUserPhone, onLogout }: ProfileTabProps) {
  const [activeMood, setActiveMood] = useState('Available');
  const [customStatus, setCustomStatus] = useState('');
  const [customEmoji, setCustomEmoji] = useState('💬');
  const [showCustomStatusModal, setShowCustomStatusModal] = useState(false);
  const [inputCustomText, setInputCustomText] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('💬');
  const [isIncognito, setIsIncognito] = useState(false);
  const [isNoiseCancellation, setIsNoiseCancellation] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [activeBentoModal, setActiveBentoModal] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('@sunao_custom_status').then((val) => {
      if (val) {
        try {
          const parsed = JSON.parse(val);
          if (parsed.text) {
            setCustomStatus(parsed.text);
            setCustomEmoji(parsed.emoji || '💬');
          }
        } catch {
          setCustomStatus(val);
        }
      }
    });
    AsyncStorage.getItem('@sunao_active_mood').then((val) => {
      if (val) setActiveMood(val);
    });
  }, []);

  const handleSaveCustomStatus = async () => {
    if (!inputCustomText.trim()) return;
    const trimmed = inputCustomText.trim();
    setCustomStatus(trimmed);
    setCustomEmoji(selectedEmoji);
    setActiveMood(trimmed);
    await AsyncStorage.setItem('@sunao_custom_status', JSON.stringify({ text: trimmed, emoji: selectedEmoji }));
    await AsyncStorage.setItem('@sunao_active_mood', trimmed);
    setShowCustomStatusModal(false);
    setToastMessage('Status updated!');
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleClearCustomStatus = async () => {
    setCustomStatus('');
    setActiveMood('Available');
    await AsyncStorage.removeItem('@sunao_custom_status');
    await AsyncStorage.setItem('@sunao_active_mood', 'Available');
    setShowCustomStatusModal(false);
    setToastMessage('Status cleared');
    setTimeout(() => setToastMessage(''), 2500);
  };

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setToastMessage(`${label} copied to clipboard!`);
    setTimeout(() => setToastMessage(''), 2500);
  };

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
              onPress={() => copyToClipboard('https://sunao.chat/u/rahul_kp', 'Profile Link')}
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
                <TouchableOpacity onPress={() => copyToClipboard('@rahul_kp', 'Sunao ID')}>
                  <Feather name="copy" size={13} color="#059669" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
              <Text style={styles.userPhone}>+91 {currentUserPhone || '9876543210'}</Text>
            </View>
          </View>

          {/* Quick Mood / Presence Selector */}
          <View style={styles.moodSelectorWrapper}>
            <View style={styles.statusHeaderRow}>
              <Text style={styles.sectionMiniLabel}>CURRENT STATUS</Text>
              <TouchableOpacity
                style={styles.setCustomBtn}
                onPress={() => {
                  setInputCustomText(customStatus);
                  setSelectedEmoji(customEmoji || '💬');
                  setShowCustomStatusModal(true);
                }}
                activeOpacity={0.7}
              >
                <Feather name="edit-2" size={11} color="#059669" />
                <Text style={styles.setCustomBtnText}>
                  {customStatus ? 'Edit' : '+ Type Status'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moodsScroll}>
              {/* User's custom manual status chip if present */}
              {Boolean(customStatus) && (
                <TouchableOpacity
                  style={[styles.moodChip, activeMood === customStatus && styles.moodChipActive]}
                  onPress={() => {
                    setActiveMood(customStatus);
                    AsyncStorage.setItem('@sunao_active_mood', customStatus);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.moodEmoji}>{customEmoji}</Text>
                  <Text
                    style={[styles.moodText, activeMood === customStatus && styles.moodTextActive]}
                    numberOfLines={1}
                  >
                    {customStatus}
                  </Text>
                </TouchableOpacity>
              )}

              {moods.map((m) => {
                const isSelected = activeMood === m.label;
                return (
                  <TouchableOpacity
                    key={m.label}
                    style={[styles.moodChip, isSelected && styles.moodChipActive]}
                    onPress={() => {
                      setActiveMood(m.label);
                      AsyncStorage.setItem('@sunao_active_mood', m.label);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.moodEmoji}>{m.emoji}</Text>
                    <Text style={[styles.moodText, isSelected && styles.moodTextActive]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* Add Custom Button Chip */}
              <TouchableOpacity
                style={[styles.moodChip, styles.addCustomChip]}
                onPress={() => {
                  setInputCustomText(customStatus);
                  setSelectedEmoji(customEmoji || '💬');
                  setShowCustomStatusModal(true);
                }}
                activeOpacity={0.7}
              >
                <Feather name="plus" size={13} color="#059669" />
                <Text style={[styles.moodText, { color: '#059669' }]}>Custom...</Text>
              </TouchableOpacity>
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
          onPress={() => setActiveBentoModal('vault')}
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
          onPress={() => setActiveBentoModal('studio')}
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
          onPress={() => setActiveBentoModal('theme')}
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
          onPress={() => setActiveBentoModal('devices')}
          activeOpacity={0.8}
        >
          <View style={[styles.bentoIconBadge, { backgroundColor: '#FEF2F2' }]}>
            <MaterialCommunityIcons name="laptop" size={22} color="#EF4444" />
          </View>
          <Text style={styles.bentoCardTitle}>Devices</Text>
          <Text style={styles.bentoCardSubtitle}>2 active sessions (Web + Desktop)</Text>
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
        onPress={() => setShowLogoutConfirm(true)}
        activeOpacity={0.8}
      >
        <Feather name="log-out" size={18} color="#EF4444" style={{ marginRight: 8 }} />
        <Text style={styles.modernLogoutText}>Sign Out of Device</Text>
      </TouchableOpacity>

      <View style={styles.brandFooter}>
        <Text style={styles.footerTech}>ZERO TRACKERS • PRIVATE CALLS</Text>
        <Text style={styles.footerCopy}>Sunao App</Text>
      </View>

      {/* Toast Notification Banner */}
      {Boolean(toastMessage) && (
        <View style={styles.toastBanner}>
          <Ionicons name="checkmark-circle" size={18} color="#10B981" style={{ marginRight: 8 }} />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* Logout Confirmation Modal */}
      <Modal visible={showLogoutConfirm} transparent animationType="fade" onRequestClose={() => setShowLogoutConfirm(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowLogoutConfirm(false)}>
          <View style={styles.logoutCard}>
            <View style={styles.logoutIconCircle}>
              <Feather name="log-out" size={28} color="#EF4444" />
            </View>
            <Text style={styles.logoutTitle}>Sign Out</Text>
            <Text style={styles.logoutSubtitle}>
              Are you sure you want to sign out of this device? Your local chats remain encrypted.
            </Text>
            <View style={styles.logoutActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowLogoutConfirm(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmLogoutBtn}
                onPress={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
              >
                <Text style={styles.confirmLogoutBtnText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Bento Detail Modal */}
      <Modal visible={Boolean(activeBentoModal)} transparent animationType="fade" onRequestClose={() => setActiveBentoModal(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setActiveBentoModal(null)}>
          <View style={styles.bentoDetailCard}>
            <View style={styles.bentoDetailHeader}>
              <Text style={styles.bentoDetailTitle}>
                {activeBentoModal === 'vault' && 'Privacy Vault'}
                {activeBentoModal === 'studio' && 'Call Studio'}
                {activeBentoModal === 'theme' && 'Theme Studio'}
                {activeBentoModal === 'devices' && 'Linked Devices'}
              </Text>
              <TouchableOpacity onPress={() => setActiveBentoModal(null)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.bentoDetailText}>
              {activeBentoModal === 'vault' && 'Your chats and media are locked with AES-256 peer-to-peer cryptography. No unauthorized access is possible.'}
              {activeBentoModal === 'studio' && 'Hardware AEC (Acoustic Echo Cancellation) and NS (Noise Suppression) are active on your microphone.'}
              {activeBentoModal === 'theme' && 'Sunao Modern Light UI active with 60 FPS responsive layout.'}
              {activeBentoModal === 'devices' && 'Current Device: Windows Desktop / Web App (Active Now). Synchronized with your phone.'}
            </Text>
            <TouchableOpacity style={styles.bentoDoneBtn} onPress={() => setActiveBentoModal(null)}>
              <Text style={styles.bentoDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* 4. Custom Status Modal (Manual Status Input) */}
      <Modal
        visible={showCustomStatusModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCustomStatusModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowCustomStatusModal(false)}>
          <Pressable style={styles.customStatusCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.customStatusHeader}>
              <View>
                <Text style={styles.customStatusTitle}>Set Current Status</Text>
                <Text style={styles.customStatusSubtitle}>Type a custom status or mood to share</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowCustomStatusModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Choose Emoji */}
            <Text style={styles.inputMiniLabel}>CHOOSE EMOJI</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiScrollRow}>
              {['💬', '💻', '☕', '🚀', '✈️', '🏖️', '📚', '🎵', '🏃', '💪', '🔥', '✨', '⚡', '😴'].map((em) => (
                <TouchableOpacity
                  key={em}
                  style={[styles.emojiSelectBtn, selectedEmoji === em && styles.emojiSelectBtnActive]}
                  onPress={() => setSelectedEmoji(em)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 18 }}>{em}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Text Input */}
            <Text style={styles.inputMiniLabel}>STATUS MESSAGE</Text>
            <View style={styles.statusInputWrapper}>
              <Text style={styles.inputLeadingEmoji}>{selectedEmoji}</Text>
              <TextInput
                style={styles.statusTextInput}
                placeholder="e.g. Coding on Sunao, In gym, On vacation..."
                placeholderTextColor="#94A3B8"
                value={inputCustomText}
                onChangeText={setInputCustomText}
                maxLength={60}
                autoFocus
              />
              {Boolean(inputCustomText) && (
                <TouchableOpacity onPress={() => setInputCustomText('')}>
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.charCountText}>{inputCustomText.length}/60 characters</Text>

            {/* Quick Suggestions */}
            <Text style={styles.inputMiniLabel}>QUICK SUGGESTIONS</Text>
            <View style={styles.suggestionChips}>
              {[
                { emoji: '💻', text: 'Working remotely' },
                { emoji: '☕', text: 'Coffee break' },
                { emoji: '🎧', text: 'Listening to music' },
                { emoji: '🚗', text: 'On the road' },
                { emoji: '💪', text: 'Workout mode' },
                { emoji: '✨', text: 'Feeling good' },
              ].map((sug) => (
                <TouchableOpacity
                  key={sug.text}
                  style={styles.sugChip}
                  onPress={() => {
                    setSelectedEmoji(sug.emoji);
                    setInputCustomText(sug.text);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 12 }}>{sug.emoji}</Text>
                  <Text style={styles.sugChipText}>{sug.text}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Action Buttons */}
            <View style={styles.customStatusActions}>
              {Boolean(customStatus) && (
                <TouchableOpacity
                  style={styles.clearStatusBtn}
                  onPress={handleClearCustomStatus}
                  activeOpacity={0.7}
                >
                  <Text style={styles.clearStatusBtnText}>Clear</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.cancelStatusBtn}
                onPress={() => setShowCustomStatusModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelStatusBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.saveStatusBtn,
                  !inputCustomText.trim() && { opacity: 0.5 },
                ]}
                disabled={!inputCustomText.trim()}
                onPress={handleSaveCustomStatus}
                activeOpacity={0.8}
              >
                <Text style={styles.saveStatusBtnText}>Save Status</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  toastBanner: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#0F172A',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 999,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  logoutIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  logoutTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  logoutSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  logoutActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 14,
  },
  confirmLogoutBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  confirmLogoutBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  bentoDetailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    maxWidth: 400,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bentoDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  bentoDetailTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  bentoDetailText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    marginBottom: 20,
  },
  bentoDoneBtn: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  bentoDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  setCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 4,
  },
  setCustomBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  addCustomChip: {
    borderStyle: 'dashed',
    borderColor: '#059669',
    backgroundColor: '#F0FDF4',
  },
  customStatusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    maxWidth: 420,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  customStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  customStatusTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  customStatusSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  inputMiniLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 12,
  },
  emojiScrollRow: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 4,
  },
  emojiSelectBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emojiSelectBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
    borderWidth: 2,
  },
  statusInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 46,
  },
  inputLeadingEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  statusTextInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 8,
  },
  charCountText: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'right',
    marginTop: 4,
  },
  suggestionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sugChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sugChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  customStatusActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 8,
  },
  clearStatusBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  clearStatusBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  cancelStatusBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelStatusBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  saveStatusBtn: {
    flex: 1.5,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#059669',
    alignItems: 'center',
  },
  saveStatusBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
