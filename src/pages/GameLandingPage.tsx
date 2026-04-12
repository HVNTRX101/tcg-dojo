import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ChevronRight } from 'lucide-react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { generateCardPlaceholder } from '../utils/cardPlaceholder';

function placeholderGameName(displayName: string): string {
  if (displayName === 'Pokémon') return 'Pokemon';
  if (displayName === 'One Piece Card Game') return 'One Piece';
  if (displayName === 'Digimon Card Game') return 'Digimon';
  return displayName;
}

const gameData = {
  magic: {
    name: 'Magic: The Gathering',
    color: 'from-purple-600 to-blue-600',
    sets: [
      {
        name: 'Foundations',
        code: 'FDN',
        releaseDate: 'November 2024',
      },
      {
        name: 'Duskmourn',
        code: 'DSK',
        releaseDate: 'September 2024',
      },
      {
        name: 'Bloomburrow',
        code: 'BLB',
        releaseDate: 'August 2024',
      },
      {
        name: 'Modern Horizons 3',
        code: 'MH3',
        releaseDate: 'June 2024',
      },
    ],
    decks: [
      { name: 'Commander Decks', count: 450 },
      { name: 'Standard Decks', count: 280 },
      { name: 'Modern Decks', count: 320 },
      { name: 'Pioneer Decks', count: 195 },
    ],
    articles: [
      {
        title: 'Foundations Set Review: Best Cards for Standard',
        date: 'Nov 15, 2024',
        author: 'Emma Chen',
      },
      {
        title: 'Commander Deck Tech: Zur the Enchanter',
        date: 'Nov 12, 2024',
        author: 'Mike Sullivan',
      },
      {
        title: 'Modern Meta Report - Week of November 8',
        date: 'Nov 8, 2024',
        author: 'Sarah Johnson',
      },
    ],
  },
  yugioh: {
    name: 'Yu-Gi-Oh!',
    color: 'from-red-600 to-purple-600',
    sets: [
      {
        name: 'Rarity Collection 2',
        code: 'RC02',
        releaseDate: 'November 2024',
      },
      {
        name: 'Legacy of Destruction',
        code: 'LEDE',
        releaseDate: 'October 2024',
      },
      {
        name: 'The Infinite Forbidden',
        code: 'INFO',
        releaseDate: 'July 2024',
      },
      {
        name: 'Battles of Legend',
        code: 'BOEL',
        releaseDate: 'June 2024',
      },
    ],
    decks: [
      { name: 'Meta Decks', count: 185 },
      { name: 'Rogue Decks', count: 240 },
      { name: 'Budget Decks', count: 160 },
      { name: 'Casual Decks', count: 310 },
    ],
    articles: [
      {
        title: 'Rarity Collection 2: Top 10 Chase Cards',
        date: 'Nov 14, 2024',
        author: 'Alex Martinez',
      },
      {
        title: 'Snake-Eye Deck Profile - Post Banlist',
        date: 'Nov 10, 2024',
        author: 'Kevin Tran',
      },
      {
        title: 'Budget Deck Guide: Labrynth Under $100',
        date: 'Nov 5, 2024',
        author: 'Rachel Kim',
      },
    ],
  },
  pokemon: {
    name: 'Pokémon',
    color: 'from-blue-500 to-yellow-400',
    sets: [
      {
        name: 'Surging Sparks',
        code: 'SSP',
        releaseDate: 'November 2024',
      },
      {
        name: 'Stellar Crown',
        code: 'SCR',
        releaseDate: 'September 2024',
      },
      {
        name: 'Shrouded Fable',
        code: 'SFA',
        releaseDate: 'August 2024',
      },
      {
        name: 'Twilight Masquerade',
        code: 'TWM',
        releaseDate: 'May 2024',
      },
    ],
    decks: [
      { name: 'Standard Decks', count: 220 },
      { name: 'Expanded Decks', count: 180 },
      { name: 'Budget Decks', count: 145 },
      { name: 'Theme Decks', count: 95 },
    ],
    articles: [
      {
        title: 'Surging Sparks: Secret Rare Pull Rates',
        date: 'Nov 16, 2024',
        author: 'Chris Park',
      },
      {
        title: 'Championship Winning Charizard ex Deck',
        date: 'Nov 11, 2024',
        author: 'Jessica Lee',
      },
      {
        title: 'Investment Guide: Vintage WOTC Cards',
        date: 'Nov 7, 2024',
        author: 'Tom Anderson',
      },
    ],
  },
  lorcana: {
    name: 'Disney Lorcana',
    color: 'from-indigo-600 to-pink-500',
    sets: [
      {
        name: 'Shimmering Skies',
        code: 'SKY',
        releaseDate: 'November 2024',
      },
      {
        name: 'Azurite Sea',
        code: 'AZS',
        releaseDate: 'September 2024',
      },
      {
        name: 'Into the Inklands',
        code: 'ITI',
        releaseDate: 'June 2024',
      },
    ],
    decks: [
      { name: 'Competitive Decks', count: 85 },
      { name: 'Casual Decks', count: 120 },
      { name: 'Budget Decks', count: 65 },
    ],
    articles: [
      { title: 'Shimmering Skies Set Review', date: 'Nov 13, 2024', author: 'Diana Prince' },
      { title: 'Top 5 Amber/Amethyst Decks', date: 'Nov 9, 2024', author: 'Lucas White' },
    ],
  },
  onepiece: {
    name: 'One Piece Card Game',
    color: 'from-orange-500 to-red-600',
    sets: [
      {
        name: 'Pillars of Strength',
        code: 'OP-05',
        releaseDate: 'October 2024',
      },
      {
        name: 'Awakening of the New Era',
        code: 'OP-04',
        releaseDate: 'August 2024',
      },
    ],
    decks: [
      { name: 'Meta Decks', count: 45 },
      { name: 'Starter Decks', count: 30 },
    ],
    articles: [{ title: 'Pillars of Strength Top Cards', date: 'Nov 8, 2024', author: 'Ryan Lee' }],
  },
  digimon: {
    name: 'Digimon Card Game',
    color: 'from-cyan-500 to-blue-700',
    sets: [
      {
        name: 'Across Time',
        code: 'BT-15',
        releaseDate: 'November 2024',
      },
      {
        name: 'Beginning Observer',
        code: 'BT-14',
        releaseDate: 'September 2024',
      },
    ],
    decks: [
      { name: 'Competitive Decks', count: 60 },
      { name: 'Casual Decks', count: 80 },
    ],
    articles: [{ title: 'Across Time Meta Impact', date: 'Nov 12, 2024', author: 'Sam Chen' }],
  },
};

