import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';

export type FilterType = 'All' | 'Unread' | 'Favourites' | 'Groups';

interface FilterChipsProps {
  activeFilter: FilterType;
  onSelectFilter: (filter: FilterType) => void;
  unreadCount?: number;
}

export default function FilterChips({
  activeFilter,
  onSelectFilter,
  unreadCount = 0,
}: FilterChipsProps) {
  const filterItems: { key: FilterType; label: string; icon: any }[] = [
    { key: 'All', label: 'All', icon: 'message-circle' },
    { key: 'Unread', label: 'Unread', icon: 'inbox' },
    { key: 'Favourites', label: 'Starred', icon: 'star' },
    { key: 'Groups', label: 'Channels', icon: 'users' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filterItems.map((item) => {
          const isActive = activeFilter === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.pill, isActive && styles.pillActive]}
              onPress={() => onSelectFilter(item.key)}
              activeOpacity={0.75}
            >
              <Feather
                name={item.icon}
                size={13}
                color={isActive ? '#059669' : '#64748B'}
                style={styles.pillIcon}
              />
              <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                {item.label}
              </Text>
              {item.key === 'Unread' && unreadCount > 0 && (
                <View style={[styles.countBadge, isActive && styles.countBadgeActive]}>
                  <Text style={[styles.countBadgeText, isActive && styles.countBadgeTextActive]}>
                    {unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 13,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  pillIcon: {
    marginRight: 6,
  },
  pillText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: '#059669',
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    marginLeft: 6,
  },
  countBadgeActive: {
    backgroundColor: '#059669',
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  countBadgeTextActive: {
    color: '#FFFFFF',
  },
});
