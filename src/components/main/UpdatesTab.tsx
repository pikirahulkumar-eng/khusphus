import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { SunaoTheme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

export interface StatusUpdateData {
  id: string;
  name: string;
  avatarUri?: string;
  time: string;
  isViewed?: boolean;
  type?: 'voice' | 'photo';
  previewText?: string;
}

export interface AudioSpaceData {
  id: string;
  title: string;
  hostName: string;
  hostAvatar: string;
  listenersCount: number;
  speakers: string[];
  isLive: boolean;
  topicTag: string;
}

export interface ChannelData {
  id: string;
  name: string;
  avatarUri: string;
  followers: string;
  description: string;
  isVerified?: boolean;
  isFollowing?: boolean;
}

interface UpdatesTabProps {
  onAddStatus?: () => void;
  onViewStatus?: (status: StatusUpdateData) => void;
}

export default function UpdatesTab({ onAddStatus, onViewStatus }: UpdatesTabProps) {
  const { isDark } = useTheme();
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [selectedMoment, setSelectedMoment] = useState<StatusUpdateData | null>(null);
  const [showCreateMomentModal, setShowCreateMomentModal] = useState(false);
  const [showCreateSpaceModal, setShowCreateSpaceModal] = useState(false);
  const [newSpaceTitle, setNewSpaceTitle] = useState('');
  const [newMomentText, setNewMomentText] = useState('');

  const moments: StatusUpdateData[] = [
    {
      id: '1',
      name: 'Rahul Bhai',
      avatarUri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      time: '18m ago',
      isViewed: false,
      type: 'voice',
      previewText: '🎤 "Voice update!"',
    },
    {
      id: '2',
      name: 'Neha Sharma',
      avatarUri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      time: '45m ago',
      isViewed: false,
      type: 'photo',
      previewText: '📸 Weekend mood',
    },
    {
      id: '3',
      name: 'Amit Patel',
      avatarUri: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      time: '2h ago',
      isViewed: true,
      type: 'voice',
      previewText: '🎤 "New photo posted"',
    },
    {
      id: '4',
      name: 'Priya Verma',
      avatarUri: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
      time: '5h ago',
      isViewed: true,
      type: 'photo',
      previewText: '📸 At cafe',
    },
  ];

  const [momentsList, setMomentsList] = useState<StatusUpdateData[]>(moments);

  const [liveSpaces, setLiveSpaces] = useState<AudioSpaceData[]>([
    {
      id: 'sp_1',
      title: 'Tech Talk: Future Gadgets & AI Tools 💡',
      hostName: 'Rahul Bhai',
      hostAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      listenersCount: 54,
      speakers: ['Rahul Bhai', 'Neha', 'Amit'],
      isLive: true,
      topicTag: 'Tech & Ideas',
    },
    {
      id: 'sp_2',
      title: 'Late Night Chai & Chill Music Lounge ☕',
      hostName: 'Neha Sharma',
      hostAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      listenersCount: 128,
      speakers: ['Neha Sharma', 'Rohan'],
      isLive: true,
      topicTag: 'Casual Hangout',
    },
    {
      id: 'sp_3',
      title: 'Cricket India vs Australia Live Match Discussion 🏏',
      hostName: 'Vikram Rajput',
      hostAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      listenersCount: 312,
      speakers: ['Vikram', 'Pooja', 'Sunil'],
      isLive: true,
      topicTag: 'Sports',
    },
  ]);

  const [channels, setChannels] = useState<ChannelData[]>([
    {
      id: 'c1',
      name: 'Sunao Official',
      avatarUri: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
      followers: '2.4M followers',
      description: 'Official announcements, tips and release updates.',
      isVerified: true,
      isFollowing: true,
    },
    {
      id: 'c2',
      name: 'Tech & AI Insights',
      avatarUri: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=150',
      followers: '850K followers',
      description: 'Daily news, gadget reviews and tech stories.',
      isVerified: true,
      isFollowing: false,
    },
    {
      id: 'c3',
      name: 'Cricket Fever Live',
      avatarUri: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=150',
      followers: '1.2M followers',
      description: 'Ball-by-ball commentary and audio cricket chats.',
      isVerified: true,
      isFollowing: false,
    },
  ]);

  const toggleFollow = (id: string) => {
    setChannels((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isFollowing: !c.isFollowing } : c))
    );
  };

  const handleTuneIntoSpace = (space: AudioSpaceData) => {
    setActiveSpaceId((prev) => (prev === space.id ? null : space.id));
  };

  const handleCreateSpace = () => {
    if (!newSpaceTitle.trim()) return;
    const newSpace: AudioSpaceData = {
      id: `sp_${Date.now()}`,
      title: newSpaceTitle.trim(),
      hostName: 'You',
      hostAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      listenersCount: 1,
      speakers: ['You'],
      isLive: true,
      topicTag: 'General',
    };
    setLiveSpaces((prev) => [newSpace, ...prev]);
    setActiveSpaceId(newSpace.id);
    setNewSpaceTitle('');
    setShowCreateSpaceModal(false);
  };

  const handleCreateMoment = () => {
    if (!newMomentText.trim()) return;
    const newM: StatusUpdateData = {
      id: `m_${Date.now()}`,
      name: 'You',
      avatarUri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      time: 'Just now',
      isViewed: false,
      type: 'photo',
      previewText: newMomentText.trim(),
    };
    setMomentsList((prev) => [newM, ...prev]);
    setNewMomentText('');
    setShowCreateMomentModal(false);
  };

  return (
    <View style={[styles.container, isDark && { backgroundColor: '#000000' }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Section 1: Moments Horizontal Tray */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, isDark && { color: '#FFFFFF' }]}>Moments</Text>
            <View
              style={[
                styles.newPill,
                isDark && {
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  borderColor: 'rgba(16, 185, 129, 0.3)',
                },
              ]}
            >
              <Text style={[styles.newPillText, isDark && { color: '#10B981' }]}>24h Stories</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              style={[
                styles.textStatusPillBtn,
                isDark && {
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  borderColor: 'rgba(16, 185, 129, 0.3)',
                },
              ]}
              onPress={() => {
                if (onAddStatus) onAddStatus();
                setShowCreateMomentModal(true);
              }}
              activeOpacity={0.7}
            >
              <Feather name="edit-2" size={11} color={isDark ? '#10B981' : '#059669'} />
              <Text style={[styles.textStatusPillText, isDark && { color: '#10B981' }]}>
                Text Status
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (onAddStatus) onAddStatus();
                setShowCreateMomentModal(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.actionText, isDark && { color: '#10B981' }]}>+ Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.momentsRail}
        >
          {/* Add Moment Card */}
          <TouchableOpacity
            style={[
              styles.addMomentCard,
              isDark && {
                backgroundColor: '#0D1117',
                borderColor: 'rgba(255, 255, 255, 0.15)',
              },
            ]}
            onPress={() => {
              if (onAddStatus) onAddStatus();
              setShowCreateMomentModal(true);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.addMomentAvatarWrapper}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' }}
                style={styles.addMomentAvatar}
              />
              <View
                style={[
                  styles.addPlusBadge,
                  isDark && { borderColor: '#0D1117', backgroundColor: '#10B981' },
                ]}
              >
                <Ionicons name="add" size={14} color="#FFF" />
              </View>
            </View>
            <Text style={[styles.addMomentName, isDark && { color: '#FFFFFF' }]}>Your Moment</Text>
            <Text style={[styles.addMomentSub, isDark && { color: '#94A3B8' }]}>Voice or photo</Text>
          </TouchableOpacity>

          {/* Friends Moments Cards */}
          {momentsList.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.momentStoryCard,
                isDark && {
                  backgroundColor: '#0D1117',
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                },
              ]}
              onPress={() => {
                if (onViewStatus) onViewStatus(item);
                setSelectedMoment(item);
              }}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.momentRing,
                  item.isViewed ? styles.ringViewed : styles.ringUnread,
                  isDark &&
                    (item.isViewed
                      ? { borderColor: 'rgba(255, 255, 255, 0.15)' }
                      : { borderColor: '#10B981' }),
                ]}
              >
                <Image source={{ uri: item.avatarUri }} style={styles.momentAvatar} />
                {item.type === 'voice' && (
                  <View
                    style={[
                      styles.voiceStoryBadge,
                      isDark && { borderColor: '#0D1117' },
                    ]}
                  >
                    <Ionicons name="mic" size={10} color="#FFF" />
                  </View>
                )}
              </View>
              <Text
                style={[styles.momentName, isDark && { color: '#FFFFFF' }]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <Text style={[styles.momentTime, isDark && { color: '#94A3B8' }]}>{item.time}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Section 2: Live Audio Spaces */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.liveRedDot} />
            <Text style={[styles.sectionTitle, isDark && { color: '#FFFFFF' }]}>
              Live Audio Spaces
            </Text>
          </View>
          <TouchableOpacity onPress={() => setShowCreateSpaceModal(true)}>
            <Text style={[styles.actionText, isDark && { color: '#10B981' }]}>+ Start Space</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.spacesContainer}>
          {liveSpaces.map((space) => {
            const isTunedIn = activeSpaceId === space.id;
            return (
              <View
                key={space.id}
                style={[
                  styles.spaceCard,
                  isDark && {
                    backgroundColor: '#0D1117',
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                  },
                  isTunedIn && [
                    styles.spaceCardActive,
                    isDark && {
                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      borderColor: '#10B981',
                    },
                  ],
                ]}
              >
                <View style={styles.spaceTopRow}>
                  <View
                    style={[
                      styles.topicBadge,
                      isDark && { backgroundColor: '#161B22' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.topicText,
                        isDark && { color: '#94A3B8' },
                      ]}
                    >
                      {space.topicTag}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.listenerBadge,
                      isDark && {
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        borderColor: 'rgba(16, 185, 129, 0.3)',
                      },
                    ]}
                  >
                    <Ionicons name="people" size={13} color="#10B981" />
                    <Text style={styles.listenerText}>{space.listenersCount} listening</Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.spaceTitle,
                    isDark && { color: '#FFFFFF' },
                  ]}
                >
                  {space.title}
                </Text>

                <View style={styles.spaceBottomRow}>
                  <View style={styles.hostInfoRow}>
                    <Image source={{ uri: space.hostAvatar }} style={styles.hostAvatar} />
                    <View>
                      <Text
                        style={[
                          styles.hostName,
                          isDark && { color: '#FFFFFF' },
                        ]}
                      >
                        Hosted by {space.hostName}
                      </Text>
                      <Text
                        style={[
                          styles.speakersList,
                          isDark && { color: '#94A3B8' },
                        ]}
                      >
                        Speakers: {space.speakers.join(', ')}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.tuneInBtn,
                      isDark && {
                        backgroundColor: 'rgba(16, 185, 129, 0.12)',
                        borderColor: 'rgba(16, 185, 129, 0.3)',
                      },
                      isTunedIn && [
                        styles.tunedInBtnActive,
                        isDark && { backgroundColor: '#10B981', borderColor: '#059669' },
                      ],
                    ]}
                    onPress={() => handleTuneIntoSpace(space)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={isTunedIn ? 'radio' : 'volume-high'}
                      size={15}
                      color={isTunedIn ? '#FFF' : isDark ? '#10B981' : '#059669'}
                    />
                    <Text
                      style={[
                        styles.tuneInText,
                        isDark && { color: '#10B981' },
                        isTunedIn && [
                          styles.tunedInTextActive,
                          isDark && { color: '#FFFFFF' },
                        ],
                      ]}
                    >
                      {isTunedIn ? 'Listening' : 'Tune In'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* Section 3: Verified Channels */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, isDark && { color: '#FFFFFF' }]}>
              Broadcast Channels
            </Text>
          </View>
          <TouchableOpacity onPress={() => toggleFollow('c2')}>
            <Text style={[styles.actionText, isDark && { color: '#10B981' }]}>Channels</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.channelsContainer}>
          {channels.map((ch) => (
            <View
              key={ch.id}
              style={[
                styles.channelCard,
                isDark && {
                  backgroundColor: '#0D1117',
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                },
              ]}
            >
              <Image source={{ uri: ch.avatarUri }} style={styles.channelAvatar} />
              <View style={styles.channelCenter}>
                <View style={styles.channelTitleRow}>
                  <Text
                    style={[
                      styles.channelName,
                      isDark && { color: '#FFFFFF' },
                    ]}
                  >
                    {ch.name}
                  </Text>
                  {ch.isVerified && (
                    <MaterialIcons name="verified" size={15} color="#10B981" style={{ marginLeft: 4 }} />
                  )}
                </View>
                <Text
                  style={[
                    styles.channelDesc,
                    isDark && { color: '#94A3B8' },
                  ]}
                  numberOfLines={1}
                >
                  {ch.description}
                </Text>
                <Text
                  style={[
                    styles.channelFollowers,
                    isDark && { color: '#64748B' },
                  ]}
                >
                  {ch.followers}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.followBtn,
                  isDark && {
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    borderColor: 'rgba(16, 185, 129, 0.3)',
                  },
                  ch.isFollowing && [
                    styles.followingBtn,
                    isDark && {
                      backgroundColor: '#161B22',
                      borderColor: 'rgba(255, 255, 255, 0.08)',
                    },
                  ],
                ]}
                onPress={() => toggleFollow(ch.id)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.followText,
                    isDark && { color: '#10B981' },
                    ch.isFollowing && [
                      styles.followingText,
                      isDark && { color: '#94A3B8' },
                    ],
                  ]}
                >
                  {ch.isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* 1. Fullscreen Moment/Story Viewer Modal */}
      <Modal visible={Boolean(selectedMoment)} transparent animationType="fade" onRequestClose={() => setSelectedMoment(null)}>
        <View style={styles.storyBackdrop}>
          <View style={styles.storyCard}>
            <View style={styles.storyProgressBar}>
              <View style={styles.storyProgressFill} />
            </View>

            <View style={styles.storyHeader}>
              <Image source={{ uri: selectedMoment?.avatarUri }} style={styles.storyAvatar} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.storyAuthor}>{selectedMoment?.name}</Text>
                <Text style={styles.storyTime}>{selectedMoment?.time}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedMoment(null)} style={styles.closeStoryBtn}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.storyContent}>
              <View style={styles.storyPreviewBox}>
                <Ionicons
                  name={selectedMoment?.type === 'voice' ? 'mic' : 'image'}
                  size={48}
                  color="#059669"
                  style={{ marginBottom: 12 }}
                />
                <Text style={styles.storyText}>{selectedMoment?.previewText || 'Active 24h Moment'}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.storyReplyBtn} onPress={() => setSelectedMoment(null)}>
              <Text style={styles.storyReplyText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 2. Create New Moment Modal */}
      <Modal visible={showCreateMomentModal} transparent animationType="slide" onRequestClose={() => setShowCreateMomentModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowCreateMomentModal(false)}>
          <View
            style={[
              styles.createModalCard,
              isDark && {
                backgroundColor: '#0D1117',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
              },
            ]}
          >
            <View style={styles.createModalHeader}>
              <Text style={[styles.createModalTitle, isDark && { color: '#FFFFFF' }]}>Share a Moment</Text>
              <TouchableOpacity onPress={() => setShowCreateMomentModal(false)}>
                <Ionicons name="close" size={22} color={isDark ? '#94A3B8' : '#64748B'} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[
                styles.createInput,
                isDark && {
                  backgroundColor: '#161B22',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                },
              ]}
              placeholder="What's happening right now? Type status..."
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              value={newMomentText}
              onChangeText={setNewMomentText}
              multiline
              autoFocus
            />

            {/* Quick Emojis */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {['💬', '🔥', '☕', '🚀', '🏖️', '🎧', '✨', '💪', '🎉', '📸', '⚡', '💻'].map((em) => (
                <TouchableOpacity
                  key={em}
                  style={[
                    styles.quickEmojiBubble,
                    isDark && {
                      backgroundColor: '#161B22',
                      borderColor: 'rgba(255, 255, 255, 0.08)',
                    },
                  ]}
                  onPress={() => setNewMomentText((prev) => prev + (prev ? ' ' : '') + em)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 16 }}>{em}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.createSubmitBtn,
                isDark && { backgroundColor: '#10B981' },
                !newMomentText.trim() && styles.createSubmitBtnDisabled,
              ]}
              onPress={handleCreateMoment}
              disabled={!newMomentText.trim()}
              activeOpacity={0.8}
            >
              <Text style={styles.createSubmitBtnText}>Share Status / Moment</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* 3. Create Audio Space Modal */}
      <Modal visible={showCreateSpaceModal} transparent animationType="slide" onRequestClose={() => setShowCreateSpaceModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowCreateSpaceModal(false)}>
          <View
            style={[
              styles.createModalCard,
              isDark && {
                backgroundColor: '#0D1117',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
              },
            ]}
          >
            <View style={styles.createModalHeader}>
              <Text style={[styles.createModalTitle, isDark && { color: '#FFFFFF' }]}>Start Live Audio Room</Text>
              <TouchableOpacity onPress={() => setShowCreateSpaceModal(false)}>
                <Ionicons name="close" size={22} color={isDark ? '#94A3B8' : '#64748B'} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[
                styles.createInput,
                isDark && {
                  backgroundColor: '#161B22',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                },
              ]}
              placeholder="Room topic (e.g. Weekend Tech Talk)"
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              value={newSpaceTitle}
              onChangeText={setNewSpaceTitle}
              autoFocus
            />

            <TouchableOpacity
              style={[
                styles.createSubmitBtn,
                isDark && { backgroundColor: '#10B981' },
                !newSpaceTitle.trim() && styles.createSubmitBtnDisabled,
              ]}
              onPress={handleCreateSpace}
              disabled={!newSpaceTitle.trim()}
              activeOpacity={0.8}
            >
              <Ionicons name="radio" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.createSubmitBtnText}>Go Live Now</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 24,
    paddingTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveRedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  newPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  newPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  momentsRail: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 14,
  },
  addMomentCard: {
    width: 90,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
  },
  addMomentAvatarWrapper: {
    position: 'relative',
    marginBottom: 6,
  },
  addMomentAvatar: {
    width: 46,
    height: 46,
    borderRadius: 16,
    opacity: 0.85,
  },
  addPlusBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  addMomentName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  addMomentSub: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
  },
  momentStoryCard: {
    width: 90,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  momentRing: {
    width: 48,
    height: 48,
    borderRadius: 18,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    position: 'relative',
  },
  ringUnread: {
    borderWidth: 2,
    borderColor: '#059669',
  },
  ringViewed: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  momentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
  },
  voiceStoryBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  momentName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    width: 76,
  },
  momentTime: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
  },
  spacesContainer: {
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 14,
  },
  spaceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  spaceCardActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  spaceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  topicBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  topicText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  listenerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  listenerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  spaceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 20,
    marginBottom: 12,
  },
  spaceBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hostInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  hostAvatar: {
    width: 34,
    height: 34,
    borderRadius: 12,
  },
  hostName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  speakersList: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  tuneInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  tunedInBtnActive: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  tuneInText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  tunedInTextActive: {
    color: '#FFFFFF',
  },
  channelsContainer: {
    paddingHorizontal: 16,
    gap: 10,
  },
  channelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  channelAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    marginRight: 12,
  },
  channelCenter: {
    flex: 1,
  },
  channelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  channelDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  channelFollowers: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },
  followBtn: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  followingBtn: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  followText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  followingText: {
    color: '#64748B',
  },
  storyBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  storyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    width: 380,
    maxWidth: '100%',
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  storyProgressBar: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  storyProgressFill: {
    width: '75%',
    height: '100%',
    backgroundColor: '#10B981',
  },
  storyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  storyAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  storyAuthor: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  storyTime: {
    fontSize: 12,
    color: '#94A3B8',
  },
  closeStoryBtn: {
    padding: 4,
  },
  storyContent: {
    minHeight: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyPreviewBox: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  storyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    textAlign: 'center',
    lineHeight: 26,
  },
  storyReplyBtn: {
    marginTop: 20,
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  storyReplyText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
    padding: Platform.OS === 'web' ? 20 : 0,
  },
  createModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'web' ? 24 : 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    width: Platform.OS === 'web' ? 420 : '100%',
    maxWidth: '100%',
  },
  createModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  createModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  createInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontSize: 15,
    color: '#0F172A',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  createSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 14,
  },
  createSubmitBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  createSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  textStatusPillBtn: {
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
  textStatusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  quickEmojiBubble: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
});
