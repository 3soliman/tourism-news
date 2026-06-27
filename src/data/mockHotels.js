export const DESTINATIONS = [
  'Dubai', 'Paris', 'London', 'New York', 'Tokyo', 'Barcelona', 'Rome', 'Cairo', 'Istanbul', 'Bangkok'
];

export const AMENITY_OPTIONS = [
  { id: 'wifi', label: 'Free WiFi' },
  { id: 'pool', label: 'Swimming Pool' },
  { id: 'spa', label: 'Spa' },
  { id: 'parking', label: 'Free Parking' },
  { id: 'gym', label: 'Fitness Center' },
  { id: 'restaurant', label: 'Restaurant' },
  { id: 'ac', label: 'Air Conditioning' },
  { id: 'pet', label: 'Pet Friendly' }
];

export const BREAKFAST_OPTIONS = [
  { id: 'none', label: 'No breakfast' },
  { id: 'continental', label: 'Continental' },
  { id: 'buffet', label: 'Buffet' },
  { id: 'included', label: 'Breakfast included' }
];

export const mockHotels = [
  {
    id: 'h1',
    name: 'Almohit View Resort',
    city: 'Dubai',
    country: 'UAE',
    address: 'Sheikh Zayed Road, Downtown',
    stars: 5,
    rating: 4.8,
    reviewCount: 1240,
    priceFrom: 299,
    popularity: 95,
    type: 'luxury',
    breakfast: 'buffet',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80',
      'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&q=80',
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80'
    ],
    amenities: ['wifi', 'pool', 'spa', 'parking', 'gym', 'restaurant', 'ac'],
    description: 'Iconic luxury tower with panoramic city views, Michelin-star dining, and an award-winning spa.',
    rooms: [
      { id: 'r1', name: 'Deluxe King Room', capacity: 2, price: 299, size: '42 m²', bed: '1 King', breakfast: 'continental', refundable: true, images: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80'] },
      { id: 'r2', name: 'Executive Suite', capacity: 3, price: 459, size: '68 m²', bed: '1 King + Sofa', breakfast: 'buffet', refundable: true, images: ['https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&q=80'] },
      { id: 'r3', name: 'Royal Penthouse', capacity: 4, price: 899, size: '120 m²', bed: '2 King', breakfast: 'included', refundable: false, images: ['https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600&q=80'] }
    ],
    reviews: [
      { id: 1, author: 'Sarah M.', score: 5, date: '2025-04-12', text: 'Stunning views and impeccable service. The spa was incredible.' },
      { id: 2, author: 'Ahmed K.', score: 4.5, date: '2025-03-28', text: 'Great location near the metro. Breakfast buffet had excellent variety.' }
    ]
  },
  {
    id: 'h2',
    name: 'almohit View Resort',
    city: 'Barcelona',
    country: 'Spain',
    address: 'Passeig Marítim 42',
    stars: 5,
    rating: 4.9,
    reviewCount: 2103,
    priceFrom: 349,
    popularity: 98,
    type: 'beach',
    breakfast: 'included',
    image: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&q=80',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80'
    ],
    amenities: ['wifi', 'pool', 'restaurant', 'parking', 'ac', 'gym'],
    description: 'Beachfront resort steps from the Mediterranean with infinity pool and seafood restaurant.',
    rooms: [
      { id: 'r4', name: 'Sea View Double', capacity: 2, price: 349, size: '35 m²', bed: '1 Double', breakfast: 'included', refundable: true, images: ['https://images.unsplash.com/photo-1598928506311-c55ded353306?w=600&q=80'] },
      { id: 'r5', name: 'Family Suite', capacity: 4, price: 520, size: '55 m²', bed: '2 Double', breakfast: 'included', refundable: true, images: ['https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=600&q=80'] }
    ],
    reviews: [
      { id: 3, author: 'Maria L.', score: 5, date: '2025-05-01', text: 'Perfect beach holiday. Kids loved the pool.' }
    ]
  },
  {
    id: 'h3',
    name: 'Mountain Retreat Lodge',
    city: 'Tokyo',
    country: 'Japan',
    address: 'Hakone Hills, 15 min from station',
    stars: 4,
    rating: 4.7,
    priceFrom: 259,
    popularity: 72,
    type: 'nature',
    breakfast: 'continental',
    image: 'https://images.unsplash.com/photo-1592229505726-ca121762d5a1?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1592229505726-ca121762d5a1?w=800&q=80'],
    amenities: ['wifi', 'spa', 'restaurant', 'parking', 'ac'],
    description: 'Tranquil mountain lodge with onsen baths and traditional kaiseki dining.',
    rooms: [
      { id: 'r6', name: 'Standard Tatami', capacity: 2, price: 259, size: '28 m²', bed: '2 Futon', breakfast: 'continental', refundable: true, images: ['https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&q=80'] },
      { id: 'r7', name: 'Garden View Room', capacity: 2, price: 310, size: '32 m²', bed: '1 Queen', breakfast: 'continental', refundable: false, images: ['https://images.unsplash.com/photo-1596394514703-bf9ebad7d54e?w=600&q=80'] }
    ],
    reviews: [{ id: 4, author: 'Kenji T.', score: 4.5, date: '2025-02-14', text: 'Peaceful and authentic. Onsen was relaxing.' }]
  },
  {
    id: 'h4',
    name: 'City Center Hotel',
    city: 'Paris',
    country: 'France',
    address: '8 Rue de Rivoli',
    stars: 4,
    rating: 4.6,
    reviewCount: 890,
    priceFrom: 199,
    popularity: 88,
    type: 'city',
    breakfast: 'continental',
    image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80'],
    amenities: ['wifi', 'restaurant', 'ac', 'gym'],
    description: 'Boutique hotel in the heart of Paris, walking distance to the Louvre and Seine.',
    rooms: [
      { id: 'r8', name: 'Classic Double', capacity: 2, price: 199, size: '22 m²', bed: '1 Double', breakfast: 'none', refundable: true, images: ['https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&q=80'] },
      { id: 'r9', name: 'Eiffel View Suite', capacity: 2, price: 389, size: '40 m²', bed: '1 King', breakfast: 'continental', refundable: true, images: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80'] }
    ],
    reviews: [{ id: 5, author: 'Claire D.', score: 4, date: '2025-01-20', text: 'Great location, rooms a bit small but charming.' }]
  },
  {
    id: 'h5',
    name: 'Royal Palace Hotel',
    city: 'London',
    country: 'UK',
    address: 'Park Lane, Mayfair',
    stars: 5,
    rating: 4.9,
    reviewCount: 1567,
    priceFrom: 459,
    popularity: 92,
    type: 'luxury',
    breakfast: 'buffet',
    image: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&q=80'],
    amenities: ['wifi', 'pool', 'spa', 'parking', 'gym', 'restaurant', 'ac', 'pet'],
    description: 'Historic five-star palace hotel with afternoon tea and butler service.',
    rooms: [
      { id: 'r10', name: 'Heritage Room', capacity: 2, price: 459, size: '38 m²', bed: '1 King', breakfast: 'buffet', refundable: false, images: ['https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600&q=80'] }
    ],
    reviews: [{ id: 6, author: 'James W.', score: 5, date: '2025-04-05', text: 'Unforgettable luxury experience.' }]
  },
  {
    id: 'h6',
    name: 'Budget Inn Express',
    city: 'New York',
    country: 'USA',
    address: 'Times Square Area',
    stars: 3,
    rating: 4.2,
    reviewCount: 432,
    priceFrom: 89,
    popularity: 65,
    type: 'budget',
    breakfast: 'none',
    image: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&q=80'],
    amenities: ['wifi', 'ac'],
    description: 'Affordable clean rooms in Manhattan, ideal for short city breaks.',
    rooms: [
      { id: 'r11', name: 'Economy Twin', capacity: 2, price: 89, size: '18 m²', bed: '2 Twin', breakfast: 'none', refundable: true, images: ['https://images.unsplash.com/photo-1598928506311-c55ded353306?w=600&q=80'] },
      { id: 'r12', name: 'Standard Queen', capacity: 2, price: 119, size: '20 m²', bed: '1 Queen', breakfast: 'continental', refundable: true, images: ['https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&q=80'] }
    ],
    reviews: [{ id: 7, author: 'Mike R.', score: 4, date: '2025-03-10', text: 'Good value for NYC. Small rooms but central.' }]
  },
  {
    id: 'h7',
    name: 'Nile Riverside Hotel',
    city: 'Cairo',
    country: 'Egypt',
    address: 'Corniche El Nil',
    stars: 4,
    rating: 4.5,
    reviewCount: 678,
    priceFrom: 145,
    popularity: 70,
    type: 'city',
    breakfast: 'buffet',
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80'],
    amenities: ['wifi', 'pool', 'restaurant', 'parking', 'ac', 'gym'],
    description: 'Riverside hotel with rooftop pool and views of the Nile and pyramids.',
    rooms: [
      { id: 'r13', name: 'Nile View King', capacity: 2, price: 145, size: '30 m²', bed: '1 King', breakfast: 'buffet', refundable: true, images: ['https://images.unsplash.com/photo-1596394514703-bf9ebad7d54e?w=600&q=80'] }
    ],
    reviews: [{ id: 8, author: 'Omar H.', score: 4.5, date: '2025-02-22', text: 'Amazing rooftop views at sunset.' }]
  },
  {
    id: 'h8',
    name: 'Bosphorus Boutique',
    city: 'Istanbul',
    country: 'Turkey',
    address: 'Sultanahmet District',
    stars: 4,
    rating: 4.7,
    reviewCount: 945,
    priceFrom: 175,
    popularity: 80,
    type: 'city',
    breakfast: 'included',
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80'],
    amenities: ['wifi', 'restaurant', 'spa', 'ac'],
    description: 'Historic boutique hotel near Hagia Sophia with Turkish breakfast included.',
    rooms: [
      { id: 'r14', name: 'Sultan Room', capacity: 2, price: 175, size: '25 m²', bed: '1 Double', breakfast: 'included', refundable: true, images: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80'] }
    ],
    reviews: [{ id: 9, author: 'Elif Y.', score: 5, date: '2025-04-18', text: 'Authentic charm and wonderful staff.' }]
  },
  {
    id: 'h9',
    name: 'Siam Garden Resort',
    city: 'Bangkok',
    country: 'Thailand',
    address: 'Sukhumvit Soi 11',
    stars: 4,
    rating: 4.4,
    reviewCount: 512,
    priceFrom: 95,
    popularity: 75,
    type: 'budget',
    breakfast: 'continental',
    image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80'],
    amenities: ['wifi', 'pool', 'restaurant', 'gym', 'ac'],
    description: 'Tropical garden resort in bustling Bangkok with pool bar and Thai massage.',
    rooms: [
      { id: 'r15', name: 'Garden Double', capacity: 2, price: 95, size: '24 m²', bed: '1 Double', breakfast: 'continental', refundable: true, images: ['https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=600&q=80'] }
    ],
    reviews: [{ id: 10, author: 'Lisa P.', score: 4, date: '2025-01-08', text: 'Great pool and friendly staff.' }]
  },
  {
    id: 'h10',
    name: 'Colosseum View Inn',
    city: 'Rome',
    country: 'Italy',
    address: 'Via dei Fori Imperiali',
    stars: 3,
    rating: 4.3,
    reviewCount: 389,
    priceFrom: 128,
    popularity: 68,
    type: 'city',
    breakfast: 'continental',
    image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80'],
    amenities: ['wifi', 'restaurant', 'ac'],
    description: 'Charming inn with terrace views of ancient Rome landmarks.',
    rooms: [
      { id: 'r16', name: 'Terrace Double', capacity: 2, price: 128, size: '20 m²', bed: '1 Double', breakfast: 'continental', refundable: false, images: ['https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&q=80'] }
    ],
    reviews: [{ id: 11, author: 'Marco B.', score: 4, date: '2025-03-15', text: 'Unbeatable location for sightseeing.' }]
  }
];

export const getHotelById = (id) => mockHotels.find((h) => h.id === id);

export const getFeaturedHotels = () => [...mockHotels].sort((a, b) => b.popularity - a.popularity).slice(0, 6);
