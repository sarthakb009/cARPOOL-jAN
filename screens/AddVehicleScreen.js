import React, { useState, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Dimensions, Animated, TouchableOpacity, Pressable, Alert } from 'react-native';
import { Box, VStack, HStack, Text, Input, Button, Icon, useToast, Switch, FormControl, Heading, Select, CheckIcon, Spinner } from 'native-base';
import { Ionicons, MaterialIcons} from '@expo/vector-icons';
import { BackButton } from '../components/sharedComponents';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MotiView } from 'moti';
import * as DocumentPicker from 'expo-document-picker';
import Modal from 'react-native-modal';

const { width } = Dimensions.get('window');

// Generate years from 1990 to current year
const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1989 }, (_, i) => (currentYear - i).toString());

// Seat options for cars
const seatOptions = [
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '6', label: '6' },
  { value: '7', label: '7' },
];

// Add this constant at the top with other constants
const DOCUMENT_TYPES = [
  { type: 'AADHAR_CARD', label: 'Aadhar Card', description: 'Upload your Aadhar card', required: true },
  { type: 'DRIVING_LICENSE', label: 'Driving License', description: 'Upload your driving license', required: true },
  { type: 'RC_BOOK', label: 'RC Book', description: 'Upload vehicle registration certificate', required: false },
];

// Custom Toggle Component
const CustomToggle = ({ isChecked, onToggle }) => {
  return (
    <Pressable onPress={() => onToggle(!isChecked)}>
      <Box
        width="52px"
        height="28px"
        borderRadius="full"
        backgroundColor={isChecked ? '#1A1A1A' : '#E0E0E0'}
        justifyContent="center"
        padding="2px"
      >
        <MotiView
          from={{
            translateX: isChecked ? 0 : 24,
          }}
          animate={{
            translateX: isChecked ? 24 : 0,
          }}
          transition={{
            type: 'spring',
            stiffness: 250,
            damping: 25,
          }}
        >
          <Box
            width="24px"
            height="24px"
            borderRadius="full"
            backgroundColor="white"
            shadow={3}
          />
        </MotiView>
      </Box>
    </Pressable>
  );
};

// Add new component for document upload modal
const DocumentUploadModal = ({ isVisible, onClose, onUpload, loading }) => (
  <Modal
    isVisible={isVisible}
    onBackdropPress={onClose}
    animationIn="slideInUp"
    animationOut="slideOutDown"
    backdropTransitionOutTiming={0}
    style={{ margin: 0, justifyContent: 'flex-end' }}
  >
    <Box 
      bg="white" 
      style={{
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
      }}
    >
      <VStack space={4}>
        <HStack justifyContent="space-between" alignItems="center" mb={2}>
          <Text fontSize="xl" fontWeight="600" color="gray.800">Upload Documents</Text>
          <Pressable onPress={onClose}>
            <Icon as={Ionicons} name="close" size={6} color="gray.500" />
          </Pressable>
        </HStack>

        <Text fontSize="sm" color="gray.500" mb={2}>
          Please upload the required documents for verification.
        </Text>
        
        <VStack space={3}>
          {DOCUMENT_TYPES.map((doc) => (
            <Pressable
              key={doc.type}
              onPress={() => onUpload(doc.type)}
              style={{
                backgroundColor: '#F9FAFB',
                padding: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#E5E7EB',
              }}
            >
              <HStack space={4} alignItems="center">
                <Box
                  style={{
                    backgroundColor: '#000',
                    padding: 12,
                    borderRadius: 12,
                  }}
                >
                  {doc.type === 'AADHAR_CARD' && (
                    <Icon as={MaterialIcons} name="badge" size={6} color="white" />
                  )}
                  {doc.type === 'DRIVING_LICENSE' && (
                    <Icon as={MaterialIcons} name="drive-eta" size={6} color="white" />
                  )}
                  {doc.type === 'RC_BOOK' && (
                    <Icon as={MaterialIcons} name="description" size={6} color="white" />
                  )}
                </Box>
                <VStack flex={1}>
                  <HStack alignItems="center" space={2}>
                    <Text fontWeight="600" fontSize="md" color="gray.800">{doc.label}</Text>
                    {doc.required && (
                      <Text color="red.500" fontSize="sm">*</Text>
                    )}
                  </HStack>
                  <Text fontSize="sm" color="gray.500" mt={1}>
                    {doc.description}
                  </Text>
                </VStack>
                <Box style={{
                  backgroundColor: '#F3F4F6',
                  padding: 8,
                  borderRadius: 20,
                }}>
                  <Icon as={MaterialIcons} name="arrow-forward-ios" size={4} color="gray.600" />
                </Box>
              </HStack>
            </Pressable>
          ))}
        </VStack>

        {loading && (
          <HStack space={2} justifyContent="center" mt={4}>
            <Spinner color="black" />
            <Text color="gray.600">Uploading document...</Text>
          </HStack>
        )}
      </VStack>
    </Box>
  </Modal>
);

