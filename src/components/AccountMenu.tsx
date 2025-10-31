import React from 'react';
import { X, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AccountMenuProps {
  onClose: () => void;
  userEmail: string;
}

export function AccountMenu({ onClose, userEmail }: AccountMenuProps) {
  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20" onClick={onClose} />
      
      {/* Menu Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Welcome Back,</p>
            <p className="text-sm">{userEmail}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Your Account Section */}
          <div>
            <h3 className="mb-4">Your Account</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/account" className="text-gray-700 hover:text-blue-600" onClick={onClose}>
                  Account
                </Link>
              </li>
              <li>
                <Link to="/account" className="text-gray-700 hover:text-blue-600" onClick={onClose}>
                  Order History
                </Link>
              </li>
              <li>
                <Link to="/account" className="text-gray-700 hover:text-blue-600" onClick={onClose}>
                  Account & Data
                </Link>
              </li>
              <li>
                <Link to="/account" className="text-gray-700 hover:text-blue-600" onClick={onClose}>
                  Messages
                </Link>
              </li>
              <li>
                <Link to="/collection" className="text-gray-700 hover:text-blue-600" onClick={onClose}>
                  Your Collection
                </Link>
              </li>
              <li>
                <a href="#" className="text-gray-700 hover:text-blue-600">
                  Manage Payment Methods
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-700 hover:text-blue-600">
                  TCGplayer Subscription
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-700 hover:text-blue-600">
                  Manage Addresses
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-700 hover:text-blue-600">
                  Store Credit
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-700 hover:text-blue-600">
                  Email Preferences
                </a>
              </li>
            </ul>
          </div>

          {/* Sell Section */}
          <div>
            <h3 className="mb-4">Sell</h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-gray-700 hover:text-blue-600">
                  Account
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-700 hover:text-blue-600">
                  Seller Portal
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-700 hover:text-blue-600">
                  Marketplace Seller Resources
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-700 hover:text-blue-600">
                  Pro Seller Resources
                </a>
              </li>
            </ul>
          </div>

          {/* Help Section */}
          <div>
            <h3 className="mb-4">Help</h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-gray-700 hover:text-blue-600">
                  Contact Customer Support
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-700 hover:text-blue-600">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-700 hover:text-blue-600">
                  Refund and Return Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-700 hover:text-blue-600">
                  TCGplayer Safeguard
                </a>
              </li>
            </ul>
          </div>

          {/* Gift Cards Section */}
          <div>
            <h3 className="mb-4">Gift Cards</h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-gray-700 hover:text-blue-600">
                  Buy a Gift Card
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-700 hover:text-blue-600">
                  Redeem a Gift Card
                </a>
              </li>
            </ul>
          </div>

          {/* Sign Out */}
          <div className="pt-4 border-t">
            <a href="#" className="text-gray-700 hover:text-blue-600 flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Sign Out
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
