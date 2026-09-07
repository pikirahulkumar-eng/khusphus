import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Pressable, Platform, StatusBar } from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';

interface SunaoHeaderProps {
  activeTab: string;
  searchQuery: string;
  isSearching: boolean;
  onSearchChange: (text: string) => void;
  onOpenSearch: () => void;
  onCloseSearch: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  onCameraPress?: () => void;
  onOpenNewChat?: () => void;
}

export default function SunaoHeader({
  activeTab,
  searchQuery,
  isSearching,
  onSearchChange,
  onOpenSearch,
  onCloseSearch,
  onOpenSettings,
  onLogout,
  onCameraPress,
  onOpenNewChat,
}: SunaoHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);

  if (isSearching) {
    return (
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <TouchableOpacity onPress={onCloseSearch} style={styles.searchBackBtn}>
            <Feather name="arrow-left" size={20} color="#059669" />
          </TouchableOpacity>
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations, contacts..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={onSearchChange}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => onSearchChange('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.headerContainer}>
      <View style={styles.leftBrand}>
        <Text style={styles.brandTitle}>Sunao</Text>
      </View>

      <View style={styles.rightActions}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onCameraPress}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="camera-outline" size={23} color="#111B21" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onOpenSearch}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="search-outline" size={22} color="#111B21" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setShowMenu(true)}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="ellipsis-vertical" size={20} color="#111B21" />
        </TouchableOpacity>
      </View>

      {/* WhatsApp Style Dropdown Menu */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowMenu(false)}>
          <View style={styles.dropdownMenu}>
            {onOpenNewChat && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  onOpenNewChat();
                }}
              >
                <Text style={styles.menuItemText}>New group</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                onOpenNewChat?.();
              }}
            >
              <Text style={styles.menuItemText}>New broadcast</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                setShowSecurityModal(true);
              }}
            >
              <Text style={styles.menuItemText}>Linked devices</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                setShowSecurityModal(true);
              }}
            >
              <Text style={styles.menuItemText}>Starred messages</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                onOpenSettings();
              }}
            >
              <Text style={styles.menuItemText}>Settings</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                onLogout();
              }}
            >
              <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Log out</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Security Keys Info Modal */}
      <Modal
        visible={showSecurityModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSecurityModal(false)}
      >
        <Pressable style={styles.securityOverlay} onPress={() => setShowSecurityModal(false)}>
          <View style={styles.securityCard}>
            <View style={styles.securityIconCircle}>
              <Ionicons name="lock-closed" size={28} color="#008069" />
            </View>
            <Text style={styles.securityTitle}>End-to-End Encryption</Text>
            <Text style={styles.securitySubtitle}>
              Messages and calls are secured end-to-end with AES-256 and WebRTC encryption. No one outside of this chat, not even Sunao, can read or listen to them.
            </Text>

            <View style={styles.fingerprintCard}>
              <Text style={styles.fingerprintLabel}>SECURITY CODE</Text>
              <Text style={styles.fingerprintValue}>8749 2038 9120 4482 1092 5712</Text>
            </View>

            <TouchableOpacity
              style={styles.closeSecurityBtn}
              onPress={() => setShowSecurityModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.closeSecurityBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : ((StatusBar.currentHeight || 24) + 10),
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  leftBrand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#008069',
    letterSpacing: -0.2,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : ((StatusBar.currentHeight || 24) + 10),
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F2F5',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    borderRadius: 24,
    paddingHorizontal: 12,
    height: 42,
  },
  searchBackBtn: {
    padding: 4,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111B21',
    fontWeight: '400',
  },
  clearBtn: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  dropdownMenu: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 80 : 54,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 6,
    minWidth: 170,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  menuItemIcon: {
    marginRight: 10,
  },
  menuItemText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  securityOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  securityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    maxWidth: 420,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  securityIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  securityTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  securitySubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },
  fingerprintCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    marginBottom: 16,
  },
  fingerprintLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  fingerprintValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 1,
  },
  securityBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
  },
  securityBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  closeSecurityBtn: {
    width: '100%',
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  closeSecurityBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
