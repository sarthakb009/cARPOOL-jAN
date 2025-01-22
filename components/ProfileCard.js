import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

const ProfileCard = ({ status, message, info, buttonText, iconName, onPress }) => (
  <View style={styles.profileCard}>
    <View style={styles.profileHeader}>
      <Text style={styles.profileMessage}>
        <FontAwesome5 name={iconName} size={24} color="#fff" /> {message}
      </Text>
      <Text style={[styles.profileStatus, styles[status.toLowerCase().replace(' ', '-')]]}>{status}</Text>
    </View>
    <View style={styles.profileBody}>
      <Text style={styles.profileInfo}>{info}</Text>
      {buttonText ? (
        <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
          <Text style={styles.btnText}>{buttonText}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  </View>
);

const styles = StyleSheet.create({
  profileCard: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#6B46C1', // Brand color
  },
  profileMessage: {
    fontSize: 18,
    color: '#fff',
  },
  profileStatus: {
    padding: 5,
    borderRadius: 12,
    fontSize: 14,
  },
  'not-created': {
    backgroundColor: '#ffcc00',
    color: '#fff',
  },
  created: {
    backgroundColor: '#00cc66',
    color: '#fff',
  },
  verified: {
    backgroundColor: '#0066cc',
    color: '#fff',
  },
  declined: {
    backgroundColor: '#cc0000',
    color: '#fff',
  },
  profileBody: {
    padding: 20,
    alignItems: 'center',
  },
  profileInfo: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  actionBtn: {
    width: '100%',
    padding: 10,
    borderRadius: 25,
    backgroundColor: '#6B46C1', // Brand color
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default ProfileCard;
