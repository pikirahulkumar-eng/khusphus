import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, StatusBar, SafeAreaView, TextInput, Modal, Alert } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import LoginScreen from './src/screens/LoginScreen';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('Calls');
  
  // States for the 3 Icons
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  const dummyCalls = [
    { id: '1', name: 'Rahul Bhai', time: '10:45 AM', type: 'incoming', isVideo: false, missed: false },
    { id: '2', name: 'Papa', time: 'Yesterday, 8:30 PM', type: 'outgoing', isVideo: true, missed: false },
    { id: '3', name: 'Neha', time: 'Yesterday, 4:15 PM', type: 'incoming', isVideo: false, missed: true },
  ];

  // 1. Camera Logic
  const handleCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permission Denied', 'Camera access is required!');
      return;
    }
    const result = await ImagePicker.launchCameraAsync();
    if (!result.canceled) {
      Alert.alert('Photo Captured', 'Your photo is ready to be sent or set as status!');
    }
  };

  const renderCall = ({ item }: any) => {
    if (isSearching && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return null;
    }
    return (
      <View style={styles.callItem}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={24} color="#FFF" />
        </View>
        <View style={styles.callDetails}>
          <Text style={[styles.name, item.missed && { color: '#FF3B30' }]}>{item.name}</Text>
          <View style={styles.subTitleRow}>
            <MaterialIcons
              name={item.type === 'incoming' ? 'call-received' : 'call-made'}
              size={14}
              color={item.missed ? '#FF3B30' : '#25D366'}
              style={{ marginRight: 4 }}
            />
            <Text style={styles.time}>{item.time}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.callActionBtn}>
          <Ionicons name={item.isVideo ? 'videocam' : 'call'} size={22} color="#128C7E" />
        </TouchableOpacity>
      </View>
    );
  };

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#128C7E" barStyle="light-content" />
      
      {/* WhatsApp Style Header */}
      {isSearching ? (
        <View style={styles.searchHeader}>
          <TouchableOpacity onPress={() => { setIsSearching(false); setSearchQuery(''); }}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
        </View>
      ) : (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>KhusPhus</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity onPress={handleCamera}>
              <Ionicons name="camera-outline" size={24} color="#FFF" style={styles.icon} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsSearching(true)}>
              <Ionicons name="search" size={24} color="#FFF" style={styles.icon} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowMenu(true)}>
              <Ionicons name="ellipsis-vertical" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Dropdown Menu Modal */}
      {showMenu && (
        <TouchableOpacity style={styles.menuOverlay} onPress={() => setShowMenu(false)} activeOpacity={1}>
          <View style={styles.dropdownMenu}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); Alert.alert('Settings', 'Opening Settings...'); }}>
              <Text style={styles.menuText}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); Alert.alert('Clear call log', 'Are you sure?'); }}>
              <Text style={styles.menuText}>Clear call log</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('Chats')}>
          <Text style={[styles.tabText, activeTab === 'Chats' && styles.activeTabText]}>Chats</Text>
          {activeTab === 'Chats' && <View style={styles.activeTabIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('Updates')}>
          <Text style={[styles.tabText, activeTab === 'Updates' && styles.activeTabText]}>Updates</Text>
          {activeTab === 'Updates' && <View style={styles.activeTabIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('Calls')}>
          <Text style={[styles.tabText, activeTab === 'Calls' && styles.activeTabText]}>Calls</Text>
          {activeTab === 'Calls' && <View style={styles.activeTabIndicator} />}
        </TouchableOpacity>
      </View>

      {/* Body */}
      {activeTab === 'Calls' ? (
        <View style={{ flex: 1 }}>
          <View style={styles.createLinkRow}>
            <View style={styles.linkIconBg}>
              <Ionicons name="link" size={20} color="#FFF" />
            </View>
            <View>
              <Text style={styles.createLinkText}>Create call link</Text>
              <Text style={styles.createLinkSub}>Share a link for your KhusPhus call</Text>
            </View>
          </View>
          <Text style={styles.recentText}>Recent</Text>
          <FlatList
            data={dummyCalls}
            keyExtractor={(item) => item.id}
            renderItem={renderCall}
          />
          <TouchableOpacity style={styles.fab}>
            <MaterialIcons name="add-call" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>{activeTab} coming soon...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    backgroundColor: '#128C7E',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '600' },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: 20 },
  searchHeader: {
    backgroundColor: '#128C7E',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  searchInput: {
    flex: 1,
    marginLeft: 16,
    color: '#FFF',
    fontSize: 18,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 50,
    right: 10,
    backgroundColor: '#FFF',
    borderRadius: 4,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    paddingVertical: 8,
    minWidth: 150,
    zIndex: 11,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuText: {
    fontSize: 16,
    color: '#000',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#128C7E',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  tabText: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: 'bold' },
  activeTabText: { color: '#FFF' },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 3,
    backgroundColor: '#FFF',
  },
  createLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  linkIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#128C7E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  createLinkText: { fontSize: 16, fontWeight: '500', color: '#000' },
  createLinkSub: { fontSize: 14, color: '#667781', marginTop: 2 },
  recentText: { fontSize: 14, fontWeight: '600', color: '#667781', paddingHorizontal: 16, paddingVertical: 8 },
  callItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E1E4E8', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  callDetails: { flex: 1 },
  name: { fontSize: 16, fontWeight: '500', color: '#000' },
  subTitleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  time: { fontSize: 14, color: '#667781' },
  callActionBtn: { padding: 8 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#128C7E',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyStateText: { fontSize: 16, color: '#667781' },
});
