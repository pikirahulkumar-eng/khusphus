import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Switch,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface ContactProfileModalProps {
  visible: boolean;
  onClose: () => void;
  contactName: string;
  contactPhone: string;
  avatarUri?: string;
  aboutText?: string;
  onStartCall: (isVideo: boolean) => void;
  onClearChat?: () => void;
}

export default function ContactProfileModal({
  visible,
  onClose,
  contactName,
  contactPhone,
  avatarUri,
  aboutText = 'Hey there! Using Sunao for HD voice & crystal clear calling. 🚀',
  onStartCall,
  onClearChat,
}: ContactProfileModalProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showSecurityVerify, setShowSecurityVerify] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    showToast(`${label} copied to clipboard!`);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        <StatusBar backgroundColor="transparent" barStyle="dark-content" translucent />

        {/* Top App Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle} numberOfLines={1}>Contact Info</Text>
          <TouchableOpacity
            style={styles.topBarAction}
            onPress={() => showToast('Share contact link ready')}
            activeOpacity={0.7}
          >
            <Ionicons name="share-social-outline" size={21} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Profile Card */}
          <View style={styles.heroCard}>
            <View style={styles.avatarContainer}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial}>{contactName.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.onlineBadge}>
                <View style={styles.onlineDot} />
              </View>
            </View>

            <Text style={styles.profileName}>{contactName}</Text>
            <TouchableOpacity
              style={styles.phonePill}
              onPress={() => copyToClipboard(contactPhone, 'Phone number')}
              activeOpacity={0.7}
            >
              <Text style={styles.phoneText}>+91 {contactPhone}</Text>
              <Feather name="copy" size={13} color="#047857" style={{ marginLeft: 6 }} />
            </TouchableOpacity>

            <Text style={styles.aboutText}>{aboutText}</Text>
          </View>

          {/* Instant Quick-Connect Action Grid */}
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={styles.actionTile}
              onPress={() => {
                onClose();
                onStartCall(false);
              }}
              activeOpacity={0.75}
            >
              <View style={[styles.actionIconBg, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="call" size={20} color="#047857" />
              </View>
              <Text style={styles.actionLabel}>Audio Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionTile}
              onPress={() => {
                onClose();
                onStartCall(true);
              }}
              activeOpacity={0.75}
            >
              <View style={[styles.actionIconBg, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="videocam" size={21} color="#0284C7" />
              </View>
              <Text style={styles.actionLabel}>Video Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionTile}
              onPress={() => showToast('Search messages enabled')}
              activeOpacity={0.75}
            >
              <View style={[styles.actionIconBg, { backgroundColor: '#F8FAFC' }]}>
                <Ionicons name="search" size={20} color="#475569" />
              </View>
              <Text style={styles.actionLabel}>Search</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionTile}
              onPress={() => {
                setIsMuted(!isMuted);
                showToast(isMuted ? 'Unmuted notifications' : 'Muted notifications');
              }}
              activeOpacity={0.75}
            >
              <View style={[styles.actionIconBg, isMuted ? { backgroundColor: '#FEF2F2' } : { backgroundColor: '#F8FAFC' }]}>
                <Ionicons
                  name={isMuted ? 'volume-mute' : 'volume-high-outline'}
                  size={20}
                  color={isMuted ? '#EF4444' : '#475569'}
                />
              </View>
              <Text style={[styles.actionLabel, isMuted && { color: '#EF4444' }]}>
                {isMuted ? 'Muted' : 'Mute'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Media, Links & Documents Shelf */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Media, links, and docs</Text>
              <TouchableOpacity onPress={() => showToast('Viewing media gallery')}>
                <Text style={styles.sectionLink}>12 items ›</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.mediaRow}>
              <View style={[styles.mediaThumb, { backgroundColor: '#E2E8F0' }]}>
                <Ionicons name="image" size={20} color="#64748B" />
              </View>
              <View style={[styles.mediaThumb, { backgroundColor: '#E2E8F0' }]}>
                <Ionicons name="mic" size={20} color="#047857" />
              </View>
              <View style={[styles.mediaThumb, { backgroundColor: '#E2E8F0' }]}>
                <Ionicons name="document-text" size={20} color="#0284C7" />
              </View>
              <View style={[styles.mediaThumb, { backgroundColor: '#F1F5F9' }]}>
                <Ionicons name="link" size={20} color="#8B5CF6" />
              </View>
            </View>
          </View>

          {/* Security & Verification Card */}
          <TouchableOpacity
            style={styles.sectionCard}
            onPress={() => setShowSecurityVerify(true)}
            activeOpacity={0.7}
          >
            <View style={styles.securityRow}>
              <View style={styles.securityIconBg}>
                <Ionicons name="lock-closed" size={20} color="#047857" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.securityTitle}>Encryption</Text>
                <Text style={styles.securitySub}>Messages and calls are end-to-end encrypted. Tap to verify safety numbers.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          {/* Chat Preferences */}
          <View style={styles.sectionCard}>
            <View style={styles.prefRow}>
              <View style={styles.prefIconBg}>
                <Ionicons name="notifications-outline" size={20} color="#475569" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.prefTitle}>Mute notifications</Text>
                <Text style={styles.prefSub}>Silence alerts for new messages</Text>
              </View>
              <Switch
                value={isMuted}
                onValueChange={setIsMuted}
                trackColor={{ false: '#E2E8F0', true: '#A7F3D0' }}
                thumbColor={isMuted ? '#047857' : '#FFFFFF'}
              />
            </View>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.prefRow} onPress={() => showToast('Disappearing messages: Off')}>
              <View style={styles.prefIconBg}>
                <Ionicons name="timer-outline" size={20} color="#475569" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.prefTitle}>Disappearing messages</Text>
                <Text style={styles.prefSub}>Off</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.prefRow} onPress={() => showToast('Chat Wallpaper customizer')}>
              <View style={styles.prefIconBg}>
                <Ionicons name="color-palette-outline" size={20} color="#475569" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.prefTitle}>Chat theme & wallpaper</Text>
                <Text style={styles.prefSub}>Sunao Slate Aura</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Groups in Common */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Groups in common</Text>
            <View style={styles.groupRow}>
              <View style={styles.groupAvatar}>
                <Ionicons name="people" size={18} color="#047857" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.groupName}>Sunao Core Devs 🚀</Text>
                <Text style={styles.groupMembers}>Amit, Vikram, Rahul, Papa</Text>
              </View>
            </View>
          </View>

          {/* Danger Zone */}
          <View style={[styles.sectionCard, { marginBottom: 36 }]}>
            <TouchableOpacity
              style={styles.dangerRow}
              onPress={() => {
                onClearChat?.();
                onClose();
              }}
            >
              <Ionicons name="trash-outline" size={19} color="#EF4444" />
              <Text style={styles.dangerText}>Clear Chat History</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.dangerRow}
              onPress={() => showToast(`Blocked ${contactName}`)}
            >
              <Ionicons name="ban-outline" size={19} color="#EF4444" />
              <Text style={styles.dangerText}>Block {contactName}</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.dangerRow}
              onPress={() => showToast(`Reported ${contactName}`)}
            >
              <Ionicons name="thumbs-down-outline" size={19} color="#EF4444" />
              <Text style={styles.dangerText}>Report {contactName}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Toast Pill */}
        {toastMessage.length > 0 && (
          <View style={styles.toast}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        )}

        {/* Security Fingerprint Modal */}
        <Modal visible={showSecurityVerify} transparent animationType="fade" onRequestClose={() => setShowSecurityVerify(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.securityVerifyCard}>
              <View style={styles.shieldBigBg}>
                <MaterialCommunityIcons name="shield-check" size={32} color="#047857" />
              </View>
              <Text style={styles.securityModalTitle}>Verify Security Number</Text>
              <Text style={styles.securityModalSub}>
                To verify that messages and calls with {contactName} are end-to-end encrypted with Curve25519 & AES-256, compare this code.
              </Text>

              <View style={styles.codeBox}>
                <Text style={styles.codeText}>8749 2038 9120 4482 1092 5712</Text>
              </View>

              <TouchableOpacity
                style={styles.verifyDoneBtn}
                onPress={() => setShowSecurityVerify(false)}
              >
                <Text style={styles.verifyDoneBtnText}>Verified & Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 48 : ((StatusBar.currentHeight || 24) + 8),
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    padding: 6,
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginLeft: 12,
  },
  topBarAction: {
    padding: 6,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 14,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
  },
  avatarFallback: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#ECFDF5',
    borderWidth: 2,
    borderColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 34,
    fontWeight: '800',
    color: '#047857',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  phonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    marginBottom: 12,
  },
  phoneText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#047857',
  },
  aboutText: {
    fontSize: 13.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  actionGrid: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  actionTile: {
    alignItems: 'center',
    flex: 1,
  },
  actionIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionLink: {
    fontSize: 13,
    color: '#047857',
    fontWeight: '600',
  },
  mediaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  mediaThumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  securityIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  securitySub: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  prefIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  prefTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  prefSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  groupAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  groupMembers: {
    fontSize: 12,
    color: '#64748B',
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 10,
  },
  dangerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  toast: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    elevation: 8,
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
    padding: 24,
  },
  securityVerifyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  shieldBigBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  securityModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  securityModalSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  codeBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  codeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 1,
  },
  verifyDoneBtn: {
    backgroundColor: '#047857',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  verifyDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
