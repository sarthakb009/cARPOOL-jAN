import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { Box, VStack, HStack, Text, Icon, Button, Menu, Pressable, Spinner, AlertDialog, Input, FormControl } from 'native-base';
import { FontAwesome5, MaterialIcons, Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackButton } from '../components/sharedComponents';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { calculateAverageRating } from '../utils/ratingUtils';

const DriverProfileScreen = () => {
  const [driverData, setDriverData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [editingDocumentId, setEditingDocumentId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const documentsPerPage = 3;
  const navigation = useNavigation();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    drivingLicense: '',
    driverPhone: '',
    email: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const cancelRef = React.useRef(null);
  const [reviews, setReviews] = useState([]);

  const fetchDriverData = useCallback(async () => {
    try {
      const driverId = await AsyncStorage.getItem('driverId');
      const token = await AsyncStorage.getItem('userToken');
      console.log('Fetching driver data for ID:', driverId);
      
      const response = await axios.get(`http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/driver/getById?id=${driverId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Driver data received:', response.data);
      setDriverData(response.data);
      
      if (response.data.documents) {
        console.log('Documents found:', response.data.documents);
        setDocuments(response.data.documents);
      }
    } catch (error) {
      console.error('Error fetching driver data:', error);
      setError('Failed to fetch driver data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDriverReviews = async () => {
    try {
      const driverId = await AsyncStorage.getItem('driverId');
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await axios.get(
        `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/review/getByDriver?driverId=${driverId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setReviews(response.data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  useEffect(() => {
    fetchDriverData();
  }, [fetchDriverData]);

  useEffect(() => {
    fetchDriverReviews();
  }, []);

  const calculateAge = (dateOfBirth) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleUploadDocument = async () => {
    try {
      setUploadLoading(true);
      console.log('Starting document upload process...');
      
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      
      console.log('Document picker result:', result);
      
      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        const token = await AsyncStorage.getItem('userToken');
        const driverId = await AsyncStorage.getItem('driverId');
        
        // Generate a unique documentId
        const uniqueDocId = `${Date.now()}_${file.name}`;
        
        console.log('Creating document record with payload:', {
          documentType: "Driver License",
          documentId: uniqueDocId,
          driverId: driverId
        });

        try {
          const createResponse = await axios.post(
            `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/documents/add?driverId=${driverId}`,
            {
              documentType: "Driver License",
              documentId: uniqueDocId
            },
            {
              headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          console.log('Document creation response:', createResponse.data);
          const documentId = createResponse.data;

          // Continue with file upload only if document creation was successful
          const formData = new FormData();
          formData.append('file', {
            uri: file.uri,
            type: file.mimeType,
            name: file.name,
          });

          console.log('Uploading file...');
          const uploadResponse = await axios.put(
            `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/documents/uploadFile?documentId=${documentId}&driverId=${driverId}`,
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
                Authorization: `Bearer ${token}`,
              }
            }
          );

          console.log('Upload successful:', uploadResponse.data);
          
          // Update local state
          setDocuments(prev => [...prev, {
            id: documentId,
            name: file.name,
            type: 'Driver License',
            uploadDate: new Date().toISOString()
          }]);

          Alert.alert('Success', 'Document uploaded successfully!');
        } catch (createError) {
          console.error('Document creation error details:', {
            status: createError.response?.status,
            data: createError.response?.data,
            headers: createError.response?.headers
          });
          throw createError;
        }
      }
    } catch (err) {
      console.error('Error uploading document:', err);
      console.error('Full error object:', JSON.stringify(err, null, 2));
      Alert.alert(
        'Upload Error', 
        `Failed to upload document: ${err.response?.data?.message || err.message}`
      );
    } finally {
      setUploadLoading(false);
    }
  };

  const handleEditDocument = async (documentId) => {
    try {
      setEditingDocumentId(documentId);
      console.log('Starting document edit process...');
      
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        const token = await AsyncStorage.getItem('userToken');
        const driverId = await AsyncStorage.getItem('driverId');
        
        const formData = new FormData();
        formData.append('file', {
          uri: file.uri,
          type: file.mimeType,
          name: file.name,
        });
        
        console.log('Updating document:', { documentId, fileName: file.name });
        
        const response = await axios.put(
          `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/documents/uploadFile?documentId=${documentId}&driverId=${driverId}`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${token}`,
            },
          }
        );
        
        console.log('Document update response:', response.data);
        
        setDocuments(prev => prev.map(doc => 
          doc.id === documentId 
            ? {
                ...doc,
                documentId: `${Date.now()}_${file.name}`,
                docPresent: true,
                documentStatus: "Pending"
              }
            : doc
        ));
        
        Alert.alert('Success', 'Document updated successfully!');
      }
    } catch (err) {
      console.error('Error updating document:', err);
      Alert.alert('Update Error', 'Failed to update document. Please try again.');
    } finally {
      setEditingDocumentId(null);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      console.log('Deleting document:', documentId);
      
      await axios.delete(
        `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/documents/delete?documentId=${documentId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Update local state to remove the deleted document
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      Alert.alert('Success', 'Document deleted successfully!');
    } catch (err) {
      console.error('Error deleting document:', err);
      Alert.alert('Delete Error', 'Failed to delete document. Please try again.');
    }
  };

  const paginatedDocuments = documents.slice(
    (currentPage - 1) * documentsPerPage,
    currentPage * documentsPerPage
  );

  const totalPages = Math.ceil(documents.length / documentsPerPage);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleUpdateProfile = async (formData) => {
    try {
      setIsEditing(true);
      const token = await AsyncStorage.getItem('userToken');
      const driverId = await AsyncStorage.getItem('driverId');

      const response = await axios.put(
        `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/driver/edit?id=${driverId}`,
        formData,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        // Update local state
        setDriverData(prev => ({
          ...prev,
          ...formData
        }));
        Alert.alert('Success', 'Profile updated successfully!');
        setIsEditModalOpen(false);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsEditing(false);
    }
  };

  const EditProfileModal = ({ isOpen, onClose, onSave, initialData, isLoading }) => {
    const [formData, setFormData] = useState(initialData);
    const [errors, setErrors] = useState({});

    const validateForm = () => {
      const newErrors = {};
      if (!formData.driverPhone) newErrors.phone = "Phone number is required";
      if (!formData.email) newErrors.email = "Email is required";
      if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = "Invalid email format";
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
      if (validateForm()) {
        onSave(formData);
      }
    };

    return (
      <AlertDialog 
        isOpen={isOpen} 
        onClose={onClose} 
        leastDestructiveRef={cancelRef}
      >
        <AlertDialog.Content>
        <AlertDialog.Header 
          flexDirection="row" 
          justifyContent="space-between" 
          alignItems="center"
        >
          <Text fontSize="lg" fontWeight="bold">Edit Profile</Text>
          <Button 
            onPress={onClose} 
            variant="ghost"
            ref={cancelRef}
            _hover={{ bg: "transparent" }} 
            _pressed={{ bg: "transparent" }}
          >
            <Icon as={Ionicons} name="close" size={6} color="gray.500" />
          </Button>
        </AlertDialog.Header>
          <AlertDialog.Body>
            <VStack space={4}>
              <FormControl isInvalid={!!errors.license}>
                <FormControl.Label>Driving License</FormControl.Label>
                <Input
                  value={formData.drivingLicense}
                  onChangeText={(value) => setFormData(prev => ({...prev, drivingLicense: value}))}
                  placeholder="Enter license number"
                  size="lg"
                  borderRadius="lg"
                />
              </FormControl>

              <FormControl isInvalid={!!errors.phone}>
                <FormControl.Label>Phone Number</FormControl.Label>
                <Input
                  value={formData.driverPhone?.toString()}
                  onChangeText={(value) => setFormData(prev => ({...prev, driverPhone: value}))}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                  size="lg"
                  borderRadius="lg"
                />
                <FormControl.ErrorMessage>{errors.phone}</FormControl.ErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.email}>
                <FormControl.Label>Email</FormControl.Label>
                <Input
                  value={formData.email}
                  onChangeText={(value) => setFormData(prev => ({...prev, email: value}))}
                  placeholder="Enter email"
                  keyboardType="email-address"
                  size="lg"
                  borderRadius="lg"
                />
                <FormControl.ErrorMessage>{errors.email}</FormControl.ErrorMessage>
              </FormControl>
            </VStack>
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button.Group space={2}>
              <Button
                bg="black"
                isLoading={isLoading}
                onPress={handleSave}
              >
                Save Changes
              </Button>
            </Button.Group>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog>
    );
  };

  const renderProfileHeader = () => (
    <Box style={styles.headerSection}>
      <HStack alignItems="center" p={4}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Driver Profile</Text>
        <Button
          variant="ghost"
          onPress={() => {
            setEditFormData({
              drivingLicense: driverData.drivingLicense || '',
              driverPhone: driverData.driverPhone || '',
              email: driverData.email || ''
            });
            setIsEditModalOpen(true);
          }}
          leftIcon={<Icon as={MaterialIcons} name="edit" size="sm" />}
          _text={{ color: 'gray.600' }}
        >
          Edit
        </Button>
      </HStack>
      
      <VStack space={4} alignItems="center" pb={6}>
        <Box
          bg="black"
          width={40}
          height={40}
          borderRadius={20}
          alignItems="center"
          justifyContent="center"
          shadow={2}
        >
          <Text style={styles.avatarText}>{getInitials()}</Text>
        </Box>
        
        <VStack alignItems="center" space={2}>
          <Text style={styles.userName}>
            {driverData.driverFirstName || 'Driver'} {driverData.driverLastName || ''}
          </Text>
          <HStack space={2} alignItems="center">
            <Icon as={FontAwesome5} name="star" size={3} color="yellow.400" />
            <Text style={styles.ratingText}>
              {calculateAverageRating(reviews)} Rating
            </Text>
          </HStack>
          
          {driverData.licenseVerified ? (
            <Box
              bg="green.50"
              px={3}
              py={1}
              borderRadius="full"
              mt={1}
            >
              <HStack space={2} alignItems="center">
                <Icon as={MaterialIcons} name="verified" size="xs" color="green.600" />
                <Text fontSize="xs" fontWeight="600" color="green.600">
                  VERIFIED DRIVER
                </Text>
              </HStack>
            </Box>
          ) : (
            <Box
              bg="orange.50"
              px={3}
              py={1}
              borderRadius="full"
              mt={1}
            >
              <HStack space={2} alignItems="center">
                <Icon as={MaterialIcons} name="error-outline" size="xs" color="orange.600" />
                <Text fontSize="xs" fontWeight="600" color="orange.600">
                  VERIFICATION PENDING
                </Text>
              </HStack>
            </Box>
          )}
        </VStack>
      </VStack>
    </Box>
  );

  if (loading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" bg="white" safeArea>
        <Spinner size="lg" color="black" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" bg="white" safeArea>
        <Text color="red.500">{error}</Text>
        <Button 
          mt={4} 
          onPress={fetchDriverData}
          variant="subtle"
        >
          Retry
        </Button>
      </Box>
    );
  }

  const getInitials = () => {
    const firstInitial = driverData.driverFirstName ? driverData.driverFirstName[0] : '';
    const lastInitial = driverData.driverLastName ? driverData.driverLastName[0] : '';
    return (firstInitial + lastInitial).toUpperCase() || 'D';
  };

  const DocumentItem = ({ document }) => (
    <Box 
      bg="white" 
      borderRadius="lg"
      mb={4}
      overflow="hidden"
      {...(Platform.OS === 'web' 
        ? { 
            shadow: 2,
            borderWidth: 1,
            borderColor: 'gray.200'
          } 
        : {
            elevation: 2,
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
          }
      )}
    >
      <HStack 
        space={4} 
        p={4} 
        alignItems="center"
      >
        <Box 
          bg="gray.100" 
          p={3} 
          borderRadius="full"
        >
          <Icon 
            as={MaterialIcons} 
            name="description" 
            size={6} 
            color="gray.600" 
          />
        </Box>
        
        <VStack flex={1} space={1}>
          <Text 
            fontWeight="bold" 
            fontSize="md" 
            numberOfLines={1}
          >
            {document.documentId || document.name}
          </Text>
          <Text 
            fontSize="xs" 
            color="gray.500"
          >
            {document.documentType || document.type} • {document.documentStatus || 'Pending'}
          </Text>
        </VStack>
        
        <Menu
          w="190"
          trigger={triggerProps => (
            <Pressable 
              accessibilityLabel="More options menu" 
              {...triggerProps}
              p={2}
            >
              <Icon 
                as={MaterialIcons}
                name="more-vert"
                size={6}
                color="gray.600"
              />
            </Pressable>
          )}
        >
          <Menu.Item
            onPress={() => handleEditDocument(document.id)}
            isLoading={editingDocumentId === document.id}
          >
            <HStack alignItems="center" space={2}>
              <Icon as={MaterialIcons} name="edit" size={5} color="gray.600" />
              <Text>Edit</Text>
            </HStack>
          </Menu.Item>
          
          <Menu.Item
            onPress={() => {
              Alert.alert(
                'Delete Document',
                'Are you sure you want to delete this document?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Delete', 
                    onPress: () => handleDeleteDocument(document.id),
                    style: 'destructive'
                  }
                ]
              );
            }}
          >
            <HStack alignItems="center" space={2}>
              <Icon as={MaterialIcons} name="delete-outline" size={5} color="red.500" />
              <Text color="red.500">Delete</Text>
            </HStack>
          </Menu.Item>
        </Menu>
      </HStack>
    </Box>
  );

  const StatusItem = ({ label, value, reversed = false, message }) => {
    const statusColor = reversed ? (value ? '#22C55E' : '#EF4444') : (value ? '#22C55E' : '#EF4444');
    const statusText = reversed ? (value ? 'Active' : 'Banned') : (value ? 'Yes' : 'No');
    const iconName = value ? 'check-circle' : 'x-circle';

    return (
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{
          type: 'timing',
          duration: 500,
          easing: Easing.out(Easing.ease),
        }}
      >
        <Box
          bg="white"
          p={4}
          borderRadius="2xl"
          borderWidth={1}
          borderColor={value ? 'gray.100' : 'red.100'}
          mb={4}
          style={{
            shadowColor: statusColor,
            shadowOffset: {
              width: 0,
              height: 4,
            },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <HStack justifyContent="space-between" alignItems="center" mb={2}>
            <HStack space={2} alignItems="center">
              <Icon 
                as={FontAwesome5} 
                name={iconName} 
                size={5} 
                color={statusColor}
              />
              <Text fontSize="md" fontWeight="600" color="gray.700">
                {label}
              </Text>
            </HStack>
            <Box
              bg={value ? 'green.50' : 'red.50'}
              px={3}
              py={1}
              borderRadius="full"
            >
              <Text
                fontSize="sm"
                fontWeight="600"
                color={statusColor}
              >
                {statusText}
              </Text>
            </Box>
          </HStack>
          <Text fontSize="sm" color="gray.500" ml={7}>
            {message}
          </Text>
        </Box>
      </MotiView>
    );
  };

  const InfoItem = ({ icon, label, value }) => (
    <Box width="48%">
      <HStack 
        space={3} 
        alignItems="center" 
        bg="gray.50" 
        p={3} 
        borderRadius="xl"
        borderWidth={1}
        borderColor="gray.100"
      >
        <Box
          bg="white"
          p={2}
          borderRadius="lg"
          shadow={1}
        >
          <Icon as={FontAwesome5} name={icon} size={4} color="gray.700" />
        </Box>
        <VStack flex={1}>
          <Text fontSize="xs" color="gray.500" fontWeight="medium">{label.toUpperCase()}</Text>
          <Text 
            fontSize="sm" 
            fontWeight="600" 
            color="gray.700" 
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{ width: label === 'EMAIL' ? 100 : 'auto' }}
          >
            {value}
          </Text>
        </VStack>
      </HStack>
    </Box>
  );

  return (
    <>
      <ScrollView 
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {renderProfileHeader()}

        <VStack space={6} mt={6} px={4}>
          <Box style={styles.cardContainer}>
            <HStack justifyContent="space-between" alignItems="center" mb={6}>
              <HStack space={3} alignItems="center">
                <Icon 
                  as={FontAwesome5} 
                  name="user-circle" 
                  size={5} 
                  color="gray.700"
                />
                <Text style={styles.cardTitle}>Personal Information</Text>
              </HStack>
            </HStack>
            <VStack space={4}>
              <HStack justifyContent="space-between">
                <InfoItem icon="phone" label="Phone" value={driverData.driverPhone} />
                <InfoItem icon="envelope" label="Email" value={driverData.email} />
              </HStack>
              <HStack justifyContent="space-between">
                <InfoItem icon="birthday-cake" label="Age" value={`${calculateAge(driverData.dateOfBirth)} years`} />
                <InfoItem icon="venus-mars" label="Gender" value={driverData.gender} />
              </HStack>
            </VStack>
          </Box>

          <Box style={styles.cardContainer}>
            <HStack justifyContent="space-between" alignItems="center" mb={6}>
              <HStack space={3} alignItems="center">
                <Icon 
                  as={FontAwesome5} 
                  name="car" 
                  size={5} 
                  color="gray.700"
                />
                <Text style={styles.cardTitle}>Vehicle Information</Text>
              </HStack>
              <Button
                onPress={() => navigation.navigate('AddVehicle')}
                leftIcon={<Icon as={FontAwesome5} name="plus" size="xs" />}
                isLoading={uploadLoading}
                size="sm"
                bg="black"
                _text={{ color: 'white', fontSize: 'xs', fontWeight: '600' }}
              >
                Add New
              </Button>
            </HStack>
            {driverData.vehicles && driverData.vehicles.length > 0 ? (
              driverData.vehicles.map((vehicle, index) => (
                <MotiView
                  key={index}
                  from={{ opacity: 0, translateY: 20 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{
                    type: 'timing',
                    duration: 500,
                    delay: index * 100,
                  }}
                >
                  <Box
                    bg="gray.50"
                    p={4}
                    borderRadius="xl"
                    borderWidth={1}
                    borderColor="gray.100"
                    mb={4}
                  >
                    <HStack justifyContent="space-between" alignItems="center" mb={4}>
                      <HStack space={3} alignItems="center">
                        <Box
                          bg="white"
                          p={2}
                          borderRadius="lg"
                          shadow={1}
                        >
                          <Icon 
                            as={FontAwesome5} 
                            name={vehicle.type === 'Car' ? 'car' : 'motorcycle'} 
                            size={5} 
                            color="gray.700" 
                          />
                        </Box>
                        <VStack>
                          <Text fontSize="md" fontWeight="600" color="gray.700">
                            {vehicle.make} {vehicle.model}
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            {vehicle.vehicleNumber}
                          </Text>
                        </VStack>
                      </HStack>
                      {vehicle.isDefault && (
                        <Box
                          bg="black"
                          px={2}
                          py={1}
                          borderRadius="full"
                        >
                          <Text fontSize="2xs" color="white" fontWeight="600">
                            DEFAULT
                          </Text>
                        </Box>
                      )}
                    </HStack>
                    <HStack space={4}>
                      <HStack space={2} alignItems="center">
                        <Icon as={FontAwesome5} name="calendar" size={3} color="gray.500" />
                        <Text fontSize="sm" color="gray.600">{vehicle.year}</Text>
                      </HStack>
                      <HStack space={2} alignItems="center">
                        <Icon as={FontAwesome5} name="palette" size={3} color="gray.500" />
                        <Text fontSize="sm" color="gray.600">{vehicle.color}</Text>
                      </HStack>
                      <HStack space={2} alignItems="center">
                        <Icon as={FontAwesome5} name="users" size={3} color="gray.500" />
                        <Text fontSize="sm" color="gray.600">{vehicle.capacity} seats</Text>
                      </HStack>
                    </HStack>
                  </Box>
                </MotiView>
              ))
            ) : (
              <Box
                bg="gray.50"
                p={6}
                borderRadius="xl"
                borderWidth={1}
                borderColor="gray.100"
                alignItems="center"
              >
                <Icon 
                  as={FontAwesome5} 
                  name="car" 
                  size={8} 
                  color="gray.400" 
                  mb={3}
                />
                <Text style={styles.noVehicleText}>
                  No vehicle yet? Time to add your eco-friendly ride! 🚗
                </Text>
                <Button
                  onPress={() => navigation.navigate('AddVehicle')}
                  mt={4}
                  size="sm"
                  bg="black"
                  _text={{ color: 'white' }}
                  leftIcon={<Icon as={FontAwesome5} name="plus" size="xs" />}
                >
                  Add Your First Vehicle
                </Button>
              </Box>
            )}
          </Box>

          <Box style={styles.cardContainer}>
            <HStack justifyContent="space-between" alignItems="center" mb={6}>
              <HStack space={3} alignItems="center">
                <Icon 
                  as={FontAwesome5} 
                  name="file-alt" 
                  size={5} 
                  color="gray.700"
                />
                <Text style={styles.cardTitle}>My Documents</Text>
              </HStack>
              <Button
                onPress={handleUploadDocument}
                leftIcon={<Icon as={MaterialIcons} name="upload-file" size="sm" />}
                isLoading={uploadLoading}
                size="sm"
                bg="black"
                _text={{ color: 'white', fontSize: 'xs', fontWeight: '600' }}
              >
                Upload New
              </Button>
            </HStack>
            
            <VStack space={3}>
              {documents.length === 0 ? (
                <Box 
                  bg="gray.50"
                  p={6}
                  borderRadius="xl"
                  borderWidth={1}
                  borderColor="gray.100"
                  alignItems="center"
                >
                  <Icon 
                    as={MaterialIcons} 
                    name="cloud-upload" 
                    size={12} 
                    color="gray.400" 
                    mb={3}
                  />
                  <Text style={styles.noDocumentsText}>
                    No documents uploaded yet.{'\n'}
                    Start by uploading your driver's license! 📄
                  </Text>
                </Box>
              ) : (
                <>
                  {paginatedDocuments.map((doc) => (
                    <DocumentItem 
                      key={doc.id} 
                      document={doc} 
                    />
                  ))}
                  {documents.length > documentsPerPage && (
                    <HStack 
                      space={1} 
                      justifyContent="center" 
                      mt={4}
                      bg="gray.100"
                      p={1}
                      borderRadius="full"
                      alignSelf="center"
                    >
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Pressable
                          key={page}
                          onPress={() => handlePageChange(page)}
                          bg={currentPage === page ? "black" : "transparent"}
                          px={4}
                          py={2}
                          borderRadius="full"
                          style={{
                            minWidth: 40,
                            alignItems: 'center'
                          }}
                        >
                          <Text
                            color={currentPage === page ? "white" : "gray.600"}
                            fontSize="sm"
                            fontWeight="600"
                          >
                            {page}
                          </Text>
                        </Pressable>
                      ))}
                    </HStack>
                  )}
                </>
              )}
            </VStack>
          </Box>

          <Box style={[styles.cardContainer, styles.accountStatusCard]}>
            <HStack justifyContent="space-between" alignItems="center" mb={6}>
              <HStack space={3} alignItems="center">
                <Icon 
                  as={FontAwesome5} 
                  name="shield-alt" 
                  size={5} 
                  color="gray.700"
                />
                <Text style={styles.cardTitle}>Account Status</Text>
              </HStack>
              <Box
                bg={!driverData.banned ? 'green.50' : 'red.50'}
                px={3}
                py={1}
                borderRadius="full"
              >
                <Text
                  fontSize="xs"
                  fontWeight="600"
                  color={!driverData.banned ? 'green.600' : 'red.600'}
                >
                  {!driverData.banned ? 'VERIFIED' : 'ATTENTION NEEDED'}
                </Text>
              </Box>
            </HStack>
            <VStack space={4}>
              <StatusItem 
                label="License Verification" 
                value={driverData.licenseVerified} 
                message={driverData.licenseVerified ? "You're all set to hit the road! 🚗" : "Let's get that license verified ASAP! 📄"}
              />
              <StatusItem 
                label="Account Standing" 
                value={!driverData.banned} 
                reversed 
                message={!driverData.banned ? "Keep up the great work! ⭐" : "Contact support to resolve any issues. 🔧"}
              />
            </VStack>
          </Box>
        </VStack>
      </ScrollView>
      
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleUpdateProfile}
        initialData={editFormData}
        isLoading={isEditing}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F7FAFC',
  },
  headerSection: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EAECEF',
    paddingBottom: 16,
    ...Platform.select({
      web: {
        borderBottomWidth: 1,
        borderBottomColor: '#EAECEF',
      },
      default: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
      }
    })
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A202C',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A202C',
    letterSpacing: 0.5,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
  motto: {
    fontSize: 16,
    fontWeight: '500',
    color: '#718096',
    fontStyle: 'italic',
    marginTop: 8,
  },
  cardContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    shadowColor: "#718096",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    letterSpacing: 0.5,
  },
  noVehicleText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#718096',
    textAlign: 'center',
    lineHeight: 22,
  },
  noDocumentsText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#718096',
    textAlign: 'center',
    lineHeight: 22,
  },
  accountStatusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: "#718096",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
});

export default DriverProfileScreen;