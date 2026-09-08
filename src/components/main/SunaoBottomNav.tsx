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
  const safeBottom = Platform.OS === 'ios' ? 24 : 10;

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
        { paddingBottom: safeBottom },
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
                isActive && styles.iconWrapperActive,
              ]}
            >
              <Ionicons
                name={isActive ? tab.activeIcon : tab.inactiveIcon}
                size={24}
                color={
                  isActive
                    ? '#10B981'
                    : isDark
                    ? '#64748B'
                    : '#64748B'
                }
                style={isActive ? [
                  styles.activeIconGlow,
                  Platform.OS === 'web' && ({ filter: 'drop-shadow(0px 0px 8px rgba(16, 185, 129, 0.85))' } as any),
                ] : undefined}
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
    minHeight: 28,
  },
  iconWrapperActive: {
    backgroundColor: 'transparent',
  },
  activeIconGlow: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 10,
    elevation: 10,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 3,
  },
  navLabelActive: {
    color: '#10B981',
    fontWeight: '700',
    textShadowColor: 'rgba(16, 185, 129, 0.65)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
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
    top: -1,
    right: -4,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});
