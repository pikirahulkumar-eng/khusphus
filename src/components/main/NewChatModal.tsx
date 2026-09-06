import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { SunaoTheme } from '../../constants/theme';

interface ContactUser {
  phone: string;
  name: string;
  about: string;
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
  const [search, setSearch] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color="#0F172A" />
            </TouchableOpacity>

            <View style={styles.headerTitleBox}>
              <Text style={styles.headerTitle}>New Chat</Text>
              <Text style={styles.headerSubtitle}>{contacts.length} contacts</Text>
            </View>

            <TouchableOpacity
              style={styles.qrScanBtn}
              onPress={() => showToast('📷 QR Scanner Active')}
              activeOpacity={0.7}
            >
              <Ionicons name="qr-code-outline" size={20} color="#059669" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBarWrapper}>
            <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or phone..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
            />
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
                    style={styles.actionTile}
                    onPress={() => {
                      onClose();
                      onSelectUser({ phone: 'grp_sunao_new', name: 'New Project Group 🚀' });
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.actionIconBg, { backgroundColor: '#ECFDF5' }]}>
                      <Ionicons name="people" size={20} color="#059669" />
                    </View>
                    <Text style={styles.actionTileTitle}>New Group</Text>
                    <Text style={styles.actionTileSub}>Chat with friends</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionTile}
                    onPress={() => {
                      onClose();
                      onSelectUser({ phone: 'space_live_room', name: 'Open Audio Lounge 🎙️' });
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.actionIconBg, { backgroundColor: '#EFF6FF' }]}>
                      <Ionicons name="radio" size={20} color="#0284C7" />
                    </View>
                    <Text style={styles.actionTileTitle}>Audio Space</Text>
                    <Text style={styles.actionTileSub}>Live voice room</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeaderTitle}>Contacts on Sunao</Text>
                  <Text style={styles.sectionHeaderCount}>{filteredContacts.length}</Text>
                </View>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.contactCard}
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
                  <View style={styles.avatarFallback}>
                    <Ionicons name="person" size={22} color="#64748B" />
                  </View>
                )}
                <View style={styles.onlineDot} />
              </View>

              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{item.name}</Text>
                <Text style={styles.contactAbout} numberOfLines={1}>
                  {item.about}
                </Text>
                <Text style={styles.contactPhone}>+91 {item.phone}</Text>
              </View>

              <View style={styles.cardActions}>
                <View style={styles.chatActionBtn}>
                  <Ionicons name="chatbubble-ellipses" size={16} color="#059669" />
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={40} color="#94A3B8" style={{ marginBottom: 8 }} />
              <Text style={styles.emptyText}>No contacts found for "{search}"</Text>
            </View>
          }
        />

        {/* Floating Toast Notification */}
        {Boolean(toastMessage) && (
          <View style={styles.toastBanner}>
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
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
  },
});
