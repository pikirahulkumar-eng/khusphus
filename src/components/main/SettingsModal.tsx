import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  Alert,
  Switch,
  StatusBar,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons, Feather } from '@expo/vector-icons';
import { SunaoTheme } from '../../constants/theme';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  currentUserPhone: string;
  onLogout: () => void;
}

export default function SettingsModal({
  visible,
  onClose,
  currentUserPhone,
  onLogout,
}: SettingsModalProps) {
  const [e2eeEnabled, setE2eeEnabled] = useState(true);
  const [proximitySensor, setProximitySensor] = useState(true);
  const [highQualityAudio, setHighQualityAudio] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={styles.headerSubtitle}>Account & Preferences</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* User Profile Bento Card */}
          <View style={styles.profileCard}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' }}
              style={styles.profileAvatar}
            />
            <View style={styles.profileDetails}>
              <View style={styles.nameBadgeRow}>
                <Text style={styles.profileName}>Rahul Kumar</Text>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={12} color="#059669" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              </View>
              <Text style={styles.profilePhone}>+91 {currentUserPhone || '9876543210'}</Text>
              <Text style={styles.profileHandle}>@rahulkumar</Text>
            </View>

            <TouchableOpacity
              style={styles.qrBtn}
              onPress={() => showToast('Profile QR link copied to clipboard!')}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons name="qrcode-scan" size={22} color="#059669" />
            </TouchableOpacity>
          </View>

          {/* Section 1: Calls & Audio */}
          <Text style={styles.sectionHeader}>Calls & Audio</Text>
          <View style={styles.cardGroup}>
            {/* Direct Connection Item */}
            <View style={styles.settingItem}>
              <View style={[styles.itemIconBg, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="call-outline" size={20} color="#059669" />
              </View>
              <View style={styles.itemTextCol}>
                <Text style={styles.itemTitle}>Direct Call Connection</Text>
                <Text style={styles.itemSubtitle}>Instant connection without delay</Text>
              </View>
              <View style={styles.statusPillActive}>
                <Text style={styles.statusPillText}>Active</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* High Definition Audio Toggle */}
            <View style={styles.settingItem}>
              <View style={[styles.itemIconBg, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="mic-outline" size={20} color="#0284C7" />
              </View>
              <View style={styles.itemTextCol}>
                <Text style={styles.itemTitle}>HD Voice Quality</Text>
                <Text style={styles.itemSubtitle}>Crystal clear sound on voice calls</Text>
              </View>
              <Switch
                value={highQualityAudio}
                onValueChange={setHighQualityAudio}
                trackColor={{ false: '#E2E8F0', true: '#059669' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.divider} />

            {/* Proximity Ear Sensor Toggle */}
            <View style={styles.settingItem}>
              <View style={[styles.itemIconBg, { backgroundColor: '#F5F3FF' }]}>
                <Ionicons name="ear-outline" size={20} color="#7C3AED" />
              </View>
              <View style={styles.itemTextCol}>
                <Text style={styles.itemTitle}>Auto Speaker Switch</Text>
                <Text style={styles.itemSubtitle}>Switches automatically when placed near ear</Text>
              </View>
              <Switch
                value={proximitySensor}
                onValueChange={setProximitySensor}
                trackColor={{ false: '#E2E8F0', true: '#059669' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* Section 2: Privacy & Security */}
          <Text style={styles.sectionHeader}>Security & Privacy</Text>
          <View style={styles.cardGroup}>
            <View style={styles.settingItem}>
              <View style={[styles.itemIconBg, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="lock-closed-outline" size={20} color="#059669" />
              </View>
              <View style={styles.itemTextCol}>
                <Text style={styles.itemTitle}>End-to-End Encryption</Text>
                <Text style={styles.itemSubtitle}>Only you and the recipient can read messages</Text>
              </View>
              <Switch
                value={e2eeEnabled}
                onValueChange={setE2eeEnabled}
                trackColor={{ false: '#E2E8F0', true: '#059669' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => showToast('⏳ Disappearing messages enabled (24 hours)')}
              activeOpacity={0.7}
            >
              <View style={[styles.itemIconBg, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="timer-outline" size={20} color="#D97706" />
              </View>
              <View style={styles.itemTextCol}>
                <Text style={styles.itemTitle}>Disappearing Messages</Text>
                <Text style={styles.itemSubtitle}>Auto-delete chats after 24h</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#64748B" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => showToast('0 blocked contacts on this device')}
              activeOpacity={0.7}
            >
              <View style={[styles.itemIconBg, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="ban-outline" size={20} color="#EF4444" />
              </View>
              <View style={styles.itemTextCol}>
                <Text style={styles.itemTitle}>Blocked Contacts</Text>
                <Text style={styles.itemSubtitle}>Manage restricted callers</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Section 3: Data & Storage */}
          <Text style={styles.sectionHeader}>Storage & Data</Text>
          <View style={styles.cardGroup}>
            <View style={styles.settingItem}>
              <View style={[styles.itemIconBg, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="phone-portrait-outline" size={20} color="#0284C7" />
              </View>
              <View style={styles.itemTextCol}>
                <Text style={styles.itemTitle}>Private Phone Storage</Text>
                <Text style={styles.itemSubtitle}>All conversations and voice notes stay securely on your phone</Text>
              </View>
              <View style={[styles.statusPillActive, { backgroundColor: '#EFF6FF' }]}>
                <Text style={[styles.statusPillText, { color: '#0284C7' }]}>On Phone</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => showToast('✨ Freed 14.2 MB of temporary audio cache')}
              activeOpacity={0.7}
            >
              <View style={[styles.itemIconBg, { backgroundColor: '#F1F5F9' }]}>
                <Ionicons name="trash-outline" size={20} color="#64748B" />
              </View>
              <View style={styles.itemTextCol}>
                <Text style={styles.itemTitle}>Clear Voice Cache</Text>
                <Text style={styles.itemSubtitle}>Delete downloaded voice notes</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Log Out Action Card */}
          <TouchableOpacity
            style={styles.logoutCard}
            onPress={() => {
              onClose();
              onLogout();
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={20} color="#EF4444" style={{ marginRight: 10 }} />
            <Text style={styles.logoutText}>Log Out of Sunao</Text>
          </TouchableOpacity>

          {/* Brand Footer */}
          <View style={styles.footer}>
            <View style={styles.soundWaveIcon}>
              <Ionicons name="radio" size={18} color="#059669" />
            </View>
            <Text style={styles.brandTitle}>SUNAO APP</Text>
            <Text style={styles.brandTagline}>Private, Fast & Secure • Zero Cloud Leak</Text>
          </View>
        </ScrollView>

        {/* Floating Toast Notification */}
        {Boolean(toastMessage) && (
          <View style={styles.toastBanner}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" style={{ marginRight: 8 }} />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    ...(Platform.OS === 'web' ? {
      maxWidth: 480,
      width: '100%',
      marginHorizontal: 'auto',
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: '#E2E8F0',
    } : {}),
  },
  toastBanner: {
    position: 'absolute',
    bottom: 24,
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
  header: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : ((StatusBar.currentHeight || 24) + 12),
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    padding: 6,
    marginRight: 12,
  },
  headerTitleBox: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 50,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 20,
    marginRight: 14,
  },
  profileDetails: {
    flex: 1,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    gap: 2,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  profilePhone: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  profileHandle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  qrBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 4,
  },
  cardGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  itemIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemTextCol: {
    flex: 1,
    paddingRight: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15,
  },
  statusPillActive: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  logoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#FECDD3',
    marginBottom: 24,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  soundWaveIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 1.2,
  },
  brandTagline: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
});
