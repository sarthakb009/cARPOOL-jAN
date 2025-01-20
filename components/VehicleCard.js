import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEdit, faTrash, faCar, faIdCard, faUsers } from '@fortawesome/free-solid-svg-icons';

const VehicleCard = ({ vehicle, onEdit, onDelete }) => {
  return (
    <View style={styles.vehicleCard}>
      <View style={styles.vehicleHeader}>
        <Text style={styles.vehicleTitle}>
          <FontAwesomeIcon icon={faCar} style={styles.icon} /> Vehicle
        </Text>
        <View style={styles.vehicleActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={onEdit}>
            <FontAwesomeIcon icon={faEdit} style={styles.actionIcon} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={onDelete}>
            <FontAwesomeIcon icon={faTrash} style={styles.actionIcon} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.vehicleBody}>
        <View style={styles.vehicleInfo}>
          <FontAwesomeIcon icon={faCar} style={styles.icon} />
          <Text style={styles.infoText}>{`${vehicle.make || ''} ${vehicle.model || ''}`}</Text>
        </View>
        <View style={styles.vehicleInfo}>
          <FontAwesomeIcon icon={faIdCard} style={styles.icon} />
          <Text style={styles.infoText}>{vehicle.vehicleNumber || ''}</Text>
        </View>
        <View style={styles.vehicleInfo}>
          <FontAwesomeIcon icon={faUsers} style={styles.icon} />
          <Text style={styles.infoText}>{vehicle.capacity ? `${vehicle.capacity} seats` : 'No seats'}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  vehicleCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 4,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#6B46C1',
  },
  vehicleTitle: {
    fontSize: 18,
    color: '#fff',
  },
  vehicleActions: {
    flexDirection: 'row',
  },
  actionBtn: {
    padding: 6,
    marginHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    color: '#fff',
  },
  vehicleBody: {
    padding: 15,
    backgroundColor: '#f5f5f5',
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  icon: {
    marginRight: 10,
    color: '#6B46C1',
  },
  infoText: {
    fontSize: 16,
    color: '#333',
  },
});

export default VehicleCard;
