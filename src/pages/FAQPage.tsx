import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import Header from '../components/Header';

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  // Orders & Shipping
  {
    id: '1',
    category: 'Orders & Shipping',
    question: 'How long does shipping take?',
    answer:
      'Standard shipping typically takes 5-7 business days. Express shipping is available and takes 2-3 business days. International shipping may take 10-14 business days depending on your location.',
  },
  {
    id: '2',
    category: 'Orders & Shipping',
    question: 'Can I track my order?',
    answer:
      'Yes! Once your order ships, you will receive a tracking number via email. You can also track your order by logging into your account and viewing your order history.',
  },
  {
    id: '3',
    category: 'Orders & Shipping',
    question: 'What if my order arrives damaged?',
    answer:
      'We take great care in packaging all orders. If your item arrives damaged, please contact us within 48 hours with photos of the damage, and we will arrange a replacement or refund.',
  },
  // Returns & Refunds
  {
    id: '4',
    category: 'Returns & Refunds',
    question: 'What is your return policy?',
    answer:
      'We offer a 30-day return policy for most items. Items must be in their original condition and packaging. Opened trading card products cannot be returned unless defective.',
  },
  {
    id: '5',
    category: 'Returns & Refunds',
    question: 'How do I initiate a return?',
    answer:
      'To initiate a return, log into your account, navigate to your order history, and select the order you wish to return. Follow the prompts to generate a return label.',
  },
  {
    id: '6',
    category: 'Returns & Refunds',
    question: 'When will I receive my refund?',
    answer:
      'Refunds are processed within 5-7 business days after we receive your return. The refund will be issued to your original payment method.',
  },
  // Account & Payment
  {
    id: '7',
    category: 'Account & Payment',
    question: 'How do I create an account?',
    answer:
      'Click the "Sign Up" button in the top right corner, fill in your information, and verify your email address. Creating an account allows you to track orders, save favorites, and earn loyalty points.',
  },
  {
    id: '8',
    category: 'Account & Payment',
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major credit cards (Visa, Mastercard, American Express, Discover), PayPal, and Apple Pay. All transactions are secured with 256-bit SSL encryption.',
  },
  {
    id: '9',
    category: 'Account & Payment',
    question: 'Is my payment information secure?',
    answer:
      'Yes! We use industry-standard encryption and do not store your full credit card information. All payments are processed through Stripe, a PCI DSS compliant payment processor.',
  },
  // Products & Sellers
  {
    id: '10',
    category: 'Products & Sellers',
    question: 'How do I know if a seller is trustworthy?',
    answer:
      'All sellers on our platform are verified. You can check seller ratings, read reviews from other buyers, and view their sales history before making a purchase.',
  },
  {
    id: '11',
    category: 'Products & Sellers',
    question: 'What do the card condition ratings mean?',
    answer:
      'We use standard TCG condition ratings: Near Mint (NM), Lightly Played (LP), Moderately Played (MP), Heavily Played (HP), and Damaged (DMG). Each listing includes detailed condition descriptions and photos.',
  },
  {
    id: '12',
    category: 'Products & Sellers',
    question: 'Can I sell on this platform?',
    answer:
      'Yes! Click "Become a Seller" in the footer to create a seller account. You will need to provide business information and agree to our seller terms.',
  },
  // Loyalty Program
  {
    id: '13',
    category: 'Loyalty Program',
    question: 'How does the loyalty program work?',
    answer:
      'Earn 10 points for every dollar spent. Accumulate points to unlock tier benefits including discounts, free shipping, and early access to sales. 100 points = $1 discount.',
  },
  {
    id: '14',
    category: 'Loyalty Program',
    question: 'How do I redeem my loyalty points?',
    answer:
      'During checkout, you can choose to apply your available points for a discount. The discount will be automatically calculated and applied to your order total.',
  },
];

const categories = Array.from(new Set(faqData.map(item => item.category)));

const FAQPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredFAQs = faqData.filter(item => {
    const matchesSearch =
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h1>
          <p className="text-gray-600">Find answers to common questions about our marketplace</p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search for answers..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                !selectedCategory
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {filteredFAQs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No results found. Try a different search term.</p>
            </div>
          ) : (
            filteredFAQs.map(item => (
              <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
                <button
                  onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <span className="text-xs text-blue-600 font-medium">{item.category}</span>
                    <h3 className="font-semibold text-gray-900 mt-1">{item.question}</h3>
                  </div>
                  {expandedId === item.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                {expandedId === item.id && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-600 leading-relaxed">{item.answer}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Contact Support */}
        <div className="mt-12 bg-blue-50 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Still have questions?</h2>
          <p className="text-gray-600 mb-4">Our support team is here to help!</p>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
};

export default FAQPage;
