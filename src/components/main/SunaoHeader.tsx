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
  onSelectFilter?: (filter: string) => void;
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
  onSelectFilter,
}: SunaoHeaderProps) {
  const { isDark, toggleTheme } = useTheme();
  const [showMenu, setShowMenu] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);

  if (isSearching) {
    return (
      <View style={[styles.searchContainer, isDark && { backgroundColor: '#000000', borderBottomColor: 'rgba(255, 255, 255, 0.08)' }]}>
        <View style={[styles.searchBar, isDark && { backgroundColor: '#000000', borderColor: 'rgba(16, 185, 129, 0.4)' }]}>
          <TouchableOpacity onPress={onCloseSearch} style={styles.searchBackBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={21} color={isDark ? '#10B981' : '#059669'} />
          </TouchableOpacity>
          <Ionicons name="search" size={17} color={isDark ? '#64748B' : '#94A3B8'} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, isDark && { color: '#FFFFFF' }]}
            placeholder="Search by name or phone number..."
            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
            value={searchQuery}
            onChangeText={onSearchChange}
            autoFocus
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => onSearchChange('')} style={styles.clearBtn} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={18} color={isDark ? '#64748B' : '#94A3B8'} />
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
        </View>
      </TouchableOpacity>

      {/* Modern Compact Floating Actions */}
      <View style={styles.rightActions}>
        {onCameraPress && (
          <TouchableOpacity
            style={[styles.iconCircle, isDark && { backgroundColor: '#0A0D12', borderColor: 'rgba(255, 255, 255, 0.08)' }]}
            onPress={onCameraPress}
            activeOpacity={0.75}
          >
            <Feather name="camera" size={17} color={isDark ? '#94A3B8' : '#475569'} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.iconCircle, isDark && { backgroundColor: '#0A0D12', borderColor: 'rgba(255, 255, 255, 0.08)' }]}
          onPress={onOpenSearch}
          activeOpacity={0.75}
        >
          <Feather name="search" size={17} color={isDark ? '#94A3B8' : '#475569'} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.iconCircle, isDark && { backgroundColor: '#0A0D12', borderColor: 'rgba(255, 255, 255, 0.08)' }]}
          onPress={() => setShowMenu(true)}
          activeOpacity={0.75}
        >
          <Feather name="more-vertical" size={17} color={isDark ? '#94A3B8' : '#475569'} />
        </TouchableOpacity>
      </View>

      {/* Modern Popover Menu for Chats Tab — anchored directly under the left Three Dots button */}
      {showMenu && (
        <View style={styles.dropdownAnchorWrapper}>
          <Pressable style={styles.menuBackdrop} onPress={() => setShowMenu(false)} />
          <View style={[styles.dropdownMenu, isDark && { backgroundColor: '#000000', borderColor: 'rgba(255, 255, 255, 0.1)' }]}>
            {onOpenNewChat && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  onOpenNewChat();
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="people-outline" size={17} color={isDark ? '#10B981' : '#059669'} style={styles.menuItemIcon} />
                <Text style={[styles.menuItemText, isDark && { color: '#FFFFFF' }]}>New Group</Text>
              </TouchableOpacity>
            )}

            {onSelectFilter && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  onSelectFilter('Starred');
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="star-outline" size={17} color="#F59E0B" style={styles.menuItemIcon} />
                <Text style={[styles.menuItemText, isDark && { color: '#FFFFFF' }]}>Starred Messages</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                toggleTheme();
              }}
              activeOpacity={0.7}
            >
              <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={17} color={isDark ? '#F59E0B' : '#6366F1'} style={styles.menuItemIcon} />
              <Text style={[styles.menuItemText, isDark && { color: '#FFFFFF' }]}>
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </Text>
            </TouchableOpacity>

            <View style={[styles.menuDivider, isDark && { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                onOpenSettings();
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={17} color={isDark ? '#94A3B8' : '#64748B'} style={styles.menuItemIcon} />
              <Text style={[styles.menuItemText, isDark && { color: '#FFFFFF' }]}>Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                setShowSecurityModal(true);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="shield-checkmark-outline" size={17} color={isDark ? '#10B981' : '#059669'} style={styles.menuItemIcon} />
              <Text style={[styles.menuItemText, isDark && { color: '#FFFFFF' }]}>Security Keys</Text>
            </TouchableOpacity>

            <View style={[styles.menuDivider, isDark && { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                onLogout();
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={17} color="#EF4444" style={styles.menuItemIcon} />
              <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Security Keys Info Modal */}
      <Modal
        visible={showSecurityModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSecurityModal(false)}
      >
        <Pressable style={[styles.securityOverlay, isDark && { backgroundColor: 'rgba(0, 0, 0, 0.85)' }]} onPress={() => setShowSecurityModal(false)}>
          <View style={[styles.securityCard, isDark && { backgroundColor: '#000000', borderColor: 'rgba(255, 255, 255, 0.1)' }]}>
            <View style={[styles.securityIconCircle, isDark && { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
              <Feather name="shield" size={28} color={isDark ? '#10B981' : '#059669'} />
            </View>
            <Text style={[styles.securityTitle, isDark && { color: '#FFFFFF' }]}>End-to-End Encryption</Text>
            <Text style={[styles.securitySubtitle, isDark && { color: '#94A3B8' }]}>
              Messages and calls are secured end-to-end. No one outside of this chat, not even Sunao, can read or listen to them.
            </Text>

            <View style={[styles.fingerprintCard, isDark && { backgroundColor: '#0A0D12', borderColor: 'rgba(255, 255, 255, 0.08)' }]}>
              <Text style={[styles.fingerprintLabel, isDark && { color: '#64748B' }]}>SECURITY CODE</Text>
              <Text style={[styles.fingerprintValue, isDark && { color: '#00F2FE' }]}>8749 2038 9120 4482 1092 5712</Text>
            </View>

            <View style={styles.securityBadgeRow}>
              <Ionicons name="lock-closed" size={14} color={isDark ? '#10B981' : '#059669'} />
              <Text style={[styles.securityBadgeText, isDark && { color: '#10B981' }]}>256-bit AES + Curve25519 Verified</Text>
            </View>

            <TouchableOpacity
              style={[styles.closeSecurityBtn, isDark && { backgroundColor: '#10B981' }]}
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
    position: 'relative',
    zIndex: 1000,
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
    paddingTop: Platform.OS === 'ios' ? 48 : ((StatusBar.currentHeight || 24) + 8),
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchBackBtn: {
    padding: 6,
    marginRight: 4,
    borderRadius: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  clearBtn: {
    padding: 6,
  },
  dropdownAnchorWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  menuBackdrop: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9998,
    backgroundColor: 'transparent',
  },
  dropdownMenu: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 84 : 58,
    right: 16,
    zIndex: 9999,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 8,
    minWidth: 195,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.15,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  menuItemIcon: {
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
    marginHorizontal: 8,
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
