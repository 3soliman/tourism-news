import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where,
  doc,
  getDoc,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../config/firebase';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);

// Authentication functions
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // Get user details from Firestore
    const q = query(collection(db, 'users'), where('uid', '==', userCredential.user.uid));
    const querySnapshot = await getDocs(q);
    let userDetails = {};
    querySnapshot.forEach((doc) => {
      userDetails = doc.data();
    });
    return { success: true, user: { ...userCredential.user, ...userDetails } };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Room functions
export const getAvailableRooms = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'rooms'));
    const rooms = [];
    querySnapshot.forEach((doc) => {
      rooms.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, rooms };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Booking functions
export const createBooking = async (bookingData) => {
  try {
    const docRef = await addDoc(collection(db, 'bookings'), {
      ...bookingData,
      createdAt: new Date()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getUserBookings = async (userId) => {
  try {
    const q = query(collection(db, 'bookings'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const bookings = [];
    querySnapshot.forEach((doc) => {
      bookings.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, bookings };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Initialize sample data
export const initializeSampleData = async () => {
  try {
    // Check if rooms collection already has data
    const roomsSnapshot = await getDocs(collection(db, 'rooms'));
    
    if (roomsSnapshot.empty) {
      // Sample room data with a swimming pool suite
      const sampleRooms = [
        {
          name: 'Deluxe View Suite',
          description: 'Spacious suite with breathtaking ocean views and premium amenities',
          price: 299,
          availability: 'Available',
          features: ['Ocean View', 'King Size Bed', 'Free WiFi', 'Spa Access']
        },
        {
          name: 'Executive Business Room',
          description: 'Perfect for business travelers with workspace and city views',
          price: 189,
          availability: 'Available',
          features: ['City View', 'Queen Size Bed', 'Workspace', 'Free WiFi']
        },
        {
          name: 'Family Paradise Suite',
          description: 'Ideal for families with multiple bedrooms and kid-friendly amenities',
          price: 349,
          availability: 'Available',
          features: ['Multiple Bedrooms', 'Kitchenette', 'Free WiFi', 'Pool Access']
        },
        {
          name: 'Garden View Standard Room',
          description: 'Cozy room with beautiful garden views and essential amenities',
          price: 129,
          availability: 'Available',
          features: ['Garden View', 'Queen Size Bed', 'Free WiFi', 'AC']
        },
        {
          name: 'Luxury Presidential Suite',
          description: 'Ultimate luxury experience with panoramic views and personal butler',
          price: 599,
          availability: 'Limited',
          features: ['Panoramic View', 'King Size Bed', 'Butler Service', 'Private Pool']
        },
        {
          name: 'Cozy Studio Apartment',
          description: 'Compact and comfortable studio with modern amenities',
          price: 99,
          availability: 'Available',
          features: ['Studio Layout', 'Full Size Bed', 'Kitchenette', 'Free WiFi']
        },
        {
          name: 'Swimming Pool Suite',
          description: 'Luxurious suite with direct access to our Olympic-sized swimming pool',
          price: 279,
          availability: 'Available',
          features: ['Pool Access', 'King Size Bed', 'Sun Deck', 'Free WiFi', 'Poolside Service']
        }
      ];

      // Add sample rooms to Firestore
      const batch = writeBatch(db);
      sampleRooms.forEach((room) => {
        const docRef = doc(collection(db, 'rooms'));
        batch.set(docRef, room);
      });
      
      await batch.commit();
      // Sample rooms data initialized successfully
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error initializing sample data:', error);
    return { success: false, error: error.message };
  }
};

export { auth, db };
