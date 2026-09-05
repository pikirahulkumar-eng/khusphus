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
  const [filter, setFilter] = useState<'all' | 'missed' | 'video'>('all');
  const [showDialer, setShowDialer] = useState(false);
  const [dialNumber, setDialNumber] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Filtered calls
  const filteredCalls = calls.filter((c) => {
    if (filter === 'missed') return c.type === 'missed';
    if (filter === 'video') return c.isVideo;
    return true;
  });

  const handleCopyCallLink = () => {
    setCopiedLink(true);
    if (onCreateCallLink) {
      onCreateCallLink();
    } else {
      Alert.alert('Call Link', 'https://sunao.chat/call/room_' + Math.random().toString(36).substring(7));
    }
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDialPress = (char: string) => {
    if (dialNumber.length < 15) {
      setDialNumber((prev) => prev + char);
    }
  };

  const handleBackspace = () => {
    setDialNumber((prev) => prev.slice(0, -1));
  };

  const startDialCall = (isVideo: boolean) => {
    if (!dialNumber || dialNumber.length < 3) {
      Alert.alert('Invalid Number', 'Please enter a valid phone number to dial.');
      return;
    }
    setShowDialer(false);
    onStartCall(dialNumber, dialNumber, isVideo);
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
      <View style={styles.callCard}>
        {/* Squircle Avatar with Presence Indicator */}
        <View style={styles.avatarWrapper}>
          {item.avatarUri ? (
            <Image source={{ uri: item.avatarUri }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="person" size={24} color="#64748B" />
            </View>
          )}
          <View style={[styles.presenceDot, isMissed ? styles.dotMissed : styles.dotActive]} />
        </View>

        {/* Contact Info & Meta */}
        <View style={styles.cardCenter}>
          <View style={styles.nameRow}>
            <Text style={styles.contactName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.count && item.count > 1 ? (
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>{item.count}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.metaRow}>
            {renderDirectionBadge(item.type)}
            <Text style={styles.callTime}>{item.time}</Text>
            {item.isVideo && (
              <View style={styles.videoBadge}>
                <Ionicons name="videocam" size={12} color="#0284C7" />
                <Text style={styles.videoBadgeText}>Video</Text>
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons: 1-Tap Voice or Video Call */}
        <View style={styles.actionsRight}>
          <TouchableOpacity
            style={styles.circleActionBtn}
            onPress={() => onStartCall(item.phone, item.name, false)}
            activeOpacity={0.7}
          >
            <Ionicons name="call" size={16} color="#059669" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.circleActionBtn, styles.videoCircleBtn]}
            onPress={() => onStartCall(item.phone, item.name, true)}
            activeOpacity={0.7}
          >
            <Ionicons name="videocam" size={17} color="#0284C7" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
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
                style={styles.quickTile}
                onPress={handleCopyCallLink}
                activeOpacity={0.75}
              >
                <View style={[styles.tileIconBg, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name={copiedLink ? 'checkmark' : 'link'} size={20} color="#059669" />
                </View>
                <View style={styles.tileTextCol}>
                  <Text style={styles.tileTitle}>
                    {copiedLink ? 'Link Copied!' : 'New Call Link'}
                  </Text>
                  <Text style={styles.tileSub}>Share link to invite</Text>
                </View>
              </TouchableOpacity>

              {/* Tile 2: Open Keypad / Direct Dial */}
              <TouchableOpacity
                style={styles.quickTile}
                onPress={() => setShowDialer(true)}
                activeOpacity={0.75}
              >
                <View style={[styles.tileIconBg, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="keypad" size={20} color="#0284C7" />
                </View>
                <View style={styles.tileTextCol}>
                  <Text style={styles.tileTitle}>Keypad</Text>
                  <Text style={styles.tileSub}>Dial any number</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Segmented Filter Pills */}
            <View style={styles.filterRow}>
              <Text style={styles.sectionHeading}>Call History</Text>
              <View style={styles.filterPills}>
                <TouchableOpacity
                  style={[styles.pillBtn, filter === 'all' && styles.pillActive]}
                  onPress={() => setFilter('all')}
                >
                  <Text style={[styles.pillText, filter === 'all' && styles.pillTextActive]}>
                    All ({calls.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.pillBtn, filter === 'missed' && styles.pillActive]}
                  onPress={() => setFilter('missed')}
                >
                  <Text style={[styles.pillText, filter === 'missed' && styles.pillTextActive]}>
                    Missed
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.pillBtn, filter === 'video' && styles.pillActive]}
                  onPress={() => setFilter('video')}
                >
                  <Text style={[styles.pillText, filter === 'video' && styles.pillTextActive]}>
                    Video
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="call-outline" size={40} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No call records</Text>
            <Text style={styles.emptySubtitle}>
              Make free voice and video calls with your friends and family.
            </Text>
            <TouchableOpacity
              style={styles.emptyDialBtn}
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
        <View style={styles.dialerModalBackdrop}>
          <View style={styles.dialerCard}>
            {/* Header */}
            <View style={styles.dialerHeader}>
              <Text style={styles.dialerTitle}>Keypad</Text>
              <TouchableOpacity
                onPress={() => setShowDialer(false)}
                style={styles.closeDialerBtn}
              >
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Number Display */}
            <View style={styles.displayContainer}>
              <TextInput
                style={styles.numberInput}
                value={dialNumber}
                placeholder="Enter 10-digit number"
                placeholderTextColor="#94A3B8"
                editable={false}
              />
              {dialNumber.length > 0 && (
                <TouchableOpacity onPress={handleBackspace} style={styles.backspaceBtn}>
                  <Ionicons name="backspace-outline" size={24} color="#64748B" />
                </TouchableOpacity>
              )}
            </View>

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
                      style={styles.keyBtn}
                      onPress={() => handleDialPress(digit)}
                      activeOpacity={0.6}
                    >
                      <Text style={styles.keyDigit}>{digit}</Text>
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
    justifyContent: 'flex-end',
  },
  dialerCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
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
