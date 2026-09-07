import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

export interface CallLogItem {
  id: string;
  phone: string;
  name: string;
  avatarUri?: string;
  type: 'incoming' | 'outgoing' | 'missed';
  isVideo: boolean;
  time: string;
  count?: number;
}

interface CallsTabProps {
  calls: CallLogItem[];
  onStartCall: (phone: string, name: string, isVideo: boolean) => void;
  onCreateCallLink?: () => void;
  onOpenCallDialer?: () => void;
}

export default function CallsTab({
  calls,
  onStartCall,
  onCreateCallLink,
  onOpenCallDialer,
}: CallsTabProps) {
  const { isDark } = useTheme();
  const [filter, setFilter] = useState<'all' | 'missed' | 'video'>('all');
  const [showDialer, setShowDialer] = useState(false);
  const [dialNumber, setDialNumber] = useState('');
  const [dialError, setDialError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Filtered calls
  const filteredCalls = calls.filter((c) => {
    if (filter === 'missed') return c.type === 'missed';
    if (filter === 'video') return c.isVideo;
    return true;
  });

  const handleCopyCallLink = () => {
    const roomCode = Math.random().toString(36).substring(2, 9);
    const link = `https://sunao.chat/call/room_${roomCode}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(link).catch(() => {});
    }
    setCopiedLink(true);
    if (onCreateCallLink) {
      onCreateCallLink();
    }
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleDialPress = (char: string) => {
    setDialError('');
    if (dialNumber.length < 15) {
      setDialNumber((prev) => prev + char);
    }
  };

  const handleBackspace = () => {
    setDialError('');
    setDialNumber((prev) => prev.slice(0, -1));
  };

  const startDialCall = (isVideo: boolean) => {
    const cleanNumber = dialNumber.trim().replace(/[^0-9+]/g, '');
    if (!cleanNumber || cleanNumber.length < 3) {
      setDialError('Please enter a valid phone number');
      setTimeout(() => setDialError(''), 2500);
      return;
    }
    setDialError('');
    setShowDialer(false);
    onStartCall(cleanNumber, cleanNumber, isVideo);
    setDialNumber('');
  };

  const renderDirectionBadge = (type: 'incoming' | 'outgoing' | 'missed') => {
    if (type === 'missed') {
      return (
        <View style={[styles.directionBadge, styles.badgeMissed]}>
          <MaterialIcons name="call-missed" size={13} color="#EF4444" />
          <Text style={[styles.directionText, { color: '#EF4444' }]}>Missed</Text>
        </View>
      );
    }
    if (type === 'incoming') {
      return (
        <View style={[styles.directionBadge, styles.badgeIncoming]}>
          <MaterialIcons name="call-received" size={13} color="#059669" />
          <Text style={[styles.directionText, { color: '#059669' }]}>Incoming</Text>
        </View>
      );
    }
    return (
      <View style={[styles.directionBadge, styles.badgeOutgoing]}>
        <MaterialIcons name="call-made" size={13} color="#0284C7" />
        <Text style={[styles.directionText, { color: '#0284C7' }]}>Outgoing</Text>
      </View>
    );
  };

  const renderCallCard = ({ item }: { item: CallLogItem }) => {
    const isMissed = item.type === 'missed';

    return (
      <View
        style={[
          styles.callCard,
          isDark && { backgroundColor: '#000000', borderColor: 'rgba(255, 255, 255, 0.08)' },
        ]}
      >
        {/* Squircle Avatar with Presence Indicator */}
        <View style={styles.avatarWrapper}>
          {item.avatarUri ? (
            <Image source={{ uri: item.avatarUri }} style={styles.avatarImg} />
          ) : (
            <View
              style={[
                styles.avatarFallback,
                isDark && { backgroundColor: '#0A0D12' },
              ]}
            >
              <Ionicons name="person" size={24} color={isDark ? '#94A3B8' : '#64748B'} />
            </View>
          )}
          <View
            style={[
              styles.presenceDot,
              isMissed ? styles.dotMissed : styles.dotActive,
              isDark && { borderColor: '#000000' },
            ]}
          />
        </View>

        {/* Contact Info & Meta */}
        <View style={styles.cardCenter}>
          <View style={styles.nameRow}>
            <Text
              style={[
                styles.contactName,
                isDark && { color: '#FFFFFF' },
              ]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            {item.count && item.count > 1 ? (
              <View
                style={[
                  styles.countPill,
                  isDark && { backgroundColor: '#0A0D12' },
                ]}
              >
                <Text
                  style={[
                    styles.countPillText,
                    isDark && { color: '#94A3B8' },
                  ]}
                >
                  {item.count}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.metaRow}>
            {renderDirectionBadge(item.type)}
            <Text
              style={[
                styles.callTime,
                isDark && { color: '#94A3B8' },
              ]}
            >
              {item.time}
            </Text>
            {item.isVideo && (
              <View
                style={[
                  styles.videoBadge,
                  isDark && { backgroundColor: 'rgba(2, 132, 199, 0.15)' },
                ]}
              >
                <Ionicons name="videocam" size={12} color={isDark ? '#38BDF8' : '#0284C7'} />
                <Text
                  style={[
                    styles.videoBadgeText,
                    isDark && { color: '#38BDF8' },
                  ]}
                >
                  Video
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons: 1-Tap Voice or Video Call */}
        <View style={styles.actionsRight}>
          <TouchableOpacity
            style={[
              styles.circleActionBtn,
              isDark && {
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                borderColor: 'rgba(16, 185, 129, 0.3)',
              },
            ]}
            onPress={() => onStartCall(item.phone, item.name, false)}
            activeOpacity={0.7}
          >
            <Ionicons name="call" size={16} color={isDark ? '#10B981' : '#059669'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.circleActionBtn,
              styles.videoCircleBtn,
              isDark && {
                backgroundColor: 'rgba(2, 132, 199, 0.12)',
                borderColor: 'rgba(2, 132, 199, 0.3)',
              },
            ]}
            onPress={() => onStartCall(item.phone, item.name, true)}
            activeOpacity={0.7}
          >
            <Ionicons name="videocam" size={17} color={isDark ? '#38BDF8' : '#0284C7'} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, isDark && { backgroundColor: '#000000' }]}>
      <FlatList
        data={filteredCalls}
        keyExtractor={(item) => item.id}
        renderItem={renderCallCard}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerHub}>
            {/* Quick Action Tiles */}
            <View style={styles.quickTilesRow}>
              {/* Tile 1: Create Shareable Call Link */}
              <TouchableOpacity
                style={[
                  styles.quickTile,
                  isDark && {
                    backgroundColor: '#000000',
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                  },
                ]}
                onPress={handleCopyCallLink}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.tileIconBg,
                    {
                      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
                    },
                  ]}
                >
                  <Ionicons
                    name={copiedLink ? 'checkmark' : 'link'}
                    size={20}
                    color={isDark ? '#10B981' : '#059669'}
                  />
                </View>
                <View style={styles.tileTextCol}>
                  <Text
                    style={[
                      styles.tileTitle,
                      isDark && { color: '#FFFFFF' },
                    ]}
                  >
                    {copiedLink ? 'Link Copied!' : 'New Call Link'}
                  </Text>
                  <Text
                    style={[
                      styles.tileSub,
                      isDark && { color: '#94A3B8' },
                    ]}
                  >
                    Share link to invite
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Tile 2: Open Keypad / Direct Dial */}
              <TouchableOpacity
                style={[
                  styles.quickTile,
                  isDark && {
                    backgroundColor: '#000000',
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                  },
                ]}
                onPress={() => setShowDialer(true)}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.tileIconBg,
                    {
                      backgroundColor: isDark ? 'rgba(2, 132, 199, 0.15)' : '#EFF6FF',
                    },
                  ]}
                >
                  <Ionicons
                    name="keypad"
                    size={20}
                    color={isDark ? '#38BDF8' : '#0284C7'}
                  />
                </View>
                <View style={styles.tileTextCol}>
                  <Text
                    style={[
                      styles.tileTitle,
                      isDark && { color: '#FFFFFF' },
                    ]}
                  >
                    Keypad
                  </Text>
                  <Text
                    style={[
                      styles.tileSub,
                      isDark && { color: '#94A3B8' },
                    ]}
                  >
                    Dial any number
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Segmented Filter Pills */}
            <View style={styles.filterRow}>
              <Text
                style={[
                  styles.sectionHeading,
                  isDark && { color: '#FFFFFF' },
                ]}
              >
                Call History
              </Text>
              <View style={styles.filterPills}>
                <TouchableOpacity
                  style={[
                    styles.pillBtn,
                    isDark && {
                      backgroundColor: '#0A0D12',
                      borderColor: 'rgba(255, 255, 255, 0.08)',
                    },
                    filter === 'all' && [
                      styles.pillActive,
                      isDark && {
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        borderColor: '#10B981',
                      },
                    ],
                  ]}
                  onPress={() => setFilter('all')}
                >
                  <Text
                    style={[
                      styles.pillText,
                      isDark && { color: '#94A3B8' },
                      filter === 'all' && [
                        styles.pillTextActive,
                        isDark && { color: '#10B981' },
                      ],
                    ]}
                  >
                    All ({calls.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.pillBtn,
                    isDark && {
                      backgroundColor: '#0A0D12',
                      borderColor: 'rgba(255, 255, 255, 0.08)',
                    },
                    filter === 'missed' && [
                      styles.pillActive,
                      isDark && {
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        borderColor: '#10B981',
                      },
                    ],
                  ]}
                  onPress={() => setFilter('missed')}
                >
                  <Text
                    style={[
                      styles.pillText,
                      isDark && { color: '#94A3B8' },
                      filter === 'missed' && [
                        styles.pillTextActive,
                        isDark && { color: '#10B981' },
                      ],
                    ]}
                  >
                    Missed
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.pillBtn,
                    isDark && {
                      backgroundColor: '#0A0D12',
                      borderColor: 'rgba(255, 255, 255, 0.08)',
                    },
                    filter === 'video' && [
                      styles.pillActive,
                      isDark && {
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        borderColor: '#10B981',
                      },
                    ],
                  ]}
                  onPress={() => setFilter('video')}
                >
                  <Text
                    style={[
                      styles.pillText,
                      isDark && { color: '#94A3B8' },
                      filter === 'video' && [
                        styles.pillTextActive,
                        isDark && { color: '#10B981' },
                      ],
                    ]}
                  >
                    Video
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View
            style={[
              styles.emptyCard,
              isDark && {
                backgroundColor: '#000000',
                borderColor: 'rgba(255, 255, 255, 0.08)',
              },
            ]}
          >
            <View
              style={[
                styles.emptyIconBg,
                isDark && { backgroundColor: '#0A0D12' },
              ]}
            >
              <Ionicons name="call-outline" size={40} color={isDark ? '#64748B' : '#94A3B8'} />
            </View>
            <Text
              style={[
                styles.emptyTitle,
                isDark && { color: '#FFFFFF' },
              ]}
            >
              No call records
            </Text>
            <Text
              style={[
                styles.emptySubtitle,
                isDark && { color: '#94A3B8' },
              ]}
            >
              Make free voice and video calls with your friends and family.
            </Text>
            <TouchableOpacity
              style={[
                styles.emptyDialBtn,
                isDark && { backgroundColor: '#10B981' },
              ]}
              onPress={() => setShowDialer(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="keypad" size={18} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.emptyDialText}>Open Keypad</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Floating Modern Dial Action Button */}
      <TouchableOpacity
        style={styles.floatingDialBtn}
        onPress={() => setShowDialer(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="call" size={24} color="#FFF" />
      </TouchableOpacity>

      {/* Interactive Dialpad Modal */}
      <Modal visible={showDialer} animationType="slide" transparent>
        <View style={[styles.dialerModalBackdrop, isDark && { backgroundColor: 'rgba(0, 0, 0, 0.85)' }]}>
          <View style={[styles.dialerCard, isDark && { backgroundColor: '#000000', borderColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1 }]}>
            {/* Header */}
            <View style={styles.dialerHeader}>
              <Text style={[styles.dialerTitle, isDark && { color: '#FFFFFF' }]}>Keypad</Text>
              <TouchableOpacity
                onPress={() => setShowDialer(false)}
                style={styles.closeDialerBtn}
              >
                <Ionicons name="close" size={22} color={isDark ? '#94A3B8' : '#64748B'} />
              </TouchableOpacity>
            </View>

            {/* Number Display */}
            <View
              style={[
                styles.displayContainer,
                isDark && {
                  backgroundColor: '#0A0D12',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                },
                Boolean(dialError) && styles.displayContainerError,
              ]}
            >
              <TextInput
                style={[
                  styles.numberInput,
                  isDark && { color: '#FFFFFF' },
                ]}
                value={dialNumber}
                onChangeText={(val) => {
                  setDialError('');
                  setDialNumber(val.replace(/[^0-9*#+]/g, ''));
                }}
                placeholder="Enter phone number..."
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                keyboardType="phone-pad"
                autoFocus
              />
              {dialNumber.length > 0 && (
                <TouchableOpacity onPress={handleBackspace} style={styles.backspaceBtn}>
                  <Ionicons name="backspace-outline" size={24} color={isDark ? '#94A3B8' : '#64748B'} />
                </TouchableOpacity>
              )}
            </View>

            {Boolean(dialError) && (
              <Text style={styles.dialErrorText}>{dialError}</Text>
            )}

            {/* Keypad Grid */}
            <View style={styles.keypadGrid}>
              {[
                ['1', '2', '3'],
                ['4', '5', '6'],
                ['7', '8', '9'],
                ['*', '0', '#'],
              ].map((row, rIdx) => (
                <View key={rIdx} style={styles.keypadRow}>
                  {row.map((digit) => (
                    <TouchableOpacity
                      key={digit}
                      style={[
                        styles.keyBtn,
                        isDark && { backgroundColor: '#0A0D12' },
                      ]}
                      onPress={() => handleDialPress(digit)}
                      activeOpacity={0.6}
                    >
                      <Text style={[styles.keyDigit, isDark && { color: '#FFFFFF' }]}>{digit}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>

            {/* Call Action Triggers (Voice Call & Video Call) */}
            <View style={styles.dialerActionRow}>
              <TouchableOpacity
                style={[styles.callTriggerBtn, { backgroundColor: '#059669' }]}
                onPress={() => startDialCall(false)}
                activeOpacity={0.8}
              >
                <Ionicons name="call" size={22} color="#FFF" />
                <Text style={styles.callTriggerText}>Audio Call</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.callTriggerBtn, { backgroundColor: '#0284C7' }]}
                onPress={() => startDialCall(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="videocam" size={22} color="#FFF" />
                <Text style={styles.callTriggerText}>Video Call</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  listContent: {
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  headerHub: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  quickTilesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  quickTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tileIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  tileTextCol: {
    flex: 1,
  },
  tileTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  tileSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  filterPills: {
    flexDirection: 'row',
    gap: 6,
  },
  pillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  pillTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  callCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  avatarImg: {
    width: 48,
    height: 48,
    borderRadius: 16,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  presenceDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  dotActive: {
    backgroundColor: '#059669',
  },
  dotMissed: {
    backgroundColor: '#EF4444',
  },
  cardCenter: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  countPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  countPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  directionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  badgeMissed: {
    backgroundColor: '#FEF2F2',
  },
  badgeIncoming: {
    backgroundColor: '#ECFDF5',
  },
  badgeOutgoing: {
    backgroundColor: '#EFF6FF',
  },
  directionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  callTime: {
    fontSize: 12,
    color: '#64748B',
  },
  videoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  videoBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  actionsRight: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  circleActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoCircleBtn: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  emptyDialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyDialText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  floatingDialBtn: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#059669',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 99,
  },
  dialerModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
  },
  dialerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'web' ? 24 : 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    width: Platform.OS === 'web' ? 380 : '100%',
    maxWidth: '92%',
    shadowColor: '#0F172A',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  dialerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dialerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeDialerBtn: {
    padding: 6,
  },
  displayContainerError: {
    borderColor: '#EF4444',
  },
  dialErrorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    marginTop: -14,
    marginBottom: 12,
    textAlign: 'center',
  },
  displayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  numberInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 1,
  },
  backspaceBtn: {
    padding: 6,
  },
  keypadGrid: {
    gap: 10,
    marginBottom: 20,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  keyBtn: {
    width: 72,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyDigit: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  dialerActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  callTriggerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    gap: 8,
  },
  callTriggerText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
