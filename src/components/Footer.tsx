import { Link } from 'react-router-dom';
import { Facebook, Twitter, Youtube, Instagram, Smartphone } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Shop Section */}
          <div>
            <h3 className="text-white font-semibold mb-4">Shop</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/games/magic" className="hover:text-white transition-colors">
                  Magic: The Gathering
                </Link>
              </li>
              <li>
                <Link to="/games/yugioh" className="hover:text-white transition-colors">
                  Yu-Gi-Oh!
                </Link>
              </li>
              <li>
                <Link to="/games/pokemon" className="hover:text-white transition-colors">
                  Pokémon
                </Link>
              </li>
              <li>
                <Link to="/games/lorcana" className="hover:text-white transition-colors">
                  Disney Lorcana
                </Link>
              </li>
              <li>
                <Link to="/games/onepiece" className="hover:text-white transition-colors">
                  One Piece
                </Link>
              </li>
              <li>
                <Link to="/games/digimon" className="hover:text-white transition-colors">
                  Digimon
                </Link>
              </li>
              <li>
                <Link to="/marketplace" className="hover:text-white transition-colors">
                  Browse All Cards
                </Link>
              </li>
            </ul>
          </div>

          {/* Buy Section */}
          <div>
            <h3 className="text-white font-semibold mb-4">Buy</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/marketplace" className="hover:text-white transition-colors">
                  Marketplace
                </Link>
              </li>
              <li>
                <Link to="/collection" className="hover:text-white transition-colors">
                  Collection Tracker
                </Link>
              </li>
              <li>
                <Link to="/cart" className="hover:text-white transition-colors">
                  Cart
                </Link>
              </li>
            </ul>

            <h3 className="text-white font-semibold mt-6 mb-4">Sell With Us</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/faq" className="hover:text-white transition-colors">
                  Become a Seller
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-white transition-colors">
                  Seller Guidelines
                </Link>
              </li>
            </ul>
          </div>

          {/* Help & Content Section */}
          <div>
            <h3 className="text-white font-semibold mb-4">Help & Content</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/help" className="hover:text-white transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/help" className="hover:text-white transition-colors">
                  Customer Service
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-white transition-colors">
                  Buyer Protection
                </Link>
              </li>
            </ul>

            <h3 className="text-white font-semibold mt-6 mb-4">Community</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/faq" className="hover:text-white transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-white transition-colors">
                  Deck Guides
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-white transition-colors">
                  Price Trends
                </Link>
              </li>
            </ul>
          </div>

          {/* About TCG Dojo Section */}
          <div>
            <h3 className="text-white font-semibold mb-4">About TCG Dojo</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/faq" className="hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-white transition-colors">
                  Our Mission
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-white transition-colors">
                  Careers
                </Link>
              </li>
            </ul>

            {/* Newsletter Signup */}
            <div className="mt-6">
              <p className="text-sm mb-3">
                Get the latest strategies, promos, and more from your favorite games.
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Your Email"
                  className="flex-1 px-3 py-2 rounded bg-gray-800 border border-gray-700 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                />
                <button className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm transition-colors">
                  Subscribe
                </button>
              </div>
            </div>

            {/* App Download */}
            <div className="mt-6">
              <p className="text-sm mb-3">Get The App</p>
              <div className="flex items-center gap-3 bg-gray-800 rounded-lg p-3">
                <Smartphone className="w-8 h-8 text-orange-400" />
                <div>
                  <p className="text-white text-sm font-medium">TCG Dojo Mobile</p>
                  <p className="text-xs text-gray-400">Coming Soon</p>
                </div>
              </div>
            </div>

            {/* Social Media */}
            <div className="mt-6 flex gap-4">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="hover:text-white transition-colors"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
                className="hover:text-white transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="hover:text-white transition-colors"
              >
                <Youtube className="w-5 h-5" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="hover:text-white transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Copyright and Legal */}
        <div className="border-t border-gray-800 pt-8 text-xs text-gray-500 space-y-4">
          <p>
            All trademarks are property of their respective owners in the US and other countries.
            The literal and graphical information presented on this site about Magic: The Gathering,
            Yu-Gi-Oh!, Pokémon, and any other games and products are trademarked and copyrighted by
            their respective companies. TCG Dojo is not produced by, endorsed by, supported by, or
            affiliated with these card game companies.
          </p>
          <p className="text-sm">©2026 TCG Dojo. All Rights Reserved.</p>
          <div className="flex gap-4">
            <Link to="/faq" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link to="/faq" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
            <Link to="/help" className="hover:text-white transition-colors">
              Accessibility
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
