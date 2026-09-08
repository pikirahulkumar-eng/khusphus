import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  Platform,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { SunaoTheme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { getBackendUrl } from '../../services/firebase';
import { isDummyContact } from '../../services/chatStorageService';

interface ContactUser {
  phone: string;
  name: string;
  about?: string;
  avatarUri?: string;
}

interface NewChatModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectUser: (user: { phone: string; name: string }) => void;
  contacts: ContactUser[];
}

export default function NewChatModal({
  visible,
  onClose,
  onSelectUser,
  contacts,
}: NewChatModalProps) {
  const { isDark } = useTheme();
  const [search, setSearch] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [dbUser, setDbUser] = useState<ContactUser | null>(null);
  const [isSearchingDb, setIsSearchingDb] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const trimmedSearch = search.trim();
  const digitsOnly = trimmedSearch.replace(/\D/g, '');
  const isValidPhoneNumber = digitsOnly.length >= 10 && digitsOnly.length <= 15;

  // Search Turso DB when typing a valid phone number
  useEffect(() => {
    if (!isValidPhoneNumber) {
      setDbUser(null);
      setIsSearchingDb(false);
      return;
    }

    let isMounted = true;
    setIsSearchingDb(true);
    const timer = setTimeout(async () => {
      try {
        const baseUrl = getBackendUrl();
        const res = await fetch(`${baseUrl}/api/search?query=${digitsOnly}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data) && data.length > 0) {
            const u = data[0];
            setDbUser({
              phone: u.phone || digitsOnly,
              name: u.name || `+91 ${digitsOnly}`,
              about: u.about || 'Registered on Sunao 🚀',
              avatarUri: u.avatarUri || undefined,
            });
          } else if (isMounted) {
            setDbUser(null);
          }
        }
      } catch (err) {
        if (isMounted) setDbUser(null);
      } finally {
        if (isMounted) setIsSearchingDb(false);
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [digitsOnly, isValidPhoneNumber]);

  // Filter contacts by name or phone (only within known contacts + live DB search match)
  const filteredContacts = useMemo(() => {
    const q = trimmedSearch.toLowerCase();
    const list = contacts.filter(
      (c) => !isDummyContact(c) && (c.name.toLowerCase().includes(q) || c.phone.includes(q))
    );
    if (dbUser && !list.some((c) => c.phone === dbUser.phone)) {
      list.unshift(dbUser);
    }
    return list;
  }, [contacts, trimmedSearch, dbUser]);

  // Helper to start chat directly with a real phone number
  const handleStartPhoneChat = () => {
    if (!isValidPhoneNumber) return;
    onClose();
    if (dbUser) {
      onSelectUser({
        phone: dbUser.phone,
        name: dbUser.name,
      });
    } else {
      onSelectUser({
        phone: digitsOnly,
        name: `+91 ${digitsOnly}`,
      });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, isDark && { backgroundColor: '#000000', borderColor: 'rgba(255, 255, 255, 0.08)' }]}>
        {/* Header */}
        <View style={[styles.header, isDark && { backgroundColor: '#000000', borderBottomColor: 'rgba(255, 255, 255, 0.08)' }]}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color={isDark ? '#FFFFFF' : '#0F172A'} />
            </TouchableOpacity>

            <View style={styles.headerTitleBox}>
              <Text style={[styles.headerTitle, isDark && { color: '#FFFFFF' }]}>New Chat</Text>
              <Text style={[styles.headerSubtitle, isDark && { color: '#94A3B8' }]}>{filteredContacts.length} contacts</Text>
            </View>

            <TouchableOpacity
              style={[styles.qrScanBtn, isDark && { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}
              onPress={() => showToast('📷 QR Scanner Active')}
              activeOpacity={0.7}
            >
              <Ionicons name="qr-code-outline" size={20} color="#10B981" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={[styles.searchBarWrapper, isDark && { backgroundColor: '#0A0D12', borderColor: 'rgba(255, 255, 255, 0.08)' }]}>
            <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, isDark && { color: '#FFFFFF' }]}
              placeholder="Search by name or phone..."
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              value={search}
              onChangeText={setSearch}
            />
            {isSearchingDb && (
              <ActivityIndicator size="small" color="#10B981" style={{ marginRight: 6 }} />
            )}
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Contact List */}
        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.phone}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            !search ? (
              <View style={styles.actionsContainer}>
                {/* 2 Modern Action Tiles */}
                <View style={styles.actionTilesRow}>
                  <TouchableOpacity
                    style={[styles.actionTile, isDark && { backgroundColor: '#000000', borderColor: 'rgba(255, 255, 255, 0.08)' }]}
                    onPress={() => {
                      onClose();
                      onSelectUser({ phone: 'grp_sunao_new', name: 'New Project Group 🚀' });
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.actionIconBg, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' }]}>
                      <Ionicons name="people" size={20} color="#10B981" />
                    </View>
                    <Text style={[styles.actionTileTitle, isDark && { color: '#FFFFFF' }]}>New Group</Text>
                    <Text style={[styles.actionTileSub, isDark && { color: '#94A3B8' }]}>Chat with friends</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionHeaderTitle, isDark && { color: '#64748B' }]}>Contacts on Sunao</Text>
                  <Text style={[styles.sectionHeaderCount, isDark && { color: '#10B981' }]}>{filteredContacts.length}</Text>
                </View>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.contactCard, isDark && { backgroundColor: '#000000', borderColor: 'rgba(255, 255, 255, 0.08)' }]}
              onPress={() => {
                onClose();
                onSelectUser({ phone: item.phone, name: item.name });
              }}
              activeOpacity={0.7}
            >
              <View style={styles.avatarWrapper}>
                {item.avatarUri ? (
                  <Image source={{ uri: item.avatarUri }} style={styles.avatarImg} />
                ) : (
                  <View style={[styles.avatarFallback, isDark && { backgroundColor: '#0A0D12' }]}>
                    <Ionicons name="person" size={22} color={isDark ? '#94A3B8' : '#64748B'} />
                  </View>
                )}
                <View style={[styles.onlineDot, isDark && { borderColor: '#000000' }]} />
              </View>

              <View style={styles.contactInfo}>
                <Text style={[styles.contactName, isDark && { color: '#FFFFFF' }]}>{item.name}</Text>
                <Text style={[styles.contactAbout, isDark && { color: '#94A3B8' }]} numberOfLines={1}>
                  {item.about}
                </Text>
                <Text style={[styles.contactPhone, isDark && { color: '#64748B' }]}>+91 {item.phone}</Text>
              </View>

              <View style={styles.cardActions}>
                <View style={[styles.chatActionBtn, isDark && { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
                  <Ionicons name="chatbubble-ellipses" size={16} color="#10B981" />
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            trimmedSearch.length > 0 ? (
              isSearchingDb ? (
                <View style={styles.emptyContainer}>
                  <ActivityIndicator size="small" color="#10B981" style={{ marginBottom: 12 }} />
                  <Text style={[styles.emptyTitle, isDark && { color: '#FFFFFF' }]}>Searching Turso Database...</Text>
                  <Text style={[styles.emptySub, isDark && { color: '#94A3B8' }]}>
                    Looking up +91 {digitsOnly}
                  </Text>
                </View>
              ) : isValidPhoneNumber ? (
                <View style={styles.emptyContainer}>
                  <TouchableOpacity
                    style={[
                      styles.customChatCard,
                      isDark && { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: '#10B981' },
                    ]}
                    onPress={handleStartPhoneChat}
                    activeOpacity={0.7}
                  >
                    <View style={styles.customChatIconBg}>
                      <Ionicons name="chatbubbles" size={24} color="#10B981" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.customChatTitle, isDark && { color: '#FFFFFF' }]}>
                        Message +91 {digitsOnly}
                      </Text>
                      <Text style={[styles.customChatSub, isDark && { color: '#94A3B8' }]}>
                        Start direct conversation with this number
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward-circle" size={26} color="#10B981" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="search-outline" size={44} color="#94A3B8" style={{ marginBottom: 10 }} />
                  <Text style={[styles.emptyTitle, isDark && { color: '#FFFFFF' }]}>No registered user found</Text>
                  <Text style={[styles.emptySub, isDark && { color: '#94A3B8' }]}>
                    Enter a 10-digit phone number to search registered users
                  </Text>
                </View>
              )
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={40} color="#94A3B8" style={{ marginBottom: 8 }} />
                <Text style={styles.emptyText}>No contacts yet</Text>
              </View>
            )
          }
          ListFooterComponent={
            isValidPhoneNumber && !isSearchingDb && !filteredContacts.some((c) => c.phone === digitsOnly) ? (
              <TouchableOpacity
                style={[
                  styles.customChatCard,
                  { marginTop: 12, marginBottom: 24 },
                  isDark && { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: '#10B981' },
                ]}
                onPress={handleStartPhoneChat}
                activeOpacity={0.7}
              >
                <View style={styles.customChatIconBg}>
                  <Ionicons name="call" size={22} color="#10B981" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.customChatTitle, isDark && { color: '#FFFFFF' }]}>
                    Message +91 {digitsOnly} directly
                  </Text>
                  <Text style={[styles.customChatSub, isDark && { color: '#94A3B8' }]}>
                    Start conversation with this phone number
                  </Text>
                </View>
                <Ionicons name="arrow-forward-circle" size={24} color="#10B981" />
              </TouchableOpacity>
            ) : null
          }
        />

        {/* Floating Toast Notification */}
        {Boolean(toastMessage) && (
          <View style={[styles.toastBanner, isDark && { backgroundColor: '#000000', borderColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1 }]}>
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
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : ((StatusBar.currentHeight || 24) + 12),
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  backBtn: {
    padding: 6,
    marginRight: 10,
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
  qrScanBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  actionsContainer: {
    marginBottom: 8,
  },
  actionTilesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionTile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTileTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionTileSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHeaderCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  contactCard: {
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
    width: 46,
    height: 46,
    borderRadius: 16,
  },
  avatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#059669',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  contactAbout: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  contactPhone: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  cardActions: {
    marginLeft: 8,
  },
  chatActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    width: '100%',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  customChatCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderRadius: 16,
    padding: 14,
  },
  customChatIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customChatTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  customChatSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
});
