import React from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  CreditCard,
  Shield,
  Users,
  TrendingUp,
  HelpCircle,
  Mail,
  MessageCircle,
  Book,
} from 'lucide-react';
import Header from '../components/Header';

interface HelpCategory {
  icon: React.ReactNode;
  title: string;
  description: string;
  link: string;
}

const helpCategories: HelpCategory[] = [
  {
    icon: <Package className="w-8 h-8" />,
    title: 'Orders & Shipping',
    description: 'Track orders, shipping information, and delivery options',
    link: '/help/orders',
  },
  {
    icon: <CreditCard className="w-8 h-8" />,
    title: 'Payment & Billing',
    description: 'Payment methods, billing issues, and refunds',
    link: '/help/payment',
  },
  {
    icon: <Shield className="w-8 h-8" />,
    title: 'Account & Security',
    description: 'Account management, password reset, and security',
    link: '/help/account',
  },
  {
    icon: <Users className="w-8 h-8" />,
    title: 'Selling on Marketplace',
    description: 'Become a seller, listing products, and seller tools',
    link: '/help/selling',
  },
  {
    icon: <TrendingUp className="w-8 h-8" />,
    title: 'Loyalty Program',
    description: 'Earn points, rewards, and tier benefits',
    link: '/help/loyalty',
  },
  {
    icon: <HelpCircle className="w-8 h-8" />,
    title: 'Returns & Refunds',
    description: 'Return policy, refund process, and exchanges',
    link: '/help/returns',
  },
];

const popularArticles = [
  'How to track my order',
  'What payment methods are accepted',
  'How to become a seller',
  'Understanding card condition ratings',
  'How the loyalty program works',
  'Return policy and procedures',
];

const HelpCenterPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold mb-4">How can we help you?</h1>
          <p className="text-xl mb-8 opacity-90">
            Find answers, get support, and learn about our marketplace
          </p>
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search for help..."
                className="w-full px-6 py-4 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <button className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                Search
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Help Categories */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Browse by Category</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {helpCategories.map((category, index) => (
            <Link
              key={index}
              to={category.link}
              className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all group"
            >
              <div className="text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                {category.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{category.title}</h3>
              <p className="text-gray-600 text-sm">{category.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Popular Articles */}
      <div className="bg-white">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Popular Articles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {popularArticles.map((article, index) => (
              <Link
                key={index}
                to="/faq"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors"
              >
                <Book className="w-5 h-5 text-blue-600 mr-3" />
                <span className="text-gray-700">{article}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Contact Options */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Still need help? Contact us
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-6 text-center shadow-sm border border-gray-200">
            <div className="text-blue-600 mb-4 inline-block">
              <Mail className="w-12 h-12" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Support</h3>
            <p className="text-gray-600 text-sm mb-4">Get a response within 24 hours</p>
            <a
              href="mailto:support@tcgmarketplace.com"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              support@tcgmarketplace.com
            </a>
          </div>

          <div className="bg-white rounded-lg p-6 text-center shadow-sm border border-gray-200">
            <div className="text-blue-600 mb-4 inline-block">
              <MessageCircle className="w-12 h-12" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Live Chat</h3>
            <p className="text-gray-600 text-sm mb-4">Chat with us in real-time</p>
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
              Start Chat
            </button>
          </div>

          <div className="bg-white rounded-lg p-6 text-center shadow-sm border border-gray-200">
            <div className="text-blue-600 mb-4 inline-block">
              <HelpCircle className="w-12 h-12" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">FAQ</h3>
            <p className="text-gray-600 text-sm mb-4">Browse frequently asked questions</p>
            <Link to="/faq" className="text-blue-600 hover:text-blue-700 font-medium">
              View FAQ
            </Link>
          </div>
        </div>
      </div>

      {/* Community Resources */}
      <div className="bg-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Community Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Community Forum</h3>
              <p className="text-gray-600 mb-4">
                Connect with other collectors and sellers in our community
              </p>
              <button className="text-blue-600 hover:text-blue-700 font-medium">
                Visit Forum →
              </button>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Seller Resources</h3>
              <p className="text-gray-600 mb-4">Guides and tools to help you succeed as a seller</p>
              <button className="text-blue-600 hover:text-blue-700 font-medium">
                Learn More →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpCenterPage;
