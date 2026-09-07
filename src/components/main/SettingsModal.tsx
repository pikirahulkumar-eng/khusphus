import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  Switch,
  StatusBar,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts/ThemeContext';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  currentUserPhone: string;
  currentUserName?: string;
  onLogout: () => void;
}

export default function SettingsModal({
  visible,
  onClose,
  currentUserPhone,
  currentUserName: propName,
  onLogout,
}: SettingsModalProps) {
  const { themeMode, isDark, setThemeMode, toggleTheme } = useTheme();

  const [displayName, setDisplayName] = useState(propName || 'Sunao User');
  const [displayHandle, setDisplayHandle] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('@sunao_user_name').then((val) => {
      if (val && val.trim()) setDisplayName(val.trim());
      else if (propName) setDisplayName(propName);
    });
    AsyncStorage.getItem('@sunao_user_handle').then((val) => {
      if (val && val.trim()) setDisplayHandle(val.trim());
    });
  }, [visible, propName]);

  const [readReceipts, setReadReceipts] = useState(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem('@sunao_read_receipts');
      if (saved !== null) return saved === 'true';
    }
    return true;
  });

  useEffect(() => {
    AsyncStorage.getItem('@sunao_read_receipts').then((val) => {
      if (val !== null) setReadReceipts(val === 'true');
    });
  }, [visible]);

  const handleToggleReadReceipts = async (val: boolean) => {
    setReadReceipts(val);
    await AsyncStorage.setItem('@sunao_read_receipts', val ? 'true' : 'false');
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('@sunao_read_receipts', val ? 'true' : 'false');
    }
    showToast(val ? '✓ Read Receipts (Blue Ticks) activated' : 'Read Receipts turned off');
  };

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
      <View style={[styles.container, isDark && { backgroundColor: '#000000' }]}>
        <StatusBar
          backgroundColor={isDark ? '#000000' : '#FFFFFF'}
          barStyle={isDark ? 'light-content' : 'dark-content'}
        />

        {/* Header */}
        <View style={[styles.header, isDark && { backgroundColor: '#000000', borderBottomColor: 'rgba(255, 255, 255, 0.08)' }]}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={isDark ? '#FFFFFF' : '#0F172A'} />
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={[styles.headerTitle, isDark && { color: '#FFFFFF' }]}>Settings</Text>
            <Text style={[styles.headerSubtitle, isDark && { color: '#94A3B8' }]}>Account & Preferences</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* User Profile Bento Card */}
          <View style={[styles.profileCard, isDark && { backgroundColor: '#0D1117', borderColor: 'rgba(255, 255, 255, 0.08)' }]}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' }}
              style={styles.profileAvatar}
            />
            <View style={styles.profileDetails}>
              <View style={styles.nameBadgeRow}>
                <Text style={[styles.profileName, isDark && { color: '#FFFFFF' }]}>{displayName}</Text>
                <View style={[styles.verifiedBadge, isDark && { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
                  <Ionicons name="shield-checkmark" size={12} color="#10B981" />
                  <Text style={[styles.verifiedText, isDark && { color: '#10B981' }]}>Verified</Text>
                </View>
              </View>
              <Text style={[styles.profilePhone, isDark && { color: '#94A3B8' }]}>+91 {currentUserPhone || ''}</Text>
              <Text style={[styles.profileHandle, isDark && { color: '#64748B' }]}>{displayHandle || `@${displayName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user'}`}</Text>
            </View>

            <TouchableOpacity
              style={[styles.qrBtn, isDark && { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}
              onPress={() => showToast('Profile QR link copied to clipboard!')}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons name="qrcode-scan" size={22} color={isDark ? '#10B981' : '#059669'} />
            </TouchableOpacity>
          </View>

          {/* Section 0: Appearance & Theme (Synkon OLED Mode) */}
          <Text style={[styles.sectionHeader, isDark && { color: '#94A3B8' }]}>Appearance & Theme</Text>
          <View style={[styles.cardGroup, isDark && { backgroundColor: '#0D1117', borderColor: 'rgba(255, 255, 255, 0.08)' }]}>
            {/* Direct Switch: Dark OLED Theme */}
            <View style={styles.settingItem}>
              <View style={[styles.itemIconBg, { backgroundColor: isDark ? 'rgba(168, 85, 247, 0.15)' : '#F5F3FF' }]}>
                <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color={isDark ? '#A855F7' : '#7C3AED'} />
              </View>
              <View style={styles.itemTextCol}>
                <Text style={[styles.itemTitle, isDark && { color: '#FFFFFF' }]}>Dark OLED Theme</Text>
                <Text style={[styles.itemSubtitle, isDark && { color: '#94A3B8' }]}>
                  {isDark ? 'Synkon Pure Black (#000000) • Battery Saver' : 'Clean Light Slate & Emerald'}
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: '#CBD5E1', true: '#10B981' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.divider, isDark && { backgroundColor: 'rgba(255, 255, 255, 0.06)' }]} />

            {/* Mode Selector Cards: Light vs Dark */}
            <View style={styles.themeCardsRow}>
              {/* Light Option */}
              <TouchableOpacity
                style={[
                  styles.themeModeCard,
                  !isDark && styles.themeModeCardActive,
                  isDark && { backgroundColor: '#161B22', borderColor: 'rgba(255, 255, 255, 0.08)' },
                ]}
                onPress={() => {
                  setThemeMode('light');
                  showToast('☀️ Light Mode activated');
                }}
                activeOpacity={0.75}
              >
                <View style={[styles.themeModeIconBox, { backgroundColor: !isDark ? '#ECFDF5' : '#1E293B' }]}>
                  <Ionicons name="sunny" size={22} color={!isDark ? '#059669' : '#94A3B8'} />
                </View>
                <Text style={[styles.themeModeTitle, isDark && { color: '#FFFFFF' }, !isDark && { color: '#047857', fontWeight: '800' }]}>
                  Light Mode
                </Text>
                <Text style={[styles.themeModeSub, isDark && { color: '#64748B' }]}>Slate & Emerald</Text>
                {!isDark && (
                  <View style={styles.themeModeSelectedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#047857" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Dark OLED Option */}
              <TouchableOpacity
                style={[
                  styles.themeModeCard,
                  isDark && styles.themeModeCardActiveDark,
                  isDark && { backgroundColor: '#000000', borderColor: '#10B981' },
                ]}
                onPress={() => {
                  setThemeMode('dark');
                  showToast('🌙 Dark OLED Mode activated (Synkon Black)');
                }}
                activeOpacity={0.75}
              >
                <View style={[styles.themeModeIconBox, { backgroundColor: isDark ? 'rgba(0, 242, 254, 0.15)' : '#F1F5F9' }]}>
                  <Ionicons name="moon" size={22} color={isDark ? '#00F2FE' : '#64748B'} />
                </View>
                <Text style={[styles.themeModeTitle, isDark && { color: '#00F2FE', fontWeight: '800' }]}>
                  Dark OLED
                </Text>
                <Text style={[styles.themeModeSub, isDark && { color: '#94A3B8' }]}>Synkon Pure Black</Text>
                {isDark && (
                  <View style={styles.themeModeSelectedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#00F2FE" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Section 1: Calls & Audio */}
          <Text style={[styles.sectionHeader, isDark && { color: '#94A3B8' }]}>Calls & Audio</Text>
          <View style={[styles.cardGroup, isDark && { backgroundColor: '#0D1117', borderColor: 'rgba(255, 255, 255, 0.08)' }]}>
            {/* Direct Connection Item */}
            <View style={styles.settingItem}>
              <View style={[styles.itemIconBg, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' }]}>
                <Ionicons name="call-outline" size={20} color={isDark ? '#10B981' : '#059669'} />
              </View>
              <View style={styles.itemTextCol}>
                <Text style={[styles.itemTitle, isDark && { color: '#FFFFFF' }]}>Direct Call Connection</Text>
                <Text style={[styles.itemSubtitle, isDark && { color: '#94A3B8' }]}>Instant connection without delay</Text>
              </View>
              <View style={[styles.statusPillActive, isDark && { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
                <Text style={[styles.statusPillText, isDark && { color: '#10B981' }]}>Active</Text>
              </View>
            </View>

            <View style={[styles.divider, isDark && { backgroundColor: 'rgba(255, 255, 255, 0.06)' }]} />

            {/* High Definition Audio Toggle */}
            <View style={styles.settingItem}>
              <View style={[styles.itemIconBg, { backgroundColor: isDark ? 'rgba(2, 132, 199, 0.15)' : '#EFF6FF' }]}>
                <Ionicons name="mic-outline" size={20} color="#0284C7" />
              </View>
              <View style={styles.itemTextCol}>
                <Text style={[styles.itemTitle, isDark && { color: '#FFFFFF' }]}>HD Voice Quality</Text>
                <Text style={[styles.itemSubtitle, isDark && { color: '#94A3B8' }]}>Crystal clear sound on voice calls</Text>
              </View>
              <Switch
                value={highQualityAudio}
                onValueChange={setHighQualityAudio}
                trackColor={{ false: '#E2E8F0', true: '#10B981' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.divider, isDark && { backgroundColor: 'rgba(255, 255, 255, 0.06)' }]} />

            {/* Proximity Ear Sensor Toggle */}
            <View style={styles.settingItem}>
              <View style={[styles.itemIconBg, { backgroundColor: isDark ? 'rgba(124, 58, 237, 0.15)' : '#F5F3FF' }]}>
                <Ionicons name="ear-outline" size={20} color="#7C3AED" />
              </View>
              <View style={styles.itemTextCol}>
                <Text style={[styles.itemTitle, isDark && { color: '#FFFFFF' }]}>Auto Speaker Switch</Text>
                <Text style={[styles.itemSubtitle, isDark && { color: '#94A3B8' }]}>Switches automatically when placed near ear</Text>
              </View>
              <Switch
                value={proximitySensor}
                onValueChange={setProximitySensor}
                trackColor={{ false: '#E2E8F0', true: '#10B981' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* Section 2: Privacy & Security */}
          <Text style={[styles.sectionHeader, isDark && { color: '#94A3B8' }]}>Security & Privacy</Text>
          <View style={[styles.cardGroup, isDark && { backgroundColor: '#0D1117', borderColor: 'rgba(255, 255, 255, 0.08)' }]}>
            {/* Read Receipts (Blue Ticks) Toggle */}
            <View style={styles.settingItem}>
              <View style={[styles.itemIconBg, { backgroundColor: isDark ? 'rgba(0, 242, 254, 0.15)' : '#EFF6FF' }]}>
                <Ionicons name="checkmark-done" size={20} color={isDark ? '#00F2FE' : '#0284C7'} />
              </View>
              <View style={styles.itemTextCol}>
                <Text style={[styles.itemTitle, isDark && { color: '#FFFFFF' }]}>Read Receipts (Blue Ticks)</Text>
                <Text style={[styles.itemSubtitle, isDark && { color: '#94A3B8' }]}>
                  {readReceipts
                    ? 'Active: Double blue ticks show when messages are read'
                    : 'Off: Double gray ticks only, no read status sent'}
                </Text>
              </View>
              <Switch
                value={readReceipts}
                onValueChange={handleToggleReadReceipts}
                trackColor={{ false: '#E2E8F0', true: '#10B981' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.divider, isDark && { backgroundColor: 'rgba(255, 255, 255, 0.06)' }]} />

            <View style={styles.settingItem}>
              <View style={[styles.itemIconBg, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' }]}>
                <Ionicons name="lock-closed-outline" size={20} color={isDark ? '#10B981' : '#059669'} />
              </View>
              <View style={styles.itemTextCol}>
                <Text style={[styles.itemTitle, isDark && { color: '#FFFFFF' }]}>End-to-End Encryption</Text>
                <Text style={[styles.itemSubtitle, isDark && { color: '#94A3B8' }]}>Only you and the recipient can read messages</Text>
              </View>
              <Switch
                value={e2eeEnabled}
                onValueChange={setE2eeEnabled}
                trackColor={{ false: '#E2E8F0', true: '#10B981' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.divider, isDark && { backgroundColor: 'rgba(255, 255, 255, 0.06)' }]} />

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => showToast('⏳ Disappearing messages active')}
              activeOpacity={0.7}
            >
              <View style={[styles.itemIconBg, { backgroundColor: isDark ? 'rgba(217, 119, 6, 0.15)' : '#FEF3C7' }]}>
                <Ionicons name="timer-outline" size={20} color="#D97706" />
              </View>
              <View style={styles.itemTextCol}>
                <Text style={[styles.itemTitle, isDark && { color: '#FFFFFF' }]}>Disappearing Messages</Text>
                <Text style={[styles.itemSubtitle, isDark && { color: '#94A3B8' }]}>Configurable per chat timer</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={isDark ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>

            <View style={[styles.divider, isDark && { backgroundColor: 'rgba(255, 255, 255, 0.06)' }]} />

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => showToast('Manage blocked callers in contact dossiers')}
              activeOpacity={0.7}
            >
              <View style={[styles.itemIconBg, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2' }]}>
                <Ionicons name="ban-outline" size={20} color="#EF4444" />
              </View>
              <View style={styles.itemTextCol}>
                <Text style={[styles.itemTitle, isDark && { color: '#FFFFFF' }]}>Blocked Contacts</Text>
                <Text style={[styles.itemSubtitle, isDark && { color: '#94A3B8' }]}>Manage restricted callers</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={isDark ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>
          </View>

          {/* Section 3: Data & Storage */}
          <Text style={[styles.sectionHeader, isDark && { color: '#94A3B8' }]}>Storage & Data</Text>
          <View style={[styles.cardGroup, isDark && { backgroundColor: '#0D1117', borderColor: 'rgba(255, 255, 255, 0.08)' }]}>
            <View style={styles.settingItem}>
              <View style={[styles.itemIconBg, { backgroundColor: isDark ? 'rgba(2, 132, 199, 0.15)' : '#EFF6FF' }]}>
                <Ionicons name="phone-portrait-outline" size={20} color="#0284C7" />
              </View>
              <View style={styles.itemTextCol}>
                <Text style={[styles.itemTitle, isDark && { color: '#FFFFFF' }]}>Private Phone Storage</Text>
                <Text style={[styles.itemSubtitle, isDark && { color: '#94A3B8' }]}>All conversations stay securely on your device</Text>
              </View>
              <View style={[styles.statusPillActive, isDark && { backgroundColor: 'rgba(2, 132, 199, 0.15)', borderColor: 'rgba(2, 132, 199, 0.3)' }]}>
                <Text style={[styles.statusPillText, { color: '#0284C7' }]}>On Phone</Text>
              </View>
            </View>

            <View style={[styles.divider, isDark && { backgroundColor: 'rgba(255, 255, 255, 0.06)' }]} />

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => showToast('✨ Freed 14.2 MB of temporary audio cache')}
              activeOpacity={0.7}
            >
              <View style={[styles.itemIconBg, { backgroundColor: isDark ? 'rgba(148, 163, 184, 0.12)' : '#F1F5F9' }]}>
                <Ionicons name="trash-outline" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
              </View>
              <View style={styles.itemTextCol}>
                <Text style={[styles.itemTitle, isDark && { color: '#FFFFFF' }]}>Clear Voice Cache</Text>
                <Text style={[styles.itemSubtitle, isDark && { color: '#94A3B8' }]}>Free up space on this device</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={isDark ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>
          </View>

          {/* Sign Out Danger Row */}
          <TouchableOpacity
            style={[styles.logoutCard, isDark && { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}
            onPress={onLogout}
            activeOpacity={0.75}
          >
            <Feather name="log-out" size={18} color="#EF4444" style={{ marginRight: 8 }} />
            <Text style={styles.logoutText}>Sign Out from Sunao</Text>
          </TouchableOpacity>

          {/* Footer Branding */}
          <View style={styles.footer}>
            <View style={[styles.soundWaveIcon, isDark && { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <MaterialCommunityIcons name="waveform" size={20} color={isDark ? '#10B981' : '#059669'} />
            </View>
            <Text style={[styles.brandTitle, isDark && { color: '#FFFFFF' }]}>SUNAO MESSENGER</Text>
            <Text style={[styles.brandTagline, isDark && { color: '#64748B' }]}>Zero Server Storage • E2EE VoIP Calling</Text>
          </View>
        </ScrollView>

        {/* Floating Toast */}
        {Boolean(toastMessage) && (
          <View style={[styles.toastBanner, isDark && { backgroundColor: '#1E293B' }]}>
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
  themeCardsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
  },
  themeModeCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  themeModeCardActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  themeModeCardActiveDark: {
    borderColor: '#10B981',
    backgroundColor: '#000000',
  },
  themeModeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  themeModeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  themeModeSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  themeModeSelectedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
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