const AddVehicleScreen = ({ navigation, route }) => {
  // Add new state for selected documents
  const [selectedDocuments, setSelectedDocuments] = useState({});
  
  const [vehicleData, setVehicleData] = useState({
    vehicleNumber: '',
    drivingLicense: '',
    capacity: '',
    model: '',
    make: '',
    year: '',
    type: '', // This should be either 'Car' or 'Bike'
    color: '',
    smoking: false,
    music: false,
    ac: false,
    storage: false,
    luggage: false,
    isDefault: false
  });
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const [documents, setDocuments] = useState([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const vehicleId = route.params?.vehicleId;

  useEffect(() => {
    if (vehicleId) {
      fetchVehicleDetails();
    }
  }, [vehicleId]);

  useEffect(() => {
    if (vehicleData.type === 'Bike') {
      setVehicleData(prev => ({ ...prev, capacity: '1' }));
    }
  }, [vehicleData.type]);

  const fetchVehicleDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/vehicle/getById?id=${vehicleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Infer vehicle type based on capacity
      const inferredType = response.data.vehicleCapacity === 1 ? 'Bike' : 'Car';

      setVehicleData(prevData => ({
        ...prevData,
        ...response.data,
        type: inferredType, // Set the inferred type
        capacity: response.data.vehicleCapacity ? response.data.vehicleCapacity.toString() : '',
        year: response.data.year ? response.data.year.toString() : '' // Convert year to string
      }));
    } catch (error) {
      console.error('Error fetching vehicle details:', error);
      toast.show({
        title: "Error",
        description: "Failed to load vehicle details",
        status: "error"
      });
    }
  };

  const handleChange = (name, value) => {
    setVehicleData(prev => ({ ...prev, [name]: value }));
  };

  // const handleDocumentUpload = async (documentType) => {
  //   try {
  //     console.log('Starting document selection process...');

  //     const result = await DocumentPicker.getDocumentAsync({
  //       type: ['application/pdf', 'image/*'],
  //       copyToCacheDirectory: true,
  //     });

  //     console.log('Document picker result:', result);

  //     if (!result.canceled && result.assets && result.assets[0]) {
  //       const file = result.assets[0];
        
  //       // Store selected document in state without uploading
  //       setSelectedDocuments(prev => ({
  //         ...prev,
  //         [documentType]: file
  //       }));

  //       // Update documents display
  //       setDocuments(prev => [...prev.filter(doc => doc.type !== documentType), {
  //         id: `temp_${Date.now()}`,
  //         name: file.name,
  //         type: documentType,
  //         status: 'Selected',
  //         uploadDate: new Date().toISOString()
  //       }]);

  //       setModalVisible(false);
  //       toast.show({
  //         title: "Success",
  //         description: "Document selected successfully!",
  //         status: "success"
  //       });
  //     }
  //   } catch (err) {
  //     console.error('Error selecting document:', err);
  //     toast.show({
  //       title: "Selection Error",
  //       description: "Failed to select document",
  //       status: "error"
  //     });
  //   }
  // };

  const uploadDocuments = async (vehicleId) => {
    const token = await AsyncStorage.getItem('userToken');
    const driverId = await AsyncStorage.getItem('driverId');

    for (const [documentType, file] of Object.entries(selectedDocuments)) {
      try {
        // Generate a unique documentId
        const uniqueDocId = `${Date.now()}_${file.name}`;

        // Create document record
        const createResponse = await axios.post(
          `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/documents/add?driverId=${driverId}&vehicleId=${vehicleId}`,
          {
            documentType: documentType,
            documentId: uniqueDocId
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const documentId = createResponse.data;

        // Upload file
        const formData = new FormData();
        formData.append('file', {
          uri: file.uri,
          type: file.mimeType,
          name: file.name,
        });

        await axios.put(
          `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/documents/uploadFile?documentId=${documentId}&driverId=${driverId}`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${token}`,
            }
          }
        );
      } catch (error) {
        console.error('Error uploading document:', error);
        throw error;
      }
    }
  };

  const handleSubmit = async () => {
    // Check for required documents
    const requiredDocTypes = DOCUMENT_TYPES.filter(doc => doc.required).map(doc => doc.type);
    const selectedDocTypes = Object.keys(selectedDocuments);
    const missingRequiredDocs = requiredDocTypes.filter(type => !selectedDocTypes.includes(type));

    if (missingRequiredDocs.length > 0) {
      toast.show({
        title: "Missing Documents",
        description: "Please select all required documents before submitting",
        status: "warning"
      });
      return;
    }

    if (!vehicleData.vehicleNumber || !vehicleData.drivingLicense || !vehicleData.type) {
      toast.show({
        title: "Incomplete Information",
        description: "Please fill in all required fields",
        status: "warning"
      });
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const driverId = await AsyncStorage.getItem('driverId');
      
      if (!driverId) {
        throw new Error('Driver ID not found');
      }

      const payload = {
        ...vehicleData,
        riderId: parseInt(driverId),
        vehicletype: vehicleData.type,
        capacity: vehicleData.type === 'Bike' ? 1 : parseInt(vehicleData.capacity) || null,
        vehicleCapacity: vehicleData.type === 'Bike' ? 1 : parseInt(vehicleData.capacity) || null,
        year: vehicleData.year ? parseInt(vehicleData.year) : null
      };

      let responseVehicleId;
      if (vehicleId) {
        await axios.put(`http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/vehicle/edit?id=${vehicleId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        responseVehicleId = vehicleId;
      } else {
        const response = await axios.post('http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/vehicle/create', payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        responseVehicleId = response.data.id; // Adjust this based on your API response structure
      }

      // Upload documents after vehicle creation/update
      await uploadDocuments(responseVehicleId);

      toast.show({
        title: "Success",
        description: vehicleId ? "Vehicle updated successfully" : "Vehicle added successfully",
        status: "success"
      });
      navigation.goBack();
    } catch (error) {
      console.error('Error submitting vehicle:', error);
      toast.show({
        title: "Error",
        description: error.message === 'Driver ID not found' 
          ? "Driver ID not found. Please log in again." 
          : "Failed to submit vehicle information",
        status: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUpload = async (documentType) => {
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
        const driverId = await AsyncStorage.getItem('driverId');
        const vehicleId = route.params?.vehicleId; // Ensure vehicleId is retrieved correctly

        if (!vehicleId) {
          throw new Error('Vehicle ID is not defined. Please check the route parameters.');
        }

        const token = await AsyncStorage.getItem('userToken'); // Retrieve token here

        // Generate a unique documentId
        const uniqueDocId = `${Date.now()}_${file.name}`;

        console.log('Creating document record with payload:', {
          documentType: documentType,
          documentId: uniqueDocId,
          driverId: driverId,
          vehicleId: vehicleId
        });

        try {
          const createResponse = await axios.post(
            `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/documents/add?driverId=${driverId}&vehicleId=${vehicleId}`,
            {
              documentType: documentType,
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
            type: documentType,
            status: 'Pending Verification',
            uploadDate: new Date().toISOString()
          }]);

          toast.show({
            title: "Success",
            description: "Document uploaded successfully!",
            status: "success"
          });
          setModalVisible(false);
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
      toast.show({
        title: "Upload Error",
        description: `Failed to upload document: ${err.response?.data?.message || err.message}`,
        status: "error"
      });
    } finally {
      setUploadLoading(false);
    }
  };

  const handleUploadDocument = () => {
    setModalVisible(true);
  };

  const handleDeleteDocument = (documentId) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    toast.show({
      title: "Success",
      description: "Document removed successfully",
      status: "success"
    });
  };

  const DocumentItem = ({ document }) => (
    <Box 
      style={{
        backgroundColor: '#F9FAFB',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
      }}
    >
      <HStack space={3} alignItems="center">
        <Box
          style={{
            backgroundColor: '#000',
            padding: 8,
            borderRadius: 8,
          }}
        >
          <Icon as={MaterialIcons} name="description" size={5} color="white" />
        </Box>
        
        <VStack flex={1}>
          <Text fontWeight="600" fontSize="sm" color="gray.800">
            {document.name}
          </Text>
          <Text fontSize="xs" color="gray.500" mt={1}>
            {document.type} • {document.status}
          </Text>
        </VStack>
        
        <Icon 
          as={MaterialIcons}
          name="check-circle"
          size={5}
          color="green.500"
        />
      </HStack>
    </Box>
  );

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const vehicleTypes = [
    { type: 'Car', icon: 'car-sport-outline' },
    { type: 'Bike', icon: 'bicycle-outline' },
  ];

  const features = [
    { name: 'smoking', label: 'Smoking', icon: 'smoking-outline' },
    { name: 'music', label: 'Music', icon: 'musical-notes-outline' },
    { name: 'ac', label: 'AC', icon: 'thermometer-outline' },
    { name: 'storage', label: 'Storage', icon: 'cube-outline' },
    { name: 'luggage', label: 'Luggage', icon: 'briefcase-outline' },
  ];

  const renderVehicleTypeItem = (item) => (
    <TouchableOpacity key={item.type} onPress={() => handleChange('type', item.type)}>
      <Box
        bg={vehicleData.type === item.type ? '#1A1A1A' : '#F5F5F5'}
        p={4}
        borderRadius={16}
        alignItems="center"
        justifyContent="center"
        width={width * 0.35}
        height={width * 0.28}
        mr={4}
        style={{
          shadowColor: vehicleData.type === item.type ? "#000000" : "transparent",
          shadowOffset: {
            width: 0,
            height: 4,
          },
          shadowOpacity: 0.15,
          shadowRadius: 6,
          elevation: vehicleData.type === item.type ? 8 : 0,
          borderWidth: vehicleData.type === item.type ? 0 : 1,
          borderColor: '#E0E0E0',
        }}
      >
        <Icon
          as={Ionicons}
          name={item.icon}
          size={8}
          color={vehicleData.type === item.type ? 'white' : '#1A1A1A'}
          style={{
            opacity: vehicleData.type === item.type ? 1 : 0.6
          }}
        />
        <Text
          mt={3}
          fontSize="sm"
          fontWeight="600"
          letterSpacing={0.5}
          color={vehicleData.type === item.type ? 'white' : '#1A1A1A'}
          style={{
            opacity: vehicleData.type === item.type ? 1 : 0.7
          }}
        >
          {item.type}
        </Text>
      </Box>
    </TouchableOpacity>
  );

  const renderFeatureItem = (item) => (
    <TouchableOpacity 
      key={item.name} 
      onPress={() => handleChange(item.name, !vehicleData[item.name])}
    >
      <Box
        bg={vehicleData[item.name] ? '#1A1A1A' : '#F5F5F5'}
        p={3}
        borderRadius={14}
        alignItems="center"
        justifyContent="center"
        width={width * 0.22}
        height={width * 0.22}
        mr={3}
        style={{
          shadowColor: vehicleData[item.name] ? "#000000" : "transparent",
          shadowOffset: {
            width: 0,
            height: 3,
          },
          shadowOpacity: 0.12,
          shadowRadius: 5,
          elevation: vehicleData[item.name] ? 6 : 0,
          borderWidth: vehicleData[item.name] ? 0 : 1,
          borderColor: '#E0E0E0',
        }}
      >
        <Icon
          as={Ionicons}
          name={item.icon}
          size={6}
          color={vehicleData[item.name] ? 'white' : '#1A1A1A'}
          style={{
            opacity: vehicleData[item.name] ? 1 : 0.6
          }}
        />
        <Text
          mt={2}
          fontSize="xs"
          fontWeight="500"
          letterSpacing={0.3}
          color={vehicleData[item.name] ? 'white' : '#1A1A1A'}
          style={{
            opacity: vehicleData[item.name] ? 1 : 0.7
          }}
        >
          {item.label}
        </Text>
      </Box>
    </TouchableOpacity>
  );

  const documentSection = (
    <Box style={styles.card}>
      <Heading size="sm" mb={4} style={styles.sectionHeading}>Vehicle Documents</Heading>
      <VStack space={4}>
        <HStack justifyContent="space-between" alignItems="center">
          <VStack flex={1}>
            
            <Text fontSize="xs" color="gray.500" mt={1}>
              Please upload the required documents for verification.
            </Text>
          </VStack>
          <Button
            onPress={() => setModalVisible(true)}
            size="sm"
            bg="black"
            _pressed={{ bg: 'gray.800' }}
            leftIcon={<Icon as={MaterialIcons} name="upload-file" size="sm" color="white" />}
            isLoading={uploadLoading}
          >
            Upload
          </Button>
        </HStack>

        {documents.length > 0 ? (
          <VStack space={3}>
            {documents.map((doc) => (
              <DocumentItem key={doc.id} document={doc} />
            ))}
          </VStack>
        ) : (
          <Box style={styles.emptyStateContainer}>
            <Icon as={MaterialIcons} name="cloud-upload" size={12} color="gray.400" mb={3} />
            <Text fontSize="sm" color="gray.500" textAlign="center" fontWeight="500">
              No documents uploaded yet.{'\n'}
              Please upload the required documents.
            </Text>
          </Box>
        )}
      </VStack>
    </Box>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Animated.View style={{ opacity: fadeAnim }}>
        <Box mb={8} style={styles.headerContainer}>
          <BackButton onPress={() => navigation.goBack()} />
          <HStack justifyContent="space-between" alignItems="center" mt={4}>
            <Heading size="xl" fontWeight="bold" style={styles.mainHeading}>
              {vehicleId ? 'Edit' : 'Add'} Vehicle
            </Heading>
            {/* Comment out default toggle */}
            {/*<HStack alignItems="center" space={3}>
              <Text fontWeight="500" style={styles.defaultText}>Default</Text>
              <CustomToggle
                isChecked={vehicleData.isDefault}
                onToggle={(value) => handleChange('isDefault', value)}
              />
            </HStack>*/}
          </HStack>
        </Box>
        <VStack space={6}>
          <Box style={styles.cardPrimary}>
            <Heading size="sm" mb={6} style={styles.sectionHeading}>Vehicle Type</Heading>
            <FormControl isRequired>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {vehicleTypes.map(renderVehicleTypeItem)}
              </ScrollView>
            </FormControl>
            {vehicleData.type === 'Car' && (
              <FormControl mt={6}>
                <FormControl.Label _text={styles.label}>Seats Capacity</FormControl.Label>
                <HStack space={3} mt={2}>
                  {seatOptions.map((option) => (
                    <Pressable
                      key={option.value}
                      onPress={() => handleChange('capacity', option.value)}
                    >
                      <Box
                        style={[
                          styles.seatOption,
                          vehicleData.capacity === option.value && styles.seatOptionSelected
                        ]}
                      >
                        <Text
                          style={[
                            styles.seatOptionText,
                            vehicleData.capacity === option.value && styles.seatOptionTextSelected
                          ]}
                        >
                          {option.label}
                        </Text>
                      </Box>
                    </Pressable>
                  ))}
                </HStack>
              </FormControl>
            )}
          </Box>

          <Box style={styles.card}>
            <Heading size="sm" mb={4} style={styles.sectionHeading}>Basic Information</Heading>
            <VStack space={5}>
              <FormControl isRequired>
                <FormControl.Label _text={styles.label}>Vehicle Number</FormControl.Label>
                <Input
                  value={vehicleData.vehicleNumber}
                  onChangeText={(value) => handleChange('vehicleNumber', value)}
                  style={styles.input}
                  placeholder="MH 23 AS 2343"
                  InputLeftElement={<Icon as={Ionicons} name="car-outline" size={5} ml={3} color="gray.500" />}
                />
              </FormControl>
              <FormControl isRequired>
                <FormControl.Label _text={styles.label}>Driving License</FormControl.Label>
                <Input
                  value={vehicleData.drivingLicense}
                  onChangeText={(value) => handleChange('drivingLicense', value)}
                  style={styles.input}
                  placeholder="ADSFDSFS"
                  InputLeftElement={<Icon as={Ionicons} name="document-outline" size={5} ml={3} color="gray.500" />}
                />
              </FormControl>
            </VStack>
          </Box>

          <Box style={styles.card}>
            <Heading size="sm" mb={4} style={styles.sectionHeading}>Vehicle Details</Heading>
            <VStack space={5}>
              <HStack space={4}>
                <FormControl flex={1}>
                  <FormControl.Label _text={styles.label}>Make</FormControl.Label>
                  <Input
                    value={vehicleData.make}
                    onChangeText={(value) => handleChange('make', value)}
                    style={styles.input}
                    placeholder="Toyota"
                    InputLeftElement={<Icon as={Ionicons} name="construct-outline" size={5} ml={3} color="gray.500" />}
                  />
                </FormControl>
                <FormControl flex={1}>
                  <FormControl.Label _text={styles.label}>Model</FormControl.Label>
                  <Input
                    value={vehicleData.model}
                    onChangeText={(value) => handleChange('model', value)}
                    style={styles.input}
                    placeholder="Camry"
                    InputLeftElement={<Icon as={Ionicons} name="car-sport-outline" size={5} ml={3} color="gray.500" />}
                  />
                </FormControl>
              </HStack>
              <HStack space={4}>
                <FormControl flex={1}>
                  <FormControl.Label _text={styles.label}>Year</FormControl.Label>
                  <Select
                    selectedValue={vehicleData.year}
                    onValueChange={(value) => handleChange('year', value)}
                    style={styles.select}
                    borderWidth={1}
                    borderColor="#E0E0E0"
                    backgroundColor="#FAFAFA"
                    height={45}
                    borderRadius={12}
                    placeholder="Select Year"
                    _selectedItem={{
                      bg: "gray.200",
                      endIcon: <CheckIcon size={4} color="#1A1A1A" />
                    }}
                  >
                    {years.map((year) => (
                      <Select.Item key={year} label={year} value={year} />
                    ))}
                  </Select>
                </FormControl>
                <FormControl flex={1}>
                  <FormControl.Label _text={styles.label}>Color</FormControl.Label>
                  <Input
                    value={vehicleData.color}
                    onChangeText={(value) => handleChange('color', value)}
                    style={styles.input}
                    placeholder="Black"
                    InputLeftElement={<Icon as={Ionicons} name="color-palette-outline" size={5} ml={3} color="gray.500" />}
                  />
                </FormControl>
              </HStack>
            </VStack>
          </Box>

          <Box style={styles.cardFeatures}>
            <Heading size="sm" mb={4} style={styles.sectionHeading}>Features</Heading>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {features.map(renderFeatureItem)}
            </ScrollView> 
          </Box>

          {documentSection}

          <Button
            onPress={handleSubmit}
            isLoading={loading}
            style={styles.submitButton}
            _pressed={{ bg: 'gray.800' }}
          >
            <HStack alignItems="center" space={2}>
              <Icon as={Ionicons} name={vehicleId ? "save-outline" : "add-circle-outline"} size="sm" color="white" />
              <Text style={styles.submitButtonText}>{vehicleId ? 'Update' : 'Add'} Vehicle</Text>
            </HStack>
          </Button>
        </VStack>
      </Animated.View>
      <DocumentUploadModal
        isVisible={isModalVisible}
        onClose={() => setModalVisible(false)}
        onUpload={handleDocumentUpload}
        loading={uploadLoading}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#F8F9FA',
  },
  headerContainer: {
    backgroundColor: '#F8F9FA',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EAECEF',
  },
  mainHeading: {
    color: '#1A1A1A',
    letterSpacing: 0.5,
    fontSize: 28,
  },
  defaultText: {
    color: '#4A4A4A',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  cardPrimary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#EAECEF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#EAECEF',
  },
  cardFeatures: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#EAECEF',
  },
  sectionHeading: {
    color: '#1A1A1A',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontSize: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4A4A4A',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  input: {
    height: 45,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    paddingLeft: 45,
  },
  inputPrimary: {
    height: 45,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#D0D0D0',
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    paddingLeft: 45,
  },
  submitButton: {
    backgroundColor: '#1A1A1A',
    height: 54,
    borderRadius: 27,
    marginTop: 20,
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    letterSpacing: 0.5,
  },
  seatOption: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  seatOptionSelected: {
    backgroundColor: '#1A1A1A',
    borderColor: '#1A1A1A',
  },
  seatOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A4A4A',
  },
  seatOptionTextSelected: {
    color: 'white',
  },
  select: {
    fontSize: 14,
    paddingLeft: 12,
  },
  emptyStateContainer: {
    backgroundColor: '#F9FAFB',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  uploadButton: {
    backgroundColor: '#000',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default AddVehicleScreen;