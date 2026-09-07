import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';

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
}

interface ChatsTabProps {
  chats: ChatItemData[];
  onSelectChat: (chat: ChatItemData) => void;
  onOpenNewChat: () => void;
  onStartCall?: (phone: string, name: string, isVideo: boolean) => void;
  onArchivedPress?: () => void;
  archivedCount?: number;
  activeChatPhone?: string;
}

export default function ChatsTab({
  chats,
  onSelectChat,
  onOpenNewChat,
  onStartCall,
  activeChatPhone,
}: ChatsTabProps) {
  // Sunao Live Presence & Audio Spaces Rail
  const renderActivePresenceHeader = () => {
    const activeContacts = chats.slice(0, 8);

    return (
      <View style={styles.presenceSection}>
        <View style={styles.presenceHeaderRow}>
          <View style={styles.presenceTitleGroup}>
            <View style={styles.activeDot} />
            <Text style={styles.presenceTitle}>SUNAO LIVE</Text>
          </View>
          <Text style={styles.presenceCount}>{chats.length} Online</Text>
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
            <View style={styles.newChatPresenceWrapper}>
              <Ionicons name="add" size={24} color="#047857" />
            </View>
            <Text style={styles.presenceName} numberOfLines={1}>
              New Chat
            </Text>
          </TouchableOpacity>

          {/* Sunao Audio Lounge Tile */}
          <TouchableOpacity
            style={styles.presenceCard}
            onPress={() => onSelectChat({ phone: 'space_live_room', name: 'Open Audio Lounge 🎙️', lastMessage: 'Live Voice Space', timestamp: 'Live' })}
            activeOpacity={0.75}
          >
            <View style={styles.audioLoungeWrapper}>
              <Ionicons name="radio" size={20} color="#6366F1" />
            </View>
            <Text style={[styles.presenceName, { color: '#6366F1' }]} numberOfLines={1}>
              Lounge 🎙️
            </Text>
          </TouchableOpacity>

          {activeContacts.map((c) => (
            <TouchableOpacity
              key={c.phone}
              style={styles.presenceCard}
              onPress={() => onSelectChat(c)}
              activeOpacity={0.75}
            >
              <View style={styles.presenceAvatarWrapper}>
                {c.avatarUri ? (
                  <Image source={{ uri: c.avatarUri }} style={styles.presenceAvatar} />
                ) : (
                  <View style={[styles.presenceAvatar, styles.presenceFallback]}>
                    <Text style={styles.avatarInitial}>{c.name.charAt(0)}</Text>
                  </View>
                )}
                <View style={styles.activePulseRing} />
              </View>
              <Text style={styles.presenceName} numberOfLines={1}>
                {c.name.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderChatItem = ({ item }: { item: ChatItemData }) => {
    const isUnread = (item.unreadCount ?? 0) > 0;
    const isSelected = item.phone === activeChatPhone;

    return (
      <TouchableOpacity
        style={[
          styles.chatCard,
          isUnread && styles.chatCardUnread,
          isSelected && styles.chatCardSelected,
        ]}
        onPress={() => onSelectChat(item)}
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
          <View style={styles.onlineDot} />
        </View>

        {/* Center Details: Name + Status + Message Preview */}
        <View style={styles.chatCenter}>
          <View style={styles.topRow}>
            <View style={styles.nameGroup}>
              <Text style={[styles.contactName, isUnread && styles.nameUnread]} numberOfLines={1}>
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
              <Text style={[styles.timestamp, isUnread && styles.timestampUnread]}>
                {item.timestamp}
              </Text>
            </View>
          </View>

          <View style={styles.bottomRow}>
            <View style={styles.previewContainer}>
              {item.sentByMe && (
                <View style={styles.tickBox}>
                  {item.messageStatus === 'read' ? (
                    <Ionicons name="checkmark-done" size={15} color="#0284C7" />
                  ) : item.messageStatus === 'delivered' ? (
                    <Ionicons name="checkmark-done" size={15} color="#94A3B8" />
                  ) : (
                    <Ionicons name="checkmark" size={15} color="#94A3B8" />
                  )}
                </View>
              )}
              <Text
                style={[styles.messagePreview, isUnread && styles.previewUnread]}
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
            style={styles.quickCallBtn}
            onPress={(e) => {
              e.stopPropagation();
              onStartCall?.(item.phone, item.name, false);
            }}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="call" size={15} color="#047857" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.phone}
        renderItem={renderChatItem}
        ListHeaderComponent={renderActivePresenceHeader}
        contentContainerStyle={styles.listContent}
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
    color: '#0F172A',
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
    color: '#0F172A',
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
  audioLoungeWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    borderWidth: 1.5,
    borderColor: '#818CF8',
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
});
