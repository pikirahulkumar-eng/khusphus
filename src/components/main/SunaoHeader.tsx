import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Pressable, Platform, StatusBar } from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

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
  onOpenProfile?: () => void;
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
  onOpenProfile,
}: SunaoHeaderProps) {
  const { isDark, toggleTheme } = useTheme();
  const [showMenu, setShowMenu] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);

  if (isSearching) {
    return (
      <View style={[styles.searchContainer, isDark && { backgroundColor: '#000000', borderBottomColor: 'rgba(255, 255, 255, 0.08)' }]}>
        <View style={[styles.searchBar, isDark && { backgroundColor: '#161B22', borderColor: 'rgba(255, 255, 255, 0.1)' }]}>
          <TouchableOpacity onPress={onCloseSearch} style={styles.searchBackBtn}>
            <Feather name="arrow-left" size={20} color={isDark ? '#10B981' : '#059669'} />
          </TouchableOpacity>
          <TextInput
            style={[styles.searchInput, isDark && { color: '#FFFFFF' }]}
            placeholder="Search conversations, contacts..."
            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
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
    <View style={[styles.headerContainer, isDark && { backgroundColor: '#000000', borderBottomColor: 'rgba(255, 255, 255, 0.08)' }]}>
      <TouchableOpacity
        style={styles.leftBrand}
        onPress={onOpenProfile}
        activeOpacity={0.7}
      >
        <View style={[styles.brandIconWrapper, isDark && { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
          <MaterialCommunityIcons name="waveform" size={22} color={isDark ? '#10B981' : '#047857'} />
        </View>
        <View>
          <Text style={[styles.brandTitle, isDark && { color: '#FFFFFF' }]}>Sunao</Text>
          <View style={[styles.telemetryTag, isDark && { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
            <View style={styles.liveDot} />
            <Text style={[styles.telemetryText, isDark && { color: '#10B981' }]}>Online</Text>
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.rightActions}>
        {onOpenNewChat && (
          <TouchableOpacity
            style={[styles.iconCircle, styles.composeBtn]}
            onPress={onOpenNewChat}
            activeOpacity={0.75}
          >
            <Feather name="edit-3" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.iconCircle, isDark && { backgroundColor: '#161B22', borderColor: 'rgba(255, 255, 255, 0.1)' }]}
          onPress={onOpenSearch}
        >
          <Feather name="search" size={17} color={isDark ? '#94A3B8' : '#475569'} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.iconCircle, isDark && { backgroundColor: '#161B22', borderColor: 'rgba(255, 255, 255, 0.1)' }]}
          onPress={() => setShowMenu(true)}
        >
          <Feather name="more-vertical" size={17} color={isDark ? '#94A3B8' : '#475569'} />
        </TouchableOpacity>
      </View>

      {/* Modern Popover Menu */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowMenu(false)}>
          <View style={[styles.dropdownMenu, isDark && { backgroundColor: '#0D1117', borderColor: 'rgba(255, 255, 255, 0.12)' }]}>
            {onOpenProfile && (
              <>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowMenu(false);
                    onOpenProfile();
                  }}
                >
                  <Feather name="user" size={16} color="#047857" style={styles.menuItemIcon} />
                  <Text style={[styles.menuItemText, { fontWeight: '700', color: isDark ? '#10B981' : '#047857' }]}>My Profile</Text>
                </TouchableOpacity>
                <View style={[styles.menuDivider, isDark && { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]} />
              </>
            )}

            {onOpenNewChat && (
              <>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowMenu(false);
                    onOpenNewChat();
                  }}
                >
                  <Feather name="plus-circle" size={16} color="#059669" style={styles.menuItemIcon} />
                  <Text style={[styles.menuItemText, { fontWeight: '700', color: isDark ? '#10B981' : '#059669' }]}>New Chat</Text>
                </TouchableOpacity>
                <View style={[styles.menuDivider, isDark && { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]} />
              </>
            )}

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                onOpenSettings();
              }}
            >
              <Feather name="settings" size={16} color={isDark ? '#94A3B8' : '#64748B'} style={styles.menuItemIcon} />
              <Text style={[styles.menuItemText, isDark && { color: '#FFFFFF' }]}>Preferences</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                toggleTheme();
              }}
            >
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={16} color={isDark ? '#A855F7' : '#D97706'} style={styles.menuItemIcon} />
              <Text style={[styles.menuItemText, isDark && { color: '#FFFFFF' }]}>
                {isDark ? 'Dark Mode: ON' : 'Dark Mode: OFF'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                setShowSecurityModal(true);
              }}
            >
              <Feather name="shield" size={16} color={isDark ? '#10B981' : '#059669'} style={styles.menuItemIcon} />
              <Text style={[styles.menuItemText, isDark && { color: '#FFFFFF' }]}>Security Keys</Text>
            </TouchableOpacity>

            <View style={[styles.menuDivider, isDark && { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                onLogout();
              }}
            >
              <Feather name="log-out" size={16} color="#EF4444" style={styles.menuItemIcon} />
              <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Sign Out</Text>
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
              <Feather name="shield" size={28} color="#059669" />
            </View>
            <Text style={styles.securityTitle}>End-to-End Encryption</Text>
            <Text style={styles.securitySubtitle}>
              Messages and calls are secured end-to-end. No one outside of this chat, not even Sunao, can read or listen to them.
            </Text>

            <View style={styles.fingerprintCard}>
              <Text style={styles.fingerprintLabel}>SECURITY CODE</Text>
              <Text style={styles.fingerprintValue}>8749 2038 9120 4482 1092 5712</Text>
            </View>

            <View style={styles.securityBadgeRow}>
              <Ionicons name="lock-closed" size={14} color="#059669" />
              <Text style={styles.securityBadgeText}>256-bit AES + Curve25519 Verified</Text>
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
    paddingTop: Platform.OS === 'ios' ? 48 : ((StatusBar.currentHeight || 24) + 10),
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  leftBrand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  telemetryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
    marginRight: 5,
  },
  telemetryText: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  composeBtn: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : ((StatusBar.currentHeight || 24) + 10),
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 40,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchBackBtn: {
    padding: 4,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
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
