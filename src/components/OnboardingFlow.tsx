import React, { useState } from 'react';
import { X, Check, ArrowRight, ArrowLeft } from 'lucide-react';

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  image?: string;
  action?: () => void;
}

interface OnboardingFlowProps {
  onComplete: () => void;
  onSkip: () => void;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 1,
    title: 'Welcome to TCG Marketplace!',
    description: 'Discover, buy, and sell trading cards from all your favorite games in one place.',
  },
  {
    id: 2,
    title: 'Browse Thousands of Products',
    description:
      'Search and filter through our extensive catalog of trading cards, booster packs, and accessories.',
  },
  {
    id: 3,
    title: 'Buy with Confidence',
    description:
      'All sellers are verified. Read reviews, check ratings, and make secure purchases with buyer protection.',
  },
  {
    id: 4,
    title: 'Earn Loyalty Rewards',
    description:
      'Earn 10 points for every dollar spent. Unlock exclusive discounts, free shipping, and early access to sales.',
  },
  {
    id: 5,
    title: 'Track Your Collection',
    description:
      'Build and manage your personal card collection. Track values, find missing cards, and show off to friends.',
  },
  {
    id: 6,
    title: 'Start Selling',
    description:
      'Have cards to sell? Become a seller and reach thousands of collectors. List products in minutes!',
  },
];

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            {onboardingSteps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-8 bg-blue-600'
                    : index < currentStep
                      ? 'w-2 bg-blue-600'
                      : 'w-2 bg-gray-300'
                }`}
              />
            ))}
          </div>
          <button onClick={onSkip} className="text-gray-500 hover:text-gray-700 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 min-h-[300px] flex flex-col justify-center">
          <div className="text-center">
            {/* Step Number */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 font-bold text-xl mb-6">
              {currentStep + 1}
            </div>

            {/* Title */}
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{step.title}</h2>

            {/* Description */}
            <p className="text-lg text-gray-600 max-w-md mx-auto">{step.description}</p>

            {/* Additional Content for Specific Steps */}
            {currentStep === 3 && (
              <div className="mt-6 bg-blue-50 rounded-lg p-4 max-w-md mx-auto">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">Current Points:</span>
                  <span className="font-bold text-blue-600">0 points</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-700">Current Tier:</span>
                  <span className="font-bold text-gray-900">Bronze</span>
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="mt-6">
                <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  Become a Seller
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-between items-center">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              currentStep === 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </button>

          <button onClick={onSkip} className="text-gray-500 hover:text-gray-700 transition-colors">
            Skip Tour
          </button>

          <button
            onClick={handleNext}
            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {isLastStep ? (
              <>
                Get Started
                <Check className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;