export default function GameLandingPage() {
  const { game } = useParams<{ game: string }>();
  const data = game ? gameData[game as keyof typeof gameData] : undefined;
  const navigate = useNavigate();

  // Redirect to home if game is invalid
  if (!game || !data) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-background">
        {/* Hero Banner */}
        <div className={`bg-gradient-to-r ${data.color} text-white py-16 px-6`}>
          <div className="max-w-7xl mx-auto">
            <h1 className="text-4xl mb-4">{data.name}</h1>
            <p className="text-xl text-white/90">
              Discover cards, build decks, and explore the latest sets
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
          {/* Latest Sets */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl text-foreground">Latest Sets</h2>
              <Button
                variant="link"
                className="text-blue-600 dark:text-blue-400"
                onClick={() => navigate(`/marketplace?game=${game}`)}
              >
                View All Sets <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {data.sets.map((set, index) => (
                <Card
                  key={index}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <ImageWithFallback
                    src={generateCardPlaceholder(set.name, placeholderGameName(data.name), 'Set')}
                    alt={set.name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="mb-1 text-foreground">{set.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{set.code}</p>
                    <p className="text-sm text-muted-foreground">{set.releaseDate}</p>
                    <Button
                      className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                      onClick={() => navigate(`/marketplace?game=${game}&set=${set.code}`)}
                    >
                      Browse Set
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* Featured Banner */}
          <section>
            <div className="relative rounded-lg overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 p-8 md:p-12 text-white shadow-lg">
              <div className="absolute inset-0 bg-black/20 dark:bg-black/35 pointer-events-none" />
              <div className="relative z-10 max-w-2xl">
                <h2 className="text-3xl mb-4 text-white drop-shadow-sm">New Set Just Released!</h2>
                <p className="text-lg mb-6 text-white drop-shadow-sm">
                  Get your hands on the latest {data.sets[0].name} set. Pre-order now and secure
                  your booster boxes!
                </p>
                <Button
                  size="lg"
                  className="bg-white text-blue-600 hover:bg-gray-100 shadow-md"
                  onClick={() => navigate(`/marketplace?game=${game}&set=${data.sets[0].code}`)}
                >
                  Order Now
                </Button>
              </div>
            </div>
          </section>

          {/* Decks */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl text-foreground">Decks</h2>
              <Button
                variant="link"
                className="text-blue-600 dark:text-blue-400"
                onClick={() => navigate(`/marketplace?game=${game}`)}
              >
                View All Decks <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.decks.map((deck, index) => (
                <Card key={index} className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                  <h3 className="mb-2 text-foreground">{deck.name}</h3>
                  <p className="text-2xl text-blue-600 dark:text-blue-400">{deck.count}</p>
                  <p className="text-sm text-muted-foreground">Decks Available</p>
                </Card>
              ))}
            </div>
          </section>

          {/* Articles */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl text-foreground">Latest Articles</h2>
              <Button
                variant="link"
                className="text-blue-600 dark:text-blue-400"
                onClick={() => navigate(`/faq`)}
              >
                View All Articles <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {data.articles.map((article, index) => (
                <Card key={index} className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                  <h3 className="mb-2 line-clamp-2 text-foreground">{article.title}</h3>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{article.author}</span>
                    <span>{article.date}</span>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
