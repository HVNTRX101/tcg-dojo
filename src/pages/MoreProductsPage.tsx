import { Card } from '../components/ui/card';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { ChevronRight } from 'lucide-react';
import { Header } from '../components/Header';

const popularGames = [
  {
    name: 'Magic: The Gathering',
    image: 'https://images.unsplash.com/photo-1644007824843-37e9069834bd?w=300',
  },
  {
    name: 'Yu-Gi-Oh!',
    image: 'https://images.unsplash.com/photo-1674106890436-368ce68342f1?w=300',
  },
  { name: 'Pokémon', image: 'https://images.unsplash.com/photo-1664997296099-5a0b63ab0196?w=300' },
  {
    name: 'Disney Lorcana',
    image: 'https://images.unsplash.com/photo-1542393545-10f5cde2c810?w=300',
  },
  {
    name: 'One Piece',
    image: 'https://images.unsplash.com/photo-1578632292335-df3abbb0d586?w=300',
  },
  { name: 'Digimon', image: 'https://images.unsplash.com/photo-1613047630550-f340fe5f96fb?w=300' },
];

const giftCardsSupplies = [
  'TCGplayer Gift Cards',
  'Card Sleeves',
  'Deck Boxes',
  'Binders & Pages',
  'Playmats',
  'Dice & Counters',
];

const allOtherGames = [
  'Altered TCG',
  'Argent Saga',
  'Avatar: The Last Airbender',
  'Battle Spirits',
  'Bleach',
  'Cardfight!! Vanguard',
  'Chrono Clash',
  'Cyberpunk 2077',
  'Dragon Ball Super',
  'Dragoborne',
  'DuelMasters',
  'Elestrals',
  'Final Fantasy',
  'Fire Emblem Cipher',
  'Flesh and Blood',
  'Force of Will',
  'Future Card Buddyfight',
  'Gates of Valhalla',
  'Grand Archive',
  'Gundam',
  'Harry Potter',
  'Keyforge',
  'Legend of the Five Rings',
  'MetaZoo',
  'Naruto',
  'Netrunner',
  'Ashes Reborn',
  'Star Wars Unlimited',
  'The Spoils',
  'Transformers',
  'Union Arena',
  'Universus',
  'Vampire: The Eternal Struggle',
  'Warhammer 40K',
  'Warhammer Age of Sigmar',
  'Weiss Schwarz',
  'World of Warcraft',
];

export default function MoreProductsPage() {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <h1 className="text-3xl mb-2">More Products & Options</h1>
            <p className="text-gray-600">
              Explore our complete catalog of trading card games and gaming supplies
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
          {/* Popular Games */}
          <section>
            <h2 className="text-2xl mb-6">Popular Games</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {popularGames.map((game, index) => (
                <Card
                  key={index}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                >
                  <ImageWithFallback
                    src={game.image}
                    alt={game.name}
                    className="w-full h-32 object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="p-4">
                    <h3 className="text-sm text-center">{game.name}</h3>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* Gift Cards & Supplies */}
          <section>
            <h2 className="text-2xl mb-6">Gift Cards & Supplies</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {giftCardsSupplies.map((item, index) => (
                <Card
                  key={index}
                  className="p-6 hover:shadow-lg transition-shadow cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <h3>{item}</h3>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* TCGplayer Gift Card Promo */}
          <section>
            <Card className="overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 md:p-12">
              <div className="max-w-2xl">
                <h2 className="text-3xl mb-4">Give the Gift of Gaming</h2>
                <p className="text-lg mb-6 text-white/90">
                  TCGplayer Gift Cards are the perfect gift for any trading card game enthusiast.
                  Available in any amount from $10 to $500.
                </p>
                <div className="flex gap-4">
                  <button className="bg-white text-blue-600 px-6 py-3 rounded hover:bg-gray-100 transition-colors">
                    Purchase Gift Card
                  </button>
                  <button className="border-2 border-white text-white px-6 py-3 rounded hover:bg-white/10 transition-colors">
                    Learn More
                  </button>
                </div>
              </div>
            </Card>
          </section>

          {/* All Other Games */}
          <section>
            <h2 className="text-2xl mb-6">All Other Games</h2>
            <Card className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-4">
                {allOtherGames.map((game, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between hover:text-blue-600 cursor-pointer group"
                  >
                    <span>{game}</span>
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                ))}
              </div>
            </Card>
          </section>

          {/* Bottom CTA */}
          <section>
            <Card className="p-8 text-center bg-gray-100">
              <h3 className="text-xl mb-3">Can&apos;t Find What You&apos;re Looking For?</h3>
              <p className="text-gray-600 mb-6">
                Contact our customer support team and we&apos;ll help you find the perfect cards or
                supplies.
              </p>
              <button className="bg-blue-600 text-white px-8 py-3 rounded hover:bg-blue-700 transition-colors">
                Contact Support
              </button>
            </Card>
          </section>
        </div>
      </div>
    </>
  );
}
