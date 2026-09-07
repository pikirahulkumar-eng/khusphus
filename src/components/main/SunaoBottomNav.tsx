import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

export type MainNavTab = 'Chats' | 'Calls' | 'Updates' | 'Profile';

interface SunaoBottomNavProps {
  activeTab: MainNavTab;
  onTabChange: (tab: MainNavTab) => void;
  unreadChatsCount?: number;
  missedCallsCount?: number;
  hasUpdatesBadge?: boolean;
}

export default function SunaoBottomNav({
  activeTab,
  onTabChange,
  unreadChatsCount = 0,
  missedCallsCount = 0,
  hasUpdatesBadge = true,
}: SunaoBottomNavProps) {
  const { isDark } = useTheme();

  const tabs: {
    key: MainNavTab;
    label: string;
    activeIcon: keyof typeof Ionicons.glyphMap;
    inactiveIcon: keyof typeof Ionicons.glyphMap;
    badgeCount?: number;
    showDot?: boolean;
  }[] = [
    {
      key: 'Chats',
      label: 'Chats',
      activeIcon: 'chatbubbles',
      inactiveIcon: 'chatbubbles-outline',
      badgeCount: unreadChatsCount,
    },
    {
      key: 'Calls',
      label: 'Calls',
      activeIcon: 'call',
      inactiveIcon: 'call-outline',
      badgeCount: missedCallsCount,
    },
    {
      key: 'Updates',
      label: 'Moments',
      activeIcon: 'sparkles',
      inactiveIcon: 'sparkles-outline',
      showDot: hasUpdatesBadge,
    },
    {
      key: 'Profile',
      label: 'Profile',
      activeIcon: 'person',
      inactiveIcon: 'person-outline',
    },
  ];

  return (
    <View
      style={[
        styles.navBar,
        isDark && {
          backgroundColor: '#000000',
          borderTopColor: 'rgba(255, 255, 255, 0.08)',
        },
      ]}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;

        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.navItem}
            onPress={() => onTabChange(tab.key)}
            activeOpacity={0.65}
          >
            <View
              style={[
                styles.iconWrapper,
                isActive && [
                  styles.iconWrapperActive,
                  isDark && { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
                ],
              ]}
            >
              <Ionicons
                name={isActive ? tab.activeIcon : tab.inactiveIcon}
                size={22}
                color={
                  isActive
                    ? '#10B981'
                    : isDark
                    ? '#64748B'
                    : '#64748B'
                }
              />

              {Boolean(tab.badgeCount && tab.badgeCount > 0 && !isActive) && (
                <View
                  style={[
                    styles.badge,
                    isDark && { borderColor: '#000000' },
                  ]}
                >
                  <Text style={styles.badgeText}>
                    {tab.badgeCount! > 99 ? '99+' : tab.badgeCount}
                  </Text>
                </View>
              )}

              {!tab.badgeCount && tab.showDot && !isActive && (
                <View
                  style={[
                    styles.dotBadge,
                    isDark && { borderColor: '#000000' },
                  ]}
                />
              )}
            </View>

            <Text
              style={[
                styles.navLabel,
                isDark && { color: '#64748B' },
                isActive && [
                  styles.navLabelActive,
                  isDark && { color: '#10B981' },
                ],
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  navBar: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 16,
    minHeight: 30,
  },
  iconWrapperActive: {
    backgroundColor: '#ECFDF5',
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  navLabelActive: {
    color: '#047857',
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: 4,
    backgroundColor: '#10B981',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  dotBadge: {
    position: 'absolute',
    top: 2,
    right: 12,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});
