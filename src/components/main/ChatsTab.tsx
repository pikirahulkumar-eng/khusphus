import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { getBackendUrl } from '../../services/firebase';

export interface ChatItemData {
  phone: string;
  name: string;
  avatarUri?: string;
  lastMessage: string;
  timestamp: string;
  unreadCount?: number;
  isPinned?: boolean;
  isMuted?: boolean;
  isGroup?: boolean;
  hasStatusStory?: boolean;
  sentByMe?: boolean;
  messageStatus?: 'sent' | 'delivered' | 'read';
  isOnline?: boolean;
}

interface ChatsTabProps {
  chats: ChatItemData[];
  onSelectChat: (chat: ChatItemData) => void;
  onOpenNewChat: () => void;
  onStartCall?: (phone: string, name: string, isVideo: boolean) => void;
  onArchivedPress?: () => void;
  archivedCount?: number;
  activeChatPhone?: string;
  searchQuery?: string;
  onTogglePin?: (phone: string) => void;
}

export default function ChatsTab({
  chats,
  onSelectChat,
  onOpenNewChat,
  onStartCall,
  activeChatPhone,
  searchQuery,
  onTogglePin,
}: ChatsTabProps) {
  const { isDark } = useTheme();

  const [readReceipts, setReadReceipts] = useState<boolean>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem('@sunao_read_receipts');
      if (stored !== null) return stored === 'true';
    }
    return true;
  });

  useEffect(() => {
    AsyncStorage.getItem('@sunao_read_receipts').then((val) => {
      if (val !== null) {
        setReadReceipts(val === 'true');
      }
    });
  }, []);

  // Live Database Search for Contacts & Phone Numbers
  const [dbResults, setDbResults] = useState<Array<{ phone: string; name: string }>>([]);
  const [isSearchingDb, setIsSearchingDb] = useState<boolean>(false);

  const cleanQueryDigits = (searchQuery || '').replace(/\D/g, '');

  useEffect(() => {
    if (!searchQuery || cleanQueryDigits.length < 4) {
      setDbResults([]);
      setIsSearchingDb(false);
      return;
    }

    let isMounted = true;
    setIsSearchingDb(true);
    const timer = setTimeout(async () => {
      try {
        const baseUrl = getBackendUrl();
        const res = await fetch(`${baseUrl}/api/search?query=${cleanQueryDigits}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data)) {
            const fresh = data.filter((u) => !chats.some((c) => c.phone === u.phone));
            setDbResults(fresh);
          }
        }
      } catch (_) {
      } finally {
        if (isMounted) setIsSearchingDb(false);
      }
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery, cleanQueryDigits, chats]);

  // Sunao Live Presence & Audio Spaces Rail
  const renderActivePresenceHeader = () => {
    const activeContacts = chats.slice(0, 8);

    return (
      <View style={[styles.presenceSection, isDark && { backgroundColor: '#000000', borderBottomColor: 'rgba(255, 255, 255, 0.08)' }]}>
        <View style={styles.presenceHeaderRow}>
          <View style={styles.presenceTitleGroup}>
            <View style={styles.activeDot} />
            <Text style={[styles.presenceTitle, isDark && { color: '#94A3B8' }]}>SUNAO LIVE</Text>
          </View>
          <Text style={[styles.presenceCount, isDark && { color: '#64748B' }]}>
            {chats.filter((c) => c.isOnline).length} Online
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presenceScroll}
        >
          {/* Quick New Conversation action tile */}
          <TouchableOpacity
            style={styles.presenceCard}
            onPress={onOpenNewChat}
            activeOpacity={0.75}
          >
            <View style={[styles.newChatPresenceWrapper, isDark && { backgroundColor: '#000000', borderColor: 'rgba(255, 255, 255, 0.08)' }]}>
              <Ionicons name="add" size={24} color={isDark ? '#10B981' : '#047857'} />
            </View>
            <Text style={[styles.presenceName, isDark && { color: '#FFFFFF' }]} numberOfLines={1}>
              New Chat
            </Text>
          </TouchableOpacity>
          {/* Real Contacts Horizontal Stories / Presence Avatars */}
          {activeContacts.map((contact) => (
            <TouchableOpacity
              key={contact.phone}
              style={styles.presenceCard}
              onPress={() => onSelectChat(contact)}
              activeOpacity={0.75}
            >
              <View style={styles.presenceAvatarWrapper}>
                {contact.avatarUri ? (
                  <Image source={{ uri: contact.avatarUri }} style={styles.presenceAvatar} />
                ) : (
                  <View style={[styles.presenceAvatar, styles.avatarFallback]}>
                    <Text style={styles.avatarInitial}>{contact.name.charAt(0)}</Text>
                  </View>
                )}
                {contact.isOnline && (
                  <View style={[styles.activePulseRing, isDark && { borderColor: '#000000' }]} />
                )}
              </View>
              <Text style={[styles.presenceName, isDark && { color: '#FFFFFF' }]} numberOfLines={1}>
                {contact.name.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderChatItem = ({ item }: { item: ChatItemData }) => {
    const isSelected = activeChatPhone === item.phone;
    const isUnread = (item.unreadCount || 0) > 0;

    return (
      <TouchableOpacity
        style={[
          styles.chatCard,
          isDark && { backgroundColor: '#000000', borderColor: 'rgba(255, 255, 255, 0.08)' },
          isSelected && styles.chatCardSelected,
          isSelected && isDark && { backgroundColor: '#000000', borderColor: '#10B981' },
        ]}
        onPress={() => onSelectChat(item)}
        onLongPress={() => onTogglePin?.(item.phone)}
        delayLongPress={320}
        activeOpacity={0.75}
      >
        {/* Squircle Avatar with Live Dot */}
        <View style={styles.avatarWrapper}>
          {item.avatarUri ? (
            <Image source={{ uri: item.avatarUri }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatarImage, styles.avatarFallback]}>
              {item.isGroup ? (
                <Ionicons name="people" size={22} color="#64748B" />
              ) : (
                <Text style={styles.avatarInitialLarge}>{item.name.charAt(0)}</Text>
              )}
            </View>
          )}
          {item.isOnline && <View style={styles.onlineDot} />}
        </View>

        {/* Center Details: Name + Status + Message Preview */}
        <View style={styles.chatCenter}>
          <View style={styles.topRow}>
            <View style={styles.nameGroup}>
              <Text
                style={[
                  styles.contactName,
                  isUnread && styles.nameUnread,
                  { color: isDark ? '#FFFFFF' : '#0F172A' },
                ]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              {item.isGroup && (
                <View style={styles.groupBadge}>
                  <Text style={styles.groupBadgeText}>Group</Text>
                </View>
              )}
            </View>

            <View style={styles.timeGroup}>
              {item.isPinned && (
                <Ionicons name="pin" size={12} color="#94A3B8" style={{ marginRight: 4 }} />
              )}
              <Text
                style={[
                  styles.timestamp,
                  isUnread && styles.timestampUnread,
                  isDark && { color: isUnread ? '#10B981' : '#64748B' },
                ]}
              >
                {item.timestamp}
              </Text>
            </View>
          </View>

          <View style={styles.bottomRow}>
            <View style={styles.previewContainer}>
              {item.sentByMe && (
                <View style={styles.tickBox}>
                  {item.messageStatus === 'read' ? (
                    <Ionicons
                      name="checkmark-done"
                      size={15}
                      color={readReceipts ? (isDark ? '#00F2FE' : '#0284C7') : '#94A3B8'}
                    />
                  ) : item.messageStatus === 'delivered' ? (
                    <Ionicons name="checkmark-done" size={15} color="#94A3B8" />
                  ) : (
                    <Ionicons name="checkmark" size={15} color="#94A3B8" />
                  )}
                </View>
              )}
              <Text
                style={[
                  styles.messagePreview,
                  isUnread && styles.previewUnread,
                  {
                    color: isDark
                      ? isUnread
                        ? '#F8FAFC'
                        : '#94A3B8'
                      : isUnread
                        ? '#0F172A'
                        : '#64748B',
                  },
                ]}
                numberOfLines={1}
              >
                {item.lastMessage}
              </Text>
            </View>

            {isUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {item.unreadCount! > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Streamlined Quick-Connect Call Action */}
        <View style={styles.actionsRight}>
          <TouchableOpacity
            style={[styles.quickCallBtn, isDark && { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}
            onPress={(e) => {
              e.stopPropagation();
              onStartCall?.(item.phone, item.name, false);
            }}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="call" size={15} color={isDark ? '#10B981' : '#047857'} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, isDark && { backgroundColor: '#000000' }]}>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.phone}
        renderItem={renderChatItem}
        ListHeaderComponent={searchQuery && searchQuery.trim().length > 0 ? null : renderActivePresenceHeader}
        ListFooterComponent={
          searchQuery && searchQuery.trim().length > 0 ? (
            <View style={{ paddingBottom: 24, paddingTop: 4 }}>
              {isSearchingDb && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
                  <ActivityIndicator size="small" color="#10B981" />
                  <Text style={{ marginLeft: 8, fontSize: 13, color: '#94A3B8' }}>Searching Sunao directory...</Text>
                </View>
              )}
              {dbResults.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B', letterSpacing: 0.5, marginHorizontal: 16, marginBottom: 8, textTransform: 'uppercase' }}>
                    Contacts on Sunao ({dbResults.length})
                  </Text>
                  {dbResults.map((u) => (
                    <TouchableOpacity
                      key={u.phone}
                      style={[
                        styles.chatCard,
                        { backgroundColor: isDark ? '#0F172A' : '#F0FDF4', marginHorizontal: 12, marginVertical: 4, borderRadius: 14, borderWidth: 1, borderColor: isDark ? '#1E293B' : '#BBF7D0' }
                      ]}
                      onPress={() => onSelectChat({
                        phone: u.phone,
                        name: u.name || u.phone,
                        lastMessage: 'Tap to start conversation',
                        timestamp: 'Sunao User',
                        unreadCount: 0,
                      })}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.avatarWrapper, { backgroundColor: '#10B981' }]}>
                        <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 18 }}>
                          {(u.name || u.phone).charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.chatCenter}>
                        <View style={styles.topRow}>
                          <Text style={[styles.contactName, isDark && { color: '#FFFFFF' }]} numberOfLines={1}>
                            {u.name || u.phone}
                          </Text>
                          <View style={{ backgroundColor: '#10B981', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                            <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>SUNAO USER</Text>
                          </View>
                        </View>
                        <View style={styles.bottomRow}>
                          <Text style={[styles.messagePreview, { color: isDark ? '#10B981' : '#047857' }]} numberOfLines={1}>
                            +91 {u.phone} • Tap to message
                          </Text>
                        </View>
                      </View>
                      <View style={styles.actionsRight}>
                        <TouchableOpacity
                          style={[styles.quickCallBtn, isDark && { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}
                          onPress={(e) => {
                            e.stopPropagation();
                            onStartCall?.(u.phone, u.name || u.phone, false);
                          }}
                          activeOpacity={0.75}
                        >
                          <Ionicons name="call" size={15} color={isDark ? '#10B981' : '#047857'} />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {cleanQueryDigits.length >= 10 && !dbResults.some(u => u.phone === cleanQueryDigits) && !chats.some(c => c.phone === cleanQueryDigits) && !isSearchingDb && (
                <TouchableOpacity
                  style={[
                    styles.chatCard,
                    { backgroundColor: isDark ? '#1E293B' : '#EFF6FF', marginHorizontal: 12, marginVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: '#3B82F6' }
                  ]}
                  onPress={() => onSelectChat({
                    phone: cleanQueryDigits,
                    name: `+91 ${cleanQueryDigits}`,
                    lastMessage: 'Tap to start conversation',
                    timestamp: '',
                    unreadCount: 0,
                  })}
                  activeOpacity={0.7}
                >
                  <View style={[styles.avatarWrapper, { backgroundColor: '#3B82F6' }]}>
                    <Ionicons name="chatbubble-ellipses" size={22} color="#FFF" />
                  </View>
                  <View style={styles.chatCenter}>
                    <Text style={[styles.contactName, isDark && { color: '#FFFFFF' }]}>Message +91 {cleanQueryDigits}</Text>
                    <Text style={[styles.messagePreview, { color: '#3B82F6' }]}>Tap to start direct conversation</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
        ListEmptyComponent={
          searchQuery && searchQuery.trim().length > 0 ? (
            dbResults.length > 0 ? null : isSearchingDb ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color="#10B981" style={{ marginBottom: 12 }} />
                <Text style={[styles.emptyTitle, isDark && { color: '#FFFFFF' }]}>Searching Sunao...</Text>
                <Text style={[styles.emptySub, isDark && { color: '#94A3B8' }]}>
                  Checking directory for "{searchQuery.trim()}"
                </Text>
              </View>
            ) : cleanQueryDigits.length >= 10 ? null : (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={48} color="#94A3B8" style={{ marginBottom: 12 }} />
                <Text style={[styles.emptyTitle, isDark && { color: '#FFFFFF' }]}>No chats found</Text>
                <Text style={[styles.emptySub, isDark && { color: '#94A3B8' }]}>
                  No conversation matches "{searchQuery.trim()}"
                </Text>
              </View>
            )
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color="#94A3B8" style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyTitle, isDark && { color: '#FFFFFF' }]}>No chats yet</Text>
              <Text style={[styles.emptySub, isDark && { color: '#94A3B8' }]}>
                Tap the message icon below to start a conversation with any contact
              </Text>
            </View>
          )
        }
        contentContainerStyle={[styles.listContent, chats.length === 0 && { flexGrow: 1, justifyContent: 'center' }]}
        showsVerticalScrollIndicator={false}
      />

      {/* Sunao Signature Quick-Compose FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={onOpenNewChat}
        activeOpacity={0.85}
      >
        <Ionicons name="chatbubble-ellipses" size={24} color="#FFFFFF" />
      </TouchableOpacity>
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
    paddingTop: 4,
  },
  // Active Presence Header
  presenceSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 8,
  },
  presenceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  presenceTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#059669',
  },
  presenceTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  presenceCount: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  presenceScroll: {
    paddingRight: 12,
    gap: 12,
  },
  presenceCard: {
    alignItems: 'center',
    width: 58,
  },
  presenceAvatarWrapper: {
    position: 'relative',
    marginBottom: 5,
  },
  presenceAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
  },
  presenceFallback: {
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  activePulseRing: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#059669',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  presenceName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  // Clean Light Chat Card
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chatCardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: '#059669',
  },
  chatCardSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#059669',
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 16,
  },
  avatarFallback: {
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitialLarge: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: '#059669',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  chatCenter: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    gap: 6,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  nameUnread: {
    fontWeight: '800',
  },
  groupBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  groupBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  timeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  timestampUnread: {
    color: '#059669',
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  messagePreview: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    flex: 1,
    marginRight: 6,
  },
  previewUnread: {
    fontWeight: '600',
  },
  youPrefix: {
    color: '#059669',
    fontWeight: '700',
  },
  unreadBadge: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 6,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  // Quick Action in Sunao Live
  newChatPresenceWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },

  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 6,
  },
  tickBox: {
    marginRight: 4,
  },
  actionsRight: {
    marginLeft: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickCallBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: '#047857',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#047857',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
});
