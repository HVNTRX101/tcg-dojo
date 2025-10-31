import React from 'react';
import { Facebook, Twitter, Youtube, Instagram } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Shop Section */}
          <div>
            <h3 className="text-white mb-4">Shop</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white">Magic: The Gathering</a></li>
              <li><a href="#" className="hover:text-white">Yu-Gi-Oh!</a></li>
              <li><a href="#" className="hover:text-white">Cardfight!! Vanguard</a></li>
              <li><a href="#" className="hover:text-white">Pokémon</a></li>
              <li><a href="#" className="hover:text-white">Flesh and Blood</a></li>
              <li><a href="#" className="hover:text-white">Disney Lorcana</a></li>
              <li><a href="#" className="hover:text-white">One Piece</a></li>
              <li><a href="#" className="hover:text-white">Digimon</a></li>
              <li><a href="#" className="hover:text-white">Star Wars: Unlimited</a></li>
              <li><a href="#" className="hover:text-white">Dragon Ball Super</a></li>
              <li><a href="#" className="hover:text-white">WoW TCG</a></li>
              <li><a href="#" className="hover:text-white">Supplies</a></li>
            </ul>
          </div>

          {/* Buy Section */}
          <div>
            <h3 className="text-white mb-4">Buy</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white">TCGplayer Safeguard</a></li>
              <li><a href="#" className="hover:text-white">TCGplayer Direct</a></li>
              <li><a href="#" className="hover:text-white">Collection Tracker</a></li>
              <li><a href="#" className="hover:text-white">Cart Optimizer</a></li>
              <li><a href="#" className="hover:text-white">Fulfillment Solutions</a></li>
              <li><a href="#" className="hover:text-white">Affiliate Program</a></li>
              <li><a href="#" className="hover:text-white">Instant Accreditation Program</a></li>
              <li><a href="#" className="hover:text-white">News</a></li>
            </ul>

            <h3 className="text-white mt-6 mb-4">Sell With Us</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white">Sell With TCGplayer</a></li>
              <li><a href="#" className="hover:text-white">Price Data API's</a></li>
              <li><a href="#" className="hover:text-white">TCGplayer Direct</a></li>
            </ul>
          </div>

          {/* Help & Content Section */}
          <div>
            <h3 className="text-white mb-4">Help & Content</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white">Customer Service</a></li>
              <li><a href="#" className="hover:text-white">Help Center</a></li>
              <li><a href="#" className="hover:text-white">Accessibility</a></li>
              <li><a href="#" className="hover:text-white">TCGplayer Safeguard</a></li>
              <li><a href="#" className="hover:text-white">Leave Us Feedback</a></li>
            </ul>

            <h3 className="text-white mt-6 mb-4">Articles & Decks</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white">TCGplayer Content</a></li>
              <li><a href="#" className="hover:text-white">Infinite</a></li>
              <li><a href="#" className="hover:text-white">Magic Deck Builder</a></li>
              <li><a href="#" className="hover:text-white">Yu-Gi-Oh! Deck Builder</a></li>
              <li><a href="#" className="hover:text-white">Pokémon Deck Builder</a></li>
              <li><a href="#" className="hover:text-white">More Articles & Decks</a></li>
            </ul>
          </div>

          {/* About TCGplayer Section */}
          <div>
            <h3 className="text-white mb-4">About TCGplayer</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white">About Us</a></li>
              <li><a href="#" className="hover:text-white">Our Core Values</a></li>
              <li><a href="#" className="hover:text-white">Careers</a></li>
              <li><a href="#" className="hover:text-white">Press Center</a></li>
            </ul>

            {/* Newsletter Signup */}
            <div className="mt-6">
              <p className="text-sm mb-3">Get the latest strategies, promos, and more from your favorite games.</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Your Email"
                  className="flex-1 px-3 py-2 rounded bg-gray-800 border border-gray-700 text-sm focus:outline-none focus:border-blue-500"
                />
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm">
                  Subscribe
                </button>
              </div>
            </div>

            {/* App Download */}
            <div className="mt-6">
              <p className="text-sm mb-3">Get The App</p>
              <p className="text-xs text-gray-400 mb-3">
                Organize your collection, find cards, and sell with the TCGplayer app.
              </p>
              <div className="flex gap-2">
                <img
                  src="https://via.placeholder.com/120x40/000000/FFFFFF/?text=QR+Code"
                  alt="QR Code"
                  className="w-20 h-20 bg-white rounded"
                />
              </div>
            </div>

            {/* Social Media */}
            <div className="mt-6 flex gap-4">
              <a href="#" className="hover:text-white">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-white">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-white">
                <Youtube className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-white">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Banner */}
        <div className="border-t border-gray-800 pt-8 mb-8">
          <div className="flex items-center justify-between bg-gradient-to-r from-red-600 to-pink-600 rounded-lg p-6">
            <div>
              <h3 className="text-white text-xl mb-2">TCGPLAYER CORE VALUE #4</h3>
              <p className="text-white text-3xl">INSPIRED BY PASSION</p>
            </div>
            <div className="flex gap-4">
              <Facebook className="w-8 h-8 text-white" />
              <Twitter className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        {/* Copyright and Legal */}
        <div className="border-t border-gray-800 pt-8 text-xs text-gray-500 space-y-4">
          <p>
            All rights reserved. All trademarks are property of their respective owners in the US and other countries. Some
            geospatial data on this website is provided by geonames.org. The literal and graphical information presented on
            this site about Magic: The Gathering, Yu-Gi-Oh!, Pokémon, and any other games and products are trademarked
            and copyrighted by their respective companies. This website is not produced by, endorsed by, supported by, or
            affiliated with these card game companies.
          </p>
          <p>
            Magic: The Gathering®, the mana symbols, the tap symbol and all other related images are owned by Wizards of
            the Coast®. Yu-Gi-Oh!® and all related images are owned by Konami Digital Entertainment®. Pokémon® and all
            related images are owned by Nintendo®. Cardfight!! Vanguard and Weiss Schwarz are trademarks or registered
            trademarks of Bushiroad Inc. Wizards of the Coast, Konami Digital Entertainment, Nintendo, and Bushiroad are
            not affiliated with, endorsed, sponsored, or specifically approved by TCGplayer, and TCGplayer assumes no
            responsibility for any content or materials provided by these companies.
          </p>
          <p className="text-sm">
            ©2025 TCGplayer, Inc. All Rights Reserved.
          </p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white">Privacy Policy</a>
            <a href="#" className="hover:text-white">Terms of Service</a>
            <a href="#" className="hover:text-white">Accessibility</a>
            <a href="#" className="hover:text-white">Do Not Sell or Share My Personal Information</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
