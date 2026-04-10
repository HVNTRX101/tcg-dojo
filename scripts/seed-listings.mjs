/**
 * Seed script — populates Firestore `listings` collection with test data.
 * Run: node scripts/seed-listings.mjs
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyB0GI8obJHK1CIe3IlRj1Cy9JemzQPpQGE',
  authDomain: 'tcg-dojo.firebaseapp.com',
  projectId: 'tcg-dojo',
  storageBucket: 'tcg-dojo.firebasestorage.app',
  messagingSenderId: '906186864465',
  appId: '1:906186864465:web:44516685bf1bdbe1e10570',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const listings = [
  // Pokemon
  {
    cardId: 'pkmn-charizard-base',
    cardName: 'Charizard',
    gameType: 'Pokemon',
    condition: 'LP',
    price: 34999,
    quantity: 1,
    sellerId: 'seller-001',
    sellerName: 'PokeVault',
    images: ['https://images.pokemontcg.io/base1/4_hires.png'],
    status: 'available',
    createdAt: Timestamp.fromDate(new Date('2026-04-01')),
  },
  {
    cardId: 'pkmn-pikachu-promo',
    cardName: 'Pikachu (Promo)',
    gameType: 'Pokemon',
    condition: 'NM',
    price: 1499,
    quantity: 3,
    sellerId: 'seller-002',
    sellerName: 'CardDen',
    images: ['https://images.pokemontcg.io/sm35/27_hires.png'],
    status: 'available',
    createdAt: Timestamp.fromDate(new Date('2026-04-02')),
  },
  {
    cardId: 'pkmn-blastoise-base',
    cardName: 'Blastoise',
    gameType: 'Pokemon',
    condition: 'MP',
    price: 8999,
    quantity: 1,
    sellerId: 'seller-003',
    sellerName: 'MintedCollect',
    images: ['https://images.pokemontcg.io/base1/2_hires.png'],
    status: 'available',
    createdAt: Timestamp.fromDate(new Date('2026-04-03')),
  },
  {
    cardId: 'pkmn-mewtwo-base',
    cardName: 'Mewtwo',
    gameType: 'Pokemon',
    condition: 'NM',
    price: 5999,
    quantity: 2,
    sellerId: 'seller-001',
    sellerName: 'PokeVault',
    images: ['https://images.pokemontcg.io/base1/10_hires.png'],
    status: 'available',
    createdAt: Timestamp.fromDate(new Date('2026-04-04')),
  },
  // MTG
  {
    cardId: 'mtg-black-lotus',
    cardName: 'Black Lotus',
    gameType: 'MTG',
    condition: 'HP',
    price: 499900,
    quantity: 1,
    sellerId: 'seller-004',
    sellerName: 'AlphaRing',
    images: [],
    status: 'available',
    createdAt: Timestamp.fromDate(new Date('2026-04-01')),
  },
  {
    cardId: 'mtg-lightning-bolt',
    cardName: 'Lightning Bolt',
    gameType: 'MTG',
    condition: 'NM',
    price: 299,
    quantity: 8,
    sellerId: 'seller-005',
    sellerName: 'DraftHouse',
    images: [],
    status: 'available',
    createdAt: Timestamp.fromDate(new Date('2026-04-05')),
  },
  {
    cardId: 'mtg-sol-ring',
    cardName: 'Sol Ring',
    gameType: 'MTG',
    condition: 'LP',
    price: 199,
    quantity: 4,
    sellerId: 'seller-005',
    sellerName: 'DraftHouse',
    images: [],
    status: 'available',
    createdAt: Timestamp.fromDate(new Date('2026-04-06')),
  },
  // Yu-Gi-Oh
  {
    cardId: 'ygo-blue-eyes',
    cardName: 'Blue-Eyes White Dragon (LOB-001)',
    gameType: 'Yu-Gi-Oh',
    condition: 'LP',
    price: 7999,
    quantity: 1,
    sellerId: 'seller-006',
    sellerName: 'DuelZone',
    images: [],
    status: 'available',
    createdAt: Timestamp.fromDate(new Date('2026-04-03')),
  },
  {
    cardId: 'ygo-dark-magician',
    cardName: 'Dark Magician (LOB-005)',
    gameType: 'Yu-Gi-Oh',
    condition: 'NM',
    price: 2499,
    quantity: 2,
    sellerId: 'seller-006',
    sellerName: 'DuelZone',
    images: [],
    status: 'available',
    createdAt: Timestamp.fromDate(new Date('2026-04-07')),
  },
  // Lorcana
  {
    cardId: 'lcn-elsa-snowqueen',
    cardName: "Elsa - Snow Queen",
    gameType: 'Lorcana',
    condition: 'NM',
    price: 3499,
    quantity: 1,
    sellerId: 'seller-007',
    sellerName: 'InkwellTrades',
    images: [],
    status: 'available',
    createdAt: Timestamp.fromDate(new Date('2026-04-08')),
  },
  {
    cardId: 'lcn-simba-protector',
    cardName: 'Simba - Protective Cub',
    gameType: 'Lorcana',
    condition: 'MP',
    price: 899,
    quantity: 5,
    sellerId: 'seller-007',
    sellerName: 'InkwellTrades',
    images: [],
    status: 'available',
    createdAt: Timestamp.fromDate(new Date('2026-04-08')),
  },
];

async function seed() {
  console.log(`Seeding ${listings.length} listings to Firestore...`);
  const col = collection(db, 'listings');

  for (const listing of listings) {
    const doc = await addDoc(col, listing);
    console.log(`  ✓ ${listing.cardName} (${listing.gameType}) — ${doc.id}`);
  }

  console.log('\nDone. All listings seeded.');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
