import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
    <View style={styles.navBar}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;

        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.navItem}
            onPress={() => onTabChange(tab.key)}
            activeOpacity={0.65}
          >
            <View style={[styles.iconWrapper, isActive && styles.iconWrapperActive]}>
              <Ionicons
                name={isActive ? tab.activeIcon : tab.inactiveIcon}
                size={23}
                color={isActive ? '#0A332C' : '#54656F'}
              />

              {Boolean(tab.badgeCount && tab.badgeCount > 0 && !isActive) && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {tab.badgeCount! > 99 ? '99+' : tab.badgeCount}
                  </Text>
                </View>
              )}

              {!tab.badgeCount && tab.showDot && !isActive && (
                <View style={styles.dotBadge} />
              )}
            </View>

            <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
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
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F0F2F5',
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
    paddingVertical: 3,
    borderRadius: 16,
    minHeight: 28,
  },
  iconWrapperActive: {
    backgroundColor: '#D9FDD3',
  },
  navLabel: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#54656F',
    marginTop: 3,
  },
  navLabelActive: {
    color: '#0A332C',
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: 4,
    backgroundColor: '#25D366',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  dotBadge: {
    position: 'absolute',
    top: 2,
    right: 12,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#25D366',
  },
});
