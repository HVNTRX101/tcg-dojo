import React, { useState } from 'react';
import {
  Package,
  FileText,
  Shield,
  MessageSquare,
  Book,
  CreditCard,
  Star,
  MapPin,
  DollarSign,
  Mail,
  ExternalLink,
  X,
} from 'lucide-react';

interface AccountPageProps {
  onClose?: () => void;
}

export function AccountPage({ onClose }: AccountPageProps = {}) {
  const [activeSection, setActiveSection] = useState('order-history');

  const menuItems = [
    { id: 'order-history', label: 'Order History', icon: Package },
    { id: 'account-data', label: 'Account & Data', icon: FileText },
    { id: 'addresses', label: 'Addresses', icon: MapPin },
    { id: 'payment-methods', label: 'Payment Methods', icon: CreditCard },
    { id: 'redeem-gift-card', label: 'Redeem Gift Card', icon: DollarSign },
    { id: 'store-credit', label: 'Store Credit', icon: Star },
    { id: 'permissions', label: 'Permissions', icon: Shield },
    { id: 'email-preferences', label: 'Email Preferences', icon: Mail },
    { id: 'subscription', label: 'TCGplayer Subscription', icon: Star },
    { id: 'messages', label: 'Messages', icon: MessageSquare, external: true },
    { id: 'seller-portal', label: 'Seller Portal', icon: Book, external: true },
    { id: 'buylist', label: 'TCGplayer Buylist', icon: Package, external: true },
    { id: 'refund-return', label: 'Refund/Return Policy', icon: Shield, external: true },
    { id: 'collection', label: 'Collection', icon: Book, external: true },
    { id: 'help-faq', label: 'Help/FAQ', icon: MessageSquare, external: true },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <aside className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4 bg-blue-600 text-white rounded-t-lg">
                <h2>Account Home</h2>
              </div>
              <nav className="p-2">
                {menuItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full text-left px-4 py-2.5 rounded flex items-center gap-3 text-sm ${
                        activeSection === item.id
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                      {item.external && <ExternalLink className="w-3 h-3 ml-auto" />}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Built on Trust Badge */}
            <div className="mt-6 bg-white rounded-lg shadow-sm p-6 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full mb-4">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-blue-900 mb-2">BUILT ON TRUST</h3>
              <div className="text-xs text-gray-600 mb-4">
                TCGPLAYER
                <br />
                PARTNERSHIP
              </div>
              <p className="text-xs text-gray-500">Trusted marketplace for trading card games</p>
            </div>

            {/* Feedback Section */}
            <div className="mt-6 bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm mb-3">HELP US SERVE YOU BETTER!</p>
              <button className="w-full bg-cyan-400 hover:bg-cyan-500 text-white py-2 px-4 rounded text-sm">
                Leave Us Feedback
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b flex items-center justify-between">
                <div>
                  <h1 className="text-2xl mb-1">Welcome, vhunted@email.com</h1>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <button className="hover:text-blue-600">Store Credit: $0.00</button>
                  </div>
                </div>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                  {/* Look Up an Order Card */}
                  <div className="border-2 border-gray-200 rounded-lg p-8 text-center hover:border-blue-300 transition-colors cursor-pointer">
                    <div className="mb-4 flex justify-center">
                      <Package className="w-16 h-16 text-gray-300" />
                    </div>
                    <h3 className="text-green-600 mb-2">Look Up an Order</h3>
                    <p className="text-sm text-gray-600">Click here to view your order history</p>
                  </div>

                  {/* Sell with TCGplayer Card */}
                  <div className="border-2 border-gray-200 rounded-lg p-8 text-center hover:border-blue-300 transition-colors cursor-pointer">
                    <div className="mb-4 flex justify-center">
                      <DollarSign className="w-16 h-16 text-gray-300" />
                    </div>
                    <h3 className="text-green-600 mb-2">Sell with TCGplayer</h3>
                    <p className="text-sm text-gray-600">
                      Click here to start selling on TCGplayer
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default AccountPage;
