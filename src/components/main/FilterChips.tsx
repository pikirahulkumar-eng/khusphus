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
  const filterItems: { key: FilterType; label: string }[] = [
    { key: 'All', label: 'All' },
    { key: 'Unread', label: 'Unread' },
    { key: 'Favourites', label: 'Favourites' },
    { key: 'Groups', label: 'Groups' },
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
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F0F2F5',
    marginRight: 8,
  },
  pillActive: {
    backgroundColor: '#D9FDD3',
  },
  pillText: {
    fontSize: 13.5,
    color: '#54656F',
    fontWeight: '500',
  },
  pillTextActive: {
    color: '#008069',
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: '#D1D7DB',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    marginLeft: 6,
  },
  countBadgeActive: {
    backgroundColor: '#008069',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#54656F',
  },
  countBadgeTextActive: {
    color: '#FFFFFF',
  },
});
