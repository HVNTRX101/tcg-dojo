import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from './config';
import type { Listing } from '../../types';

export async function getAllListings(cardName?: string): Promise<Listing[]> {
  const q = query(
    collection(db, 'listings'),
    where('status', '==', 'available'),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  const listings = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() ?? new Date(),
  })) as Listing[];

  if (cardName) {
    const lower = cardName.toLowerCase();
    return listings.filter(l => l.cardName.toLowerCase().includes(lower));
  }

  return listings;
}
