import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

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
  onArchivedPress,
  archivedCount = 0,
  activeChatPhone,
}: ChatsTabProps) {
  const renderArchivedHeader = () => {
    return (
      <TouchableOpacity
        style={styles.archivedRow}
        onPress={onArchivedPress || onOpenNewChat}
        activeOpacity={0.7}
      >
        <View style={styles.archivedLeft}>
          <Ionicons name="archive-outline" size={20} color="#54656F" style={styles.archivedIcon} />
          <Text style={styles.archivedText}>Archived</Text>
        </View>
        {archivedCount > 0 && (
          <Text style={styles.archivedCount}>{archivedCount}</Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderChatItem = ({ item }: { item: ChatItemData }) => {
    const isUnread = (item.unreadCount ?? 0) > 0;
    const isSelected = item.phone === activeChatPhone;

    return (
      <TouchableOpacity
        style={[
          styles.chatRow,
          isSelected && styles.chatRowSelected,
        ]}
        onPress={() => onSelectChat(item)}
        activeOpacity={0.7}
      >
        {/* Avatar with optional Status Story Ring */}
        <View style={[styles.avatarWrapper, item.hasStatusStory && styles.statusRing]}>
          {item.avatarUri ? (
            <Image source={{ uri: item.avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              {item.isGroup ? (
                <Ionicons name="people" size={24} color="#667781" />
              ) : (
                <Text style={styles.avatarInitial}>{item.name.charAt(0).toUpperCase()}</Text>
              )}
            </View>
          )}
        </View>

        {/* Chat Details Area with Hairline Divider */}
        <View style={styles.chatDetails}>
          {/* Top Line: Contact Name & Timestamp */}
          <View style={styles.topLine}>
            <View style={styles.nameContainer}>
              <Text
                style={[styles.nameText, isUnread && styles.nameUnread]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
            </View>
            <Text
              style={[
                styles.timeText,
                isUnread && styles.timeUnread,
              ]}
            >
              {item.timestamp}
            </Text>
          </View>

          {/* Bottom Line: Read Receipt + Message Snippet + Unread/Pinned Badges */}
          <View style={styles.bottomLine}>
            <View style={styles.previewContainer}>
              {item.sentByMe && (
                <View style={styles.tickContainer}>
                  {item.messageStatus === 'read' ? (
                    <Ionicons name="checkmark-done" size={16} color="#53BDEB" />
                  ) : item.messageStatus === 'delivered' ? (
                    <Ionicons name="checkmark-done" size={16} color="#8696A0" />
                  ) : (
                    <Ionicons name="checkmark" size={16} color="#8696A0" />
                  )}
                </View>
              )}
              <Text
                style={[
                  styles.previewText,
                  isUnread && styles.previewUnread,
                ]}
                numberOfLines={1}
              >
                {item.lastMessage}
              </Text>
            </View>

            {/* Right Indicators (Pin, Mute, Unread Pill) */}
            <View style={styles.badgeContainer}>
              {item.isMuted && (
                <Ionicons
                  name="volume-mute"
                  size={15}
                  color="#8696A0"
                  style={{ marginRight: 4 }}
                />
              )}
              {item.isPinned && (
                <Ionicons
                  name="pin"
                  size={14}
                  color="#8696A0"
                  style={{ marginRight: 4 }}
                />
              )}
              {isUnread && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {item.unreadCount! > 99 ? '99+' : item.unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </View>
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
        ListHeaderComponent={renderArchivedHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* WhatsApp Floating Action Button (New Chat) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={onOpenNewChat}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="message-text" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  listContent: {
    paddingBottom: 90,
  },
  // Archived Row (WhatsApp Standard)
  archivedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F2F5',
  },
  archivedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  archivedIcon: {
    marginRight: 24,
    marginLeft: 4,
  },
  archivedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111B21',
  },
  archivedCount: {
    fontSize: 13,
    color: '#008069',
    fontWeight: '600',
  },
  // Chat Row (WhatsApp Standard)
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  chatRowSelected: {
    backgroundColor: '#F0F2F5',
  },
  avatarWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  statusRing: {
    borderWidth: 2,
    borderColor: '#25D366',
    padding: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    backgroundColor: '#E9EDEF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 19,
    fontWeight: '600',
    color: '#54656F',
  },
  chatDetails: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F2F5',
  },
  topLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameContainer: {
    flex: 1,
    marginRight: 8,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111B21',
  },
  nameUnread: {
    fontWeight: '700',
    color: '#111B21',
  },
  timeText: {
    fontSize: 12,
    color: '#667781',
  },
  timeUnread: {
    color: '#25D366',
    fontWeight: '600',
  },
  bottomLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  tickContainer: {
    marginRight: 3,
  },
  previewText: {
    fontSize: 14,
    color: '#667781',
    flex: 1,
  },
  previewUnread: {
    color: '#111B21',
    fontWeight: '500',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadBadge: {
    backgroundColor: '#25D366',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    marginLeft: 4,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  // WhatsApp Floating Action Button (FAB)
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#00A884',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },
});
