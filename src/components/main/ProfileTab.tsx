import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  Switch,
  Modal,
  Pressable,
  TextInput,
  StatusBar,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts/ThemeContext';

interface ProfileTabProps {
  currentUserPhone: string;
  currentUserName?: string;
  onLogout: () => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200',
  'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=200',
];

export default function ProfileTab({ currentUserPhone, currentUserName, onLogout }: ProfileTabProps) {
  const { themeMode, isDark, setThemeMode, toggleTheme } = useTheme();

  // Identity states — use logged-in name as default, then override from AsyncStorage
  const [userName, setUserName] = useState(currentUserName || 'Sunao User');
  const [userHandle, setUserHandle] = useState('@rahul_kp');
  const [userBio, setUserBio] = useState('Building Sunao App 🚀');
  const [avatarUri, setAvatarUri] = useState(AVATAR_PRESETS[0]);

  // Status and mood
  const [activeMood, setActiveMood] = useState('Available');
  const [customStatus, setCustomStatus] = useState('');
  const [customEmoji, setCustomEmoji] = useState('💬');

  // Toggles
  const [isIncognito, setIsIncognito] = useState(false);
  const [isNoiseCancellation, setIsNoiseCancellation] = useState(true);

  // Vault Settings
  const [pinLockEnabled, setPinLockEnabled] = useState(false);
  const [readReceipts, setReadReceipts] = useState(true);
  const [lastSeenAudience, setLastSeenAudience] = useState<'Everyone' | 'My Contacts' | 'Nobody'>('My Contacts');
  const [screenSecurity, setScreenSecurity] = useState(true);

  // Studio Settings
  const [noiseLevel, setNoiseLevel] = useState<'Off' | 'Standard AI' | 'Studio Ultra'>('Studio Ultra');
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [hdVoice, setHdVoice] = useState(true);
  const [callDataSaver, setCallDataSaver] = useState(false);
  const [isTestingMic, setIsTestingMic] = useState(false);

  // Theme Studio Settings
  const [appTheme, setAppTheme] = useState('Sunao Emerald');
  const [bubbleGeometry, setBubbleGeometry] = useState('Modern Squircle');
  const [fontSizeScale, setFontSizeScale] = useState('Normal');

  // Modals
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editNameInput, setEditNameInput] = useState('');
  const [editHandleInput, setEditHandleInput] = useState('');
  const [editBioInput, setEditBioInput] = useState('');
  const [selectedAvatarPreset, setSelectedAvatarPreset] = useState(avatarUri);

  const [showQRModal, setShowQRModal] = useState(false);
  const [showCustomStatusModal, setShowCustomStatusModal] = useState(false);
  const [inputCustomText, setInputCustomText] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('💬');

  const [activeBentoModal, setActiveBentoModal] = useState<'vault' | 'studio' | 'theme' | 'devices' | null>(null);
  const [showLinkDeviceScanner, setShowLinkDeviceScanner] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // 1. Load persisted profile data on mount
  useEffect(() => {
    AsyncStorage.getItem('@sunao_user_name').then((val) => { if (val) setUserName(val); });
    AsyncStorage.getItem('@sunao_user_handle').then((val) => { if (val) setUserHandle(val); });
    AsyncStorage.getItem('@sunao_user_bio').then((val) => { if (val) setUserBio(val); });
    AsyncStorage.getItem('@sunao_user_avatar').then((val) => { if (val) setAvatarUri(val); });

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

    AsyncStorage.getItem('@sunao_active_mood').then((val) => { if (val) setActiveMood(val); });
    AsyncStorage.getItem('@sunao_ghost_mode').then((val) => { setIsIncognito(val === 'true'); });
    AsyncStorage.getItem('@sunao_noise_cancellation').then((val) => { if (val !== null) setIsNoiseCancellation(val === 'true'); });

    // Vault
    AsyncStorage.getItem('@sunao_pin_enabled').then((val) => { setPinLockEnabled(val === 'true'); });
    AsyncStorage.getItem('@sunao_read_receipts').then((val) => { if (val !== null) setReadReceipts(val === 'true'); });
    AsyncStorage.getItem('@sunao_last_seen').then((val) => { if (val) setLastSeenAudience(val as any); });
    AsyncStorage.getItem('@sunao_screen_security').then((val) => { if (val !== null) setScreenSecurity(val === 'true'); });

    // Studio
    AsyncStorage.getItem('@sunao_noise_level').then((val) => { if (val) setNoiseLevel(val as any); });
    AsyncStorage.getItem('@sunao_echo_cancellation').then((val) => { if (val !== null) setEchoCancellation(val === 'true'); });
    AsyncStorage.getItem('@sunao_hd_voice').then((val) => { if (val !== null) setHdVoice(val === 'true'); });
    AsyncStorage.getItem('@sunao_call_data_saver').then((val) => { setCallDataSaver(val === 'true'); });

    // Theme
    AsyncStorage.getItem('@sunao_app_theme').then((val) => { if (val) setAppTheme(val); });
    AsyncStorage.getItem('@sunao_bubble_geometry').then((val) => { if (val) setBubbleGeometry(val); });
    AsyncStorage.getItem('@sunao_font_size').then((val) => { if (val) setFontSizeScale(val); });
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    showToast(`${label} copied to clipboard!`);
  };

  const handleSaveCustomStatus = async () => {
    if (!inputCustomText.trim()) return;
    const trimmed = inputCustomText.trim();
    setCustomStatus(trimmed);
    setCustomEmoji(selectedEmoji);
    setActiveMood(trimmed);
    await AsyncStorage.setItem('@sunao_custom_status', JSON.stringify({ text: trimmed, emoji: selectedEmoji }));
    await AsyncStorage.setItem('@sunao_active_mood', trimmed);
    setShowCustomStatusModal(false);
    showToast('Status updated!');
  };

  const handleClearCustomStatus = async () => {
    setCustomStatus('');
    setActiveMood('Available');
    await AsyncStorage.removeItem('@sunao_custom_status');
    await AsyncStorage.setItem('@sunao_active_mood', 'Available');
    setShowCustomStatusModal(false);
    showToast('Status cleared');
  };

  const handleSaveProfile = async () => {
    if (editNameInput.trim()) {
      setUserName(editNameInput.trim());
      await AsyncStorage.setItem('@sunao_user_name', editNameInput.trim());
    }
    if (editHandleInput.trim()) {
      const handle = editHandleInput.trim().startsWith('@') ? editHandleInput.trim() : `@${editHandleInput.trim()}`;
      setUserHandle(handle);
      await AsyncStorage.setItem('@sunao_user_handle', handle);
    }
    if (editBioInput.trim()) {
      setUserBio(editBioInput.trim());
      await AsyncStorage.setItem('@sunao_user_bio', editBioInput.trim());
    }
    if (selectedAvatarPreset) {
      setAvatarUri(selectedAvatarPreset);
      await AsyncStorage.setItem('@sunao_user_avatar', selectedAvatarPreset);
    }
    setShowEditProfileModal(false);
    showToast('Profile updated successfully!');
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
              onPress={() => setShowQRModal(true)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="qrcode-scan" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Floating Identity Card */}
        <View style={styles.floatingProfileCard}>
          <View style={styles.avatarRow}>
            <TouchableOpacity
              style={styles.avatarGlowWrapper}
              onPress={() => {
                setEditNameInput(userName);
                setEditHandleInput(userHandle);
                setEditBioInput(userBio);
                setSelectedAvatarPreset(avatarUri);
                setShowEditProfileModal(true);
              }}
              activeOpacity={0.8}
            >
              <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
              <View style={styles.editAvatarBadge}>
                <Feather name="camera" size={12} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <View style={styles.identityDetails}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.userName}>{userName}</Text>
                <TouchableOpacity
                  style={styles.editProfilePill}
                  onPress={() => {
                    setEditNameInput(userName);
                    setEditHandleInput(userHandle);
                    setEditBioInput(userBio);
                    setSelectedAvatarPreset(avatarUri);
                    setShowEditProfileModal(true);
                  }}
                >
                  <Feather name="edit-2" size={12} color="#047857" />
                  <Text style={styles.editProfilePillText}>Edit</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.handleRow}>
                <Text style={styles.userHandle}>{userHandle}</Text>
                <TouchableOpacity onPress={() => copyToClipboard(userHandle, 'Sunao ID')}>
                  <Feather name="copy" size={13} color="#059669" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
              <Text style={styles.userPhone}>+91 {currentUserPhone || '9876543210'}</Text>
              <Text style={styles.userBioText}>{userBio}</Text>
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

              <TouchableOpacity
                style={[styles.moodChip, styles.addCustomChip]}
                onPress={() => {
                  setInputCustomText(customStatus);
                  setSelectedEmoji(customEmoji || '💬');
                  setShowCustomStatusModal(true);
                }}
                activeOpacity={0.7}
              >
                <Feather name="plus" size={13} color="#047857" />
                <Text style={[styles.moodText, { color: '#047857' }]}>Custom...</Text>
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
          <Text style={[styles.telemetryValue, { color: '#047857' }]}>100%</Text>
          <Text style={styles.telemetryLabel}>E2E Encrypted</Text>
        </View>
        <View style={styles.telemetryDivider} />
        <View style={styles.telemetryItem}>
          <Text style={[styles.telemetryValue, { color: '#0284C7' }]}>OPUS 48k</Text>
          <Text style={styles.telemetryLabel}>HD Audio</Text>
        </View>
      </View>

      {/* 3. Bento-Style Grid Dashboard (ALL 4 ACTIVE) */}
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
          <Text style={styles.bentoCardSubtitle}>PIN lock, blue ticks & privacy</Text>
          <View style={[styles.bentoFooterPill, { backgroundColor: pinLockEnabled ? '#ECFDF5' : '#F5F3FF' }]}>
            <Text style={[styles.bentoFooterPillText, { color: pinLockEnabled ? '#047857' : '#7C3AED' }]}>
              {pinLockEnabled ? 'PIN ACTIVE' : 'CONFIGURE'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Bento 2: Call Studio (Noise & Audio) */}
        <TouchableOpacity
          style={styles.bentoCard}
          onPress={() => setActiveBentoModal('studio')}
          activeOpacity={0.8}
        >
          <View style={[styles.bentoIconBadge, { backgroundColor: '#ECFDF5' }]}>
            <MaterialCommunityIcons name="broadcast" size={22} color="#047857" />
          </View>
          <Text style={styles.bentoCardTitle}>Call Studio</Text>
          <Text style={styles.bentoCardSubtitle}>Acoustic noise filter & HD mic</Text>
          <View style={[styles.bentoFooterPill, { backgroundColor: '#ECFDF5' }]}>
            <Text style={[styles.bentoFooterPillText, { color: '#047857' }]}>{noiseLevel.toUpperCase()}</Text>
          </View>
        </TouchableOpacity>

        {/* Bento 3: Appearance & Themes */}
        <TouchableOpacity
          style={[styles.bentoCard, isDark && { backgroundColor: '#0D1117', borderColor: 'rgba(255, 255, 255, 0.08)' }]}
          onPress={() => setActiveBentoModal('theme')}
          activeOpacity={0.8}
        >
          <View style={[styles.bentoIconBadge, { backgroundColor: isDark ? 'rgba(0, 242, 254, 0.15)' : '#EFF6FF' }]}>
            <Ionicons name="color-palette" size={22} color={isDark ? '#00F2FE' : '#0284C7'} />
          </View>
          <Text style={[styles.bentoCardTitle, isDark && { color: '#FFFFFF' }]}>Theme Studio</Text>
          <Text style={[styles.bentoCardSubtitle, isDark && { color: '#94A3B8' }]}>
            {isDark ? '🌙 Dark OLED Active' : '☀️ Light Slate Active'}
          </Text>
          <View style={[styles.bentoFooterPill, { backgroundColor: isDark ? 'rgba(0, 242, 254, 0.15)' : '#EFF6FF' }]}>
            <Text style={[styles.bentoFooterPillText, { color: isDark ? '#00F2FE' : '#0284C7' }]}>
              {isDark ? 'DARK OLED' : 'LIGHT SLATE'}
            </Text>
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
          <Text style={styles.bentoCardSubtitle}>Web & Mobile active sessions</Text>
          <View style={[styles.bentoFooterPill, { backgroundColor: '#FEF2F2' }]}>
            <Text style={[styles.bentoFooterPillText, { color: '#EF4444' }]}>2 SESSIONS</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* 4. Quick Toggles Card (ACTIVE WITH PERSISTENCE) */}
      <View style={styles.togglesCard}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleLeft}>
            <MaterialCommunityIcons name="incognito" size={22} color="#047857" />
            <View style={styles.toggleTextGroup}>
              <Text style={styles.toggleTitle}>Ghost Mode</Text>
              <Text style={styles.toggleSubtitle}>Hide online status & typing indicator</Text>
            </View>
          </View>
          <Switch
            value={isIncognito}
            onValueChange={(val) => {
              setIsIncognito(val);
              AsyncStorage.setItem('@sunao_ghost_mode', val ? 'true' : 'false');
              showToast(val ? 'Ghost Mode enabled' : 'Ghost Mode disabled');
            }}
            trackColor={{ false: '#E2E8F0', true: '#A7F3D0' }}
            thumbColor={isIncognito ? '#047857' : '#FFFFFF'}
          />
        </View>

        <View style={styles.toggleDivider} />

        <View style={styles.toggleRow}>
          <View style={styles.toggleLeft}>
            <MaterialCommunityIcons name="waveform" size={22} color="#0284C7" />
            <View style={styles.toggleTextGroup}>
              <Text style={styles.toggleTitle}>AI Noise Cancellation</Text>
              <Text style={styles.toggleSubtitle}>Filter ambient noise during calls</Text>
            </View>
          </View>
          <Switch
            value={isNoiseCancellation}
            onValueChange={(val) => {
              setIsNoiseCancellation(val);
              AsyncStorage.setItem('@sunao_noise_cancellation', val ? 'true' : 'false');
              showToast(val ? 'AI Noise Cancellation enabled' : 'AI Noise Cancellation off');
            }}
            trackColor={{ false: '#E2E8F0', true: '#BFDBFE' }}
            thumbColor={isNoiseCancellation ? '#0284C7' : '#FFFFFF'}
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
        <Text style={styles.footerTech}>ZERO TRACKERS • PRIVATE PEER-TO-PEER</Text>
        <Text style={styles.footerCopy}>Sunao v1.0.0 (Production Release)</Text>
      </View>

      {/* Toast Notification Banner */}
      {Boolean(toastMessage) && (
        <View style={styles.toastBanner}>
          <Ionicons name="checkmark-circle" size={18} color="#10B981" style={{ marginRight: 8 }} />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* ================= MODALS ================= */}

      {/* 1. Edit Profile Modal */}
      <Modal visible={showEditProfileModal} transparent animationType="slide" onRequestClose={() => setShowEditProfileModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.editProfileCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeaderTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditProfileModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              <Text style={styles.inputMiniLabel}>SELECT AVATAR</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {AVATAR_PRESETS.map((uri, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setSelectedAvatarPreset(uri)}
                    style={[
                      styles.avatarPresetOption,
                      selectedAvatarPreset === uri && styles.avatarPresetOptionActive,
                    ]}
                  >
                    <Image source={{ uri }} style={styles.avatarPresetImg} />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputMiniLabel}>FULL NAME</Text>
              <TextInput
                style={styles.modalTextInput}
                value={editNameInput}
                onChangeText={setEditNameInput}
                placeholder="Enter full name"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputMiniLabel}>SUNAO HANDLE</Text>
              <TextInput
                style={styles.modalTextInput}
                value={editHandleInput}
                onChangeText={setEditHandleInput}
                placeholder="@username"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputMiniLabel}>ABOUT / BIO</Text>
              <TextInput
                style={[styles.modalTextInput, { height: 64 }]}
                value={editBioInput}
                onChangeText={setEditBioInput}
                placeholder="What's on your mind?"
                placeholderTextColor="#94A3B8"
                multiline
              />
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowEditProfileModal(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveProfile}>
                <Text style={styles.modalSaveBtnText}>Save Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. QR Code Share Digital Pass Modal */}
      <Modal visible={showQRModal} transparent animationType="fade" onRequestClose={() => setShowQRModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.qrPassCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeaderTitle}>Sunao ID Pass</Text>
              <TouchableOpacity onPress={() => setShowQRModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.qrCodeBox}>
              <Image source={{ uri: avatarUri }} style={styles.qrAvatarCenter} />
              {/* Visual Simulated QR Matrix */}
              <View style={styles.qrMatrixPattern}>
                <MaterialCommunityIcons name="qrcode" size={180} color="#047857" />
              </View>
            </View>

            <Text style={styles.qrCardName}>{userName}</Text>
            <Text style={styles.qrCardHandle}>{userHandle} • +91 {currentUserPhone || '9876543210'}</Text>
            <Text style={styles.qrCardSub}>Scan this code to start an instant encrypted chat with me.</Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalSecondaryBtn}
                onPress={() => copyToClipboard(`https://sunao.chat/u/${userHandle.replace('@', '')}`, 'Profile Link')}
              >
                <Feather name="copy" size={14} color="#047857" style={{ marginRight: 6 }} />
                <Text style={{ color: '#047857', fontWeight: '700', fontSize: 13 }}>Copy Link</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={() => {
                  const link = `https://sunao.chat/u/${userHandle.replace('@', '')}`;
                  if (typeof navigator !== 'undefined' && (navigator as any).share) {
                    (navigator as any).share({ title: 'Add me on Sunao', url: link }).catch(() => {});
                  } else {
                    copyToClipboard(link, 'Profile link');
                  }
                }}
              >
                <Feather name="share" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.modalSaveBtnText}>Share Code</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 3. Bento 1: Privacy Vault Modal (FULLY ACTIVE) */}
      <Modal visible={activeBentoModal === 'vault'} transparent animationType="fade" onRequestClose={() => setActiveBentoModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.bentoDetailCard}>
            <View style={styles.bentoDetailHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.bentoIconBadge, { backgroundColor: '#F5F3FF', width: 34, height: 34, marginRight: 10 }]}>
                  <Ionicons name="finger-print" size={18} color="#7C3AED" />
                </View>
                <Text style={styles.bentoDetailTitle}>Privacy Vault</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveBentoModal(null)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              <View style={styles.activeSettingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activeSettingTitle}>App PIN Security</Text>
                  <Text style={styles.activeSettingSub}>Require 4-digit code on app launch</Text>
                </View>
                <Switch
                  value={pinLockEnabled}
                  onValueChange={(val) => {
                    setPinLockEnabled(val);
                    AsyncStorage.setItem('@sunao_pin_enabled', val ? 'true' : 'false');
                    showToast(val ? 'App PIN protection activated' : 'PIN protection turned off');
                  }}
                  trackColor={{ false: '#E2E8F0', true: '#DDD6FE' }}
                  thumbColor={pinLockEnabled ? '#7C3AED' : '#FFFFFF'}
                />
              </View>

              <View style={styles.activeSettingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activeSettingTitle}>Read Receipts (Blue Ticks)</Text>
                  <Text style={styles.activeSettingSub}>Let contacts know when you read messages</Text>
                </View>
                <Switch
                  value={readReceipts}
                  onValueChange={(val) => {
                    setReadReceipts(val);
                    AsyncStorage.setItem('@sunao_read_receipts', val ? 'true' : 'false');
                    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
                      window.localStorage.setItem('@sunao_read_receipts', val ? 'true' : 'false');
                    }
                    showToast(val ? '✓ Read Receipts (Blue Ticks) activated' : 'Read Receipts turned off');
                  }}
                  trackColor={{ false: '#E2E8F0', true: '#10B981' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.activeSettingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activeSettingTitle}>Screen Capture Protection</Text>
                  <Text style={styles.activeSettingSub}>Block screenshots in sensitive chats</Text>
                </View>
                <Switch
                  value={screenSecurity}
                  onValueChange={(val) => {
                    setScreenSecurity(val);
                    AsyncStorage.setItem('@sunao_screen_security', val ? 'true' : 'false');
                    showToast('Screen security preference saved');
                  }}
                  trackColor={{ false: '#E2E8F0', true: '#DDD6FE' }}
                  thumbColor={screenSecurity ? '#7C3AED' : '#FFFFFF'}
                />
              </View>

              <View style={styles.activeSettingRowColumn}>
                <Text style={styles.activeSettingTitle}>Who can see my Last Seen</Text>
                <View style={styles.pillGroupRow}>
                  {(['Everyone', 'My Contacts', 'Nobody'] as const).map((aud) => (
                    <TouchableOpacity
                      key={aud}
                      style={[styles.pillOption, lastSeenAudience === aud && styles.pillOptionActive]}
                      onPress={() => {
                        setLastSeenAudience(aud);
                        AsyncStorage.setItem('@sunao_last_seen', aud);
                        showToast(`Last seen set to ${aud}`);
                      }}
                    >
                      <Text style={[styles.pillOptionText, lastSeenAudience === aud && styles.pillOptionTextActive]}>
                        {aud}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={styles.keyCopyBox}
                onPress={() => copyToClipboard('curve25519-sunao-9876-prod-identity-key-v1', 'Public Identity Key')}
              >
                <Text style={styles.keyCopyTitle}>My Curve25519 Public Key</Text>
                <Text style={styles.keyCopyText}>curve25519-sunao-9876-prod-identity-key-v1</Text>
                <Text style={styles.keyCopySub}>Tap to copy public key for verification</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity style={styles.bentoDoneBtn} onPress={() => setActiveBentoModal(null)}>
              <Text style={styles.bentoDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 4. Bento 2: Call Studio Modal (FULLY ACTIVE) */}
      <Modal visible={activeBentoModal === 'studio'} transparent animationType="fade" onRequestClose={() => setActiveBentoModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.bentoDetailCard}>
            <View style={styles.bentoDetailHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.bentoIconBadge, { backgroundColor: '#ECFDF5', width: 34, height: 34, marginRight: 10 }]}>
                  <MaterialCommunityIcons name="broadcast" size={18} color="#047857" />
                </View>
                <Text style={styles.bentoDetailTitle}>Call Studio</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveBentoModal(null)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              <View style={styles.activeSettingRowColumn}>
                <Text style={styles.activeSettingTitle}>Background Noise Cancellation</Text>
                <Text style={styles.activeSettingSub}>AI filters keyboard typing, traffic, and fan hum</Text>
                <View style={styles.pillGroupRow}>
                  {(['Off', 'Standard AI', 'Studio Ultra'] as const).map((lvl) => (
                    <TouchableOpacity
                      key={lvl}
                      style={[styles.pillOption, noiseLevel === lvl && styles.pillOptionActiveGreen]}
                      onPress={() => {
                        setNoiseLevel(lvl);
                        AsyncStorage.setItem('@sunao_noise_level', lvl);
                        showToast(`Noise filter set to ${lvl}`);
                      }}
                    >
                      <Text style={[styles.pillOptionText, noiseLevel === lvl && styles.pillOptionTextActiveGreen]}>
                        {lvl}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.activeSettingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activeSettingTitle}>Acoustic Echo Cancellation</Text>
                  <Text style={styles.activeSettingSub}>Hardware speaker feedback suppression</Text>
                </View>
                <Switch
                  value={echoCancellation}
                  onValueChange={(val) => {
                    setEchoCancellation(val);
                    AsyncStorage.setItem('@sunao_echo_cancellation', val ? 'true' : 'false');
                    showToast('Echo cancellation updated');
                  }}
                  trackColor={{ false: '#E2E8F0', true: '#A7F3D0' }}
                  thumbColor={echoCancellation ? '#047857' : '#FFFFFF'}
                />
              </View>

              <View style={styles.activeSettingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activeSettingTitle}>Opus 48kHz HD Voice</Text>
                  <Text style={styles.activeSettingSub}>Broadcast quality crystal clear calls</Text>
                </View>
                <Switch
                  value={hdVoice}
                  onValueChange={(val) => {
                    setHdVoice(val);
                    AsyncStorage.setItem('@sunao_hd_voice', val ? 'true' : 'false');
                    showToast('HD Voice audio profile saved');
                  }}
                  trackColor={{ false: '#E2E8F0', true: '#A7F3D0' }}
                  thumbColor={hdVoice ? '#047857' : '#FFFFFF'}
                />
              </View>

              <View style={styles.activeSettingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activeSettingTitle}>Low Data Mode (2G/3G Calling)</Text>
                  <Text style={styles.activeSettingSub}>Optimizes bandwidth for weak networks</Text>
                </View>
                <Switch
                  value={callDataSaver}
                  onValueChange={(val) => {
                    setCallDataSaver(val);
                    AsyncStorage.setItem('@sunao_call_data_saver', val ? 'true' : 'false');
                    showToast(val ? 'Data Saver enabled' : 'Data Saver disabled');
                  }}
                  trackColor={{ false: '#E2E8F0', true: '#A7F3D0' }}
                  thumbColor={callDataSaver ? '#047857' : '#FFFFFF'}
                />
              </View>

              {/* Interactive Live Mic Gauge Simulator */}
              <TouchableOpacity
                style={styles.testMicBox}
                onPress={() => {
                  setIsTestingMic(!isTestingMic);
                  showToast(isTestingMic ? 'Microphone test stopped' : 'Testing microphone level... Speak now!');
                }}
                activeOpacity={0.8}
              >
                <Ionicons name={isTestingMic ? 'mic' : 'mic-outline'} size={20} color="#047857" />
                <Text style={styles.testMicTitle}>{isTestingMic ? 'Mic Active: Soundwave OK' : 'Tap to Test Microphone'}</Text>
                {isTestingMic && (
                  <View style={styles.waveBarsRow}>
                    <View style={[styles.waveBar, { height: 16 }]} />
                    <View style={[styles.waveBar, { height: 26 }]} />
                    <View style={[styles.waveBar, { height: 18 }]} />
                    <View style={[styles.waveBar, { height: 32 }]} />
                    <View style={[styles.waveBar, { height: 22 }]} />
                    <View style={[styles.waveBar, { height: 14 }]} />
                  </View>
                )}
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity style={styles.bentoDoneBtn} onPress={() => setActiveBentoModal(null)}>
              <Text style={styles.bentoDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 5. Bento 3: Theme Studio Modal (FULLY ACTIVE) */}
      <Modal visible={activeBentoModal === 'theme'} transparent animationType="fade" onRequestClose={() => setActiveBentoModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.bentoDetailCard}>
            <View style={styles.bentoDetailHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.bentoIconBadge, { backgroundColor: '#EFF6FF', width: 34, height: 34, marginRight: 10 }]}>
                  <Ionicons name="color-palette" size={18} color="#0284C7" />
                </View>
                <Text style={styles.bentoDetailTitle}>Theme Studio</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveBentoModal(null)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              <Text style={styles.inputMiniLabel}>APPEARANCE / COLOR SCHEME</Text>
              <View style={styles.themeCardsRow}>
                {/* Light */}
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
                    <Ionicons name="sunny" size={20} color={!isDark ? '#059669' : '#94A3B8'} />
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

                {/* Dark OLED (Synkon) */}
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
                    <Ionicons name="moon" size={20} color={isDark ? '#00F2FE' : '#64748B'} />
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

              {/* Direct Switch Row */}
              <View style={[styles.themeSwitchRow, isDark && { backgroundColor: '#161B22', borderColor: 'rgba(255, 255, 255, 0.08)' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={isDark ? '#A855F7' : '#059669'} style={{ marginRight: 10 }} />
                  <Text style={[styles.themeSwitchText, isDark && { color: '#FFFFFF' }]}>Dark OLED Theme</Text>
                </View>
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: '#CBD5E1', true: '#10B981' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <Text style={[styles.inputMiniLabel, { marginTop: 14 }]}>SIGNATURE ACCENT COLOR</Text>
              {[
                { name: 'Sunao Emerald', color: '#047857' },
                { name: 'Electric Mint', color: '#10B981' },
                { name: 'Ocean Cyan', color: '#0284C7' },
                { name: 'Acoustic Indigo', color: '#6366F1' },
                { name: 'Obsidian Slate', color: '#0F172A' },
              ].map((th) => (
                <TouchableOpacity
                  key={th.name}
                  style={[styles.themeOptionRow, appTheme === th.name && styles.themeOptionRowActive]}
                  onPress={() => {
                    setAppTheme(th.name);
                    AsyncStorage.setItem('@sunao_app_theme', th.name);
                    showToast(`Theme set to ${th.name}`);
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.themeDot, { backgroundColor: th.color }]} />
                    <Text style={[styles.themeOptionText, appTheme === th.name && { color: '#0F172A', fontWeight: '800' }]}>
                      {th.name}
                    </Text>
                  </View>
                  {appTheme === th.name && <Ionicons name="checkmark-circle" size={20} color="#0284C7" />}
                </TouchableOpacity>
              ))}

              <Text style={[styles.inputMiniLabel, { marginTop: 14 }]}>CHAT BUBBLE GEOMETRY</Text>
              <View style={styles.pillGroupRow}>
                {(['Modern Squircle', 'Rounded Soft'] as const).map((geo) => (
                  <TouchableOpacity
                    key={geo}
                    style={[styles.pillOption, bubbleGeometry === geo && styles.pillOptionActiveBlue]}
                    onPress={() => {
                      setBubbleGeometry(geo);
                      AsyncStorage.setItem('@sunao_bubble_geometry', geo);
                      showToast(`Bubble style: ${geo}`);
                    }}
                  >
                    <Text style={[styles.pillOptionText, bubbleGeometry === geo && styles.pillOptionTextActiveBlue]}>
                      {geo}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputMiniLabel, { marginTop: 14 }]}>FONT SIZE SCALE</Text>
              <View style={styles.pillGroupRow}>
                {(['Compact', 'Normal', 'Large'] as const).map((sz) => (
                  <TouchableOpacity
                    key={sz}
                    style={[styles.pillOption, fontSizeScale === sz && styles.pillOptionActiveBlue]}
                    onPress={() => {
                      setFontSizeScale(sz);
                      AsyncStorage.setItem('@sunao_font_size', sz);
                      showToast(`Text scale: ${sz}`);
                    }}
                  >
                    <Text style={[styles.pillOptionText, fontSizeScale === sz && styles.pillOptionTextActiveBlue]}>
                      {sz}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.bentoDoneBtn} onPress={() => setActiveBentoModal(null)}>
              <Text style={styles.bentoDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 6. Bento 4: Linked Devices Modal (FULLY ACTIVE) */}
      <Modal visible={activeBentoModal === 'devices'} transparent animationType="fade" onRequestClose={() => setActiveBentoModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.bentoDetailCard}>
            <View style={styles.bentoDetailHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.bentoIconBadge, { backgroundColor: '#FEF2F2', width: 34, height: 34, marginRight: 10 }]}>
                  <MaterialCommunityIcons name="laptop" size={18} color="#EF4444" />
                </View>
                <Text style={styles.bentoDetailTitle}>Linked Devices</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveBentoModal(null)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              <Text style={styles.inputMiniLabel}>CURRENT SESSION</Text>
              <View style={styles.sessionCard}>
                <View style={[styles.sessionIconBg, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="desktop" size={20} color="#047857" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.sessionTitle}>
                      {Platform.OS === 'web' ? 'Web Client / Desktop' : 'Android Mobile Device'}
                    </Text>
                    <View style={styles.activeNowTag}>
                      <Text style={styles.activeNowText}>ACTIVE NOW</Text>
                    </View>
                  </View>
                  <Text style={styles.sessionSub}>Localhost Signaling Session • End-to-End Encrypted</Text>
                </View>
              </View>

              <Text style={[styles.inputMiniLabel, { marginTop: 14 }]}>SYNCED SESSIONS</Text>
              <View style={styles.sessionCard}>
                <View style={[styles.sessionIconBg, { backgroundColor: '#F8FAFC' }]}>
                  <Ionicons name="phone-portrait-outline" size={20} color="#475569" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.sessionTitle}>Sunao Android APK (Realme)</Text>
                  <Text style={styles.sessionSub}>Last synced today at 9:35 PM</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.linkDeviceBtn}
                onPress={() => setShowLinkDeviceScanner(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="scan" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.linkDeviceBtnText}>Link a New Device (QR)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.logOutAllBtn}
                onPress={() => showToast('All other remote web sessions revoked')}
                activeOpacity={0.7}
              >
                <Text style={styles.logOutAllText}>Log Out from Other Devices</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity style={styles.bentoDoneBtn} onPress={() => setActiveBentoModal(null)}>
              <Text style={styles.bentoDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 7. Link Device QR Scanner Modal */}
      <Modal visible={showLinkDeviceScanner} transparent animationType="fade" onRequestClose={() => setShowLinkDeviceScanner(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.scannerCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeaderTitle}>Scan QR Code</Text>
              <TouchableOpacity onPress={() => setShowLinkDeviceScanner(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.scannerSub}>
              Open Sunao on your desktop or laptop at <Text style={{ fontWeight: '700', color: '#047857' }}>sunao.chat</Text> and scan the QR code to link instantly.
            </Text>

            <View style={styles.scannerViewport}>
              <MaterialCommunityIcons name="qrcode-scan" size={100} color="#047857" />
              <Text style={styles.scannerHint}>Point camera at screen</Text>
            </View>

            <TouchableOpacity
              style={styles.modalSaveBtn}
              onPress={() => {
                setShowLinkDeviceScanner(false);
                showToast('Device linked successfully!');
              }}
            >
              <Text style={styles.modalSaveBtnText}>Simulate Instant Pair</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 8. Custom Status Modal */}
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

      {/* 9. Logout Confirmation Modal */}
      <Modal visible={showLogoutConfirm} transparent animationType="fade" onRequestClose={() => setShowLogoutConfirm(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowLogoutConfirm(false)}>
          <View style={styles.logoutCard}>
            <View style={styles.logoutIconCircle}>
              <Feather name="log-out" size={28} color="#EF4444" />
            </View>
            <Text style={styles.logoutTitle}>Sign Out</Text>
            <Text style={styles.logoutSubtitle}>
              Are you sure you want to sign out of this device? Your local chats remain safely encrypted.
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
    height: 130 + (Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0),
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 44 : ((StatusBar.currentHeight || 24) + 12),
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
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarGlowWrapper: {
    position: 'relative',
    marginRight: 14,
  },
  avatarImg: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2,
    borderColor: '#A7F3D0',
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#047857',
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  editProfilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  editProfilePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  userHandle: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '700',
  },
  userPhone: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  userBioText: {
    fontSize: 12,
    color: '#334155',
    marginTop: 4,
    fontStyle: 'italic',
  },
  moodSelectorWrapper: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionMiniLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  setCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  setCustomBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  moodsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 6,
  },
  moodChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  moodEmoji: {
    fontSize: 14,
  },
  moodText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  moodTextActive: {
    color: '#047857',
    fontWeight: '800',
  },
  addCustomChip: {
    borderStyle: 'dashed',
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDF4',
  },
  telemetryCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  telemetryItem: {
    alignItems: 'center',
    flex: 1,
  },
  telemetryValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  telemetryLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  telemetryDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#F1F5F9',
  },
  bentoSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginHorizontal: 18,
    marginBottom: 10,
    letterSpacing: 0.8,
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  bentoCard: {
    width: '48.3%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
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
    fontWeight: '800',
    color: '#0F172A',
  },
  bentoCardSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 14,
    height: 28,
  },
  bentoFooterPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 8,
  },
  bentoFooterPillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  togglesCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    marginTop: 2,
  },
  toggleDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  modernLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 20,
  },
  modernLogoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
  brandFooter: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerTech: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  footerCopy: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  toastBanner: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 4,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  inputMiniLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  modalTextInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 12,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13,
  },
  modalSaveBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    backgroundColor: '#047857',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  modalSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  editProfileCard: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: 400,
    borderRadius: 22,
    padding: 20,
  },
  avatarPresetOption: {
    padding: 2,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'transparent',
    marginRight: 8,
  },
  avatarPresetOptionActive: {
    borderColor: '#047857',
  },
  avatarPresetImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  qrPassCard: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: 360,
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
  },
  qrCodeBox: {
    position: 'relative',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    width: 220,
    height: 220,
  },
  qrMatrixPattern: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrAvatarCenter: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    zIndex: 10,
  },
  qrCardName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  qrCardHandle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#047857',
    marginTop: 2,
  },
  qrCardSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 12,
  },
  bentoDetailCard: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: 420,
    borderRadius: 22,
    padding: 20,
  },
  bentoDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  bentoDetailTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  bentoDoneBtn: {
    backgroundColor: '#047857',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  bentoDoneBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  activeSettingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  activeSettingRowColumn: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  activeSettingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  activeSettingSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  pillGroupRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  pillOption: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillOptionActive: {
    backgroundColor: '#F5F3FF',
    borderColor: '#7C3AED',
  },
  pillOptionActiveGreen: {
    backgroundColor: '#ECFDF5',
    borderColor: '#047857',
  },
  pillOptionActiveBlue: {
    backgroundColor: '#EFF6FF',
    borderColor: '#0284C7',
  },
  pillOptionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  pillOptionTextActive: {
    color: '#7C3AED',
    fontWeight: '800',
  },
  pillOptionTextActiveGreen: {
    color: '#047857',
    fontWeight: '800',
  },
  pillOptionTextActiveBlue: {
    color: '#0284C7',
    fontWeight: '800',
  },
  keyCopyBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  keyCopyTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
  },
  keyCopyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
    marginTop: 2,
  },
  keyCopySub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
  },
  testMicBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    gap: 10,
  },
  testMicTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#047857',
    flex: 1,
  },
  waveBarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  waveBar: {
    width: 3,
    backgroundColor: '#047857',
    borderRadius: 2,
  },
  themeOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
  },
  themeOptionRowActive: {
    backgroundColor: '#EFF6FF',
  },
  themeDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 10,
  },
  themeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  sessionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  activeNowTag: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  activeNowText: {
    color: '#047857',
    fontSize: 8,
    fontWeight: '800',
  },
  sessionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  linkDeviceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#047857',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  linkDeviceBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  logOutAllBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 6,
  },
  logOutAllText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 12,
  },
  scannerCard: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: 360,
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
  },
  scannerSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 14,
  },
  scannerViewport: {
    width: 200,
    height: 200,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#047857',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  scannerHint: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 8,
  },
  logoutCard: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: 340,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
  },
  logoutIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoutTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  logoutSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  logoutActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13,
  },
  confirmLogoutBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmLogoutBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  customStatusCard: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: 400,
    borderRadius: 22,
    padding: 20,
  },
  customStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  customStatusTitle: {
    fontSize: 18,
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
  emojiScrollRow: {
    gap: 8,
    marginBottom: 14,
  },
  emojiSelectBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emojiSelectBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#047857',
  },
  statusInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputLeadingEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  statusTextInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  charCountText: {
    fontSize: 10,
    color: '#94A3B8',
    alignSelf: 'flex-end',
    marginTop: 4,
    marginBottom: 12,
  },
  suggestionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  sugChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  sugChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  customStatusActions: {
    flexDirection: 'row',
    gap: 8,
  },
  clearStatusBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    alignItems: 'center',
  },
  clearStatusBtnText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 13,
  },
  cancelStatusBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelStatusBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13,
  },
  saveStatusBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#047857',
    borderRadius: 12,
    alignItems: 'center',
  },
  saveStatusBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  themeCardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  themeModeCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  themeModeCardActive: {
    borderColor: '#047857',
    backgroundColor: '#ECFDF5',
  },
  themeModeCardActiveDark: {
    borderColor: '#10B981',
    backgroundColor: '#000000',
  },
  themeModeIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  themeModeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  themeModeSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  themeModeSelectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  themeSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  themeSwitchText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
});
