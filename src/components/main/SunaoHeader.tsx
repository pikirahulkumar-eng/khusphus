import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Pressable, Platform } from 'react-native';
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
        <View style={styles.brandIconWrapper}>
          <MaterialCommunityIcons name="waveform" size={22} color="#059669" />
        </View>
        <View>
          <Text style={styles.brandTitle}>Sunao</Text>
          <View style={styles.telemetryTag}>
            <View style={styles.liveDot} />
            <Text style={styles.telemetryText}>Online</Text>
          </View>
        </View>
      </View>

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

        <TouchableOpacity style={styles.iconCircle} onPress={onOpenSearch}>
          <Feather name="search" size={17} color="#475569" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconCircle} onPress={() => setShowMenu(true)}>
          <Feather name="more-vertical" size={17} color="#475569" />
        </TouchableOpacity>
      </View>

      {/* Modern Popover Menu */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowMenu(false)}>
          <View style={styles.dropdownMenu}>
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
                  <Text style={[styles.menuItemText, { fontWeight: '700', color: '#059669' }]}>New Chat</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
              </>
            )}

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                onOpenSettings();
              }}
            >
              <Feather name="settings" size={16} color="#64748B" style={styles.menuItemIcon} />
              <Text style={styles.menuItemText}>Preferences</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
              }}
            >
              <Feather name="shield" size={16} color="#64748B" style={styles.menuItemIcon} />
              <Text style={styles.menuItemText}>Security Keys</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

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
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 12,
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
    paddingTop: Platform.OS === 'ios' ? 48 : 10,
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
});
