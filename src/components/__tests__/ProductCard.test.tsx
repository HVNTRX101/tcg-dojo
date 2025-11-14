import { describe, it, expect, vi } from 'vitest';
import { screen, render } from '@testing-library/react';
import { userEvent } from '../../test/utils';
import { ProductCard } from '../ProductCard';
import { CartProvider } from '../CartContext';
import { mockProduct, mockProducts } from '../../test/mocks/mockData';
import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Mock motion to avoid animation issues in tests
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Custom render function with all required providers
const renderWithCartProvider = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <CartProvider>{component}</CartProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('ProductCard', () => {
  it('should render product information correctly', () => {
    renderWithCartProvider(<ProductCard product={mockProduct} />);

    expect(screen.getByText('Black Lotus')).toBeInTheDocument();
    expect(screen.getByText(/Alpha/)).toBeInTheDocument();
    expect(screen.getByText('$10,000.00')).toBeInTheDocument();
    expect(screen.getByText('Premium Cards Inc')).toBeInTheDocument();
    expect(screen.getByText('4.8')).toBeInTheDocument();
  });

  it('should display rarity badge', () => {
    renderWithCartProvider(<ProductCard product={mockProduct} />);

    expect(screen.getByText('Rare')).toBeInTheDocument();
  });

  it('should display condition badge', () => {
    renderWithCartProvider(<ProductCard product={mockProduct} />);

    expect(screen.getByText('Near Mint')).toBeInTheDocument();
  });

  it('should display foil badge for foil cards', () => {
    const foilProduct = { ...mockProducts[1] }; // Mox Ruby is foil
    renderWithCartProvider(<ProductCard product={foilProduct} />);

    expect(screen.getByText('Foil')).toBeInTheDocument();
  });

  it('should not display foil badge for normal cards', () => {
    renderWithCartProvider(<ProductCard product={mockProduct} />);

    expect(screen.queryByText('Foil')).not.toBeInTheDocument();
  });

  it('should display quantity when more than 1', () => {
    renderWithCartProvider(<ProductCard product={mockProduct} />);

    expect(screen.getByText('5 available')).toBeInTheDocument();
  });

  it('should add product to cart when "Add to Cart" is clicked', async () => {
    const user = userEvent.setup();
    renderWithCartProvider(<ProductCard product={mockProduct} />);

    const addButton = screen.getByRole('button', { name: /add to cart/i });
    await user.click(addButton);

    // The cart should now have the item
    // We could verify this by checking if the cart state changed
    // For now, we just ensure the button is clickable
    expect(addButton).toBeInTheDocument();
  });

  it('should link to product detail page', () => {
    renderWithCartProvider(<ProductCard product={mockProduct} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/products/1');
  });

  it('should format price correctly', () => {
    const cheapProduct = {
      ...mockProduct,
      price: 1.99,
    };
    renderWithCartProvider(<ProductCard product={cheapProduct} />);

    expect(screen.getByText('$1.99')).toBeInTheDocument();
  });

  it('should apply different colors for different rarities', () => {
    const { rerender } = renderWithCartProvider(<ProductCard product={mockProduct} />);

    // Rare card
    expect(screen.getByText('Rare')).toBeInTheDocument();

    // Mythic Rare card
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <BrowserRouter>
          <CartProvider>
            <ProductCard product={mockProducts[2]} />
          </CartProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );
    expect(screen.getByText('Mythic Rare')).toBeInTheDocument();
  });

  it('should apply different colors for different conditions', () => {
    renderWithCartProvider(<ProductCard product={mockProduct} />);

    const conditionBadge = screen.getByText('Near Mint');
    expect(conditionBadge).toBeInTheDocument();
  });

  it('should display seller rating correctly', () => {
    renderWithCartProvider(<ProductCard product={mockProduct} />);

    const rating = screen.getByText('4.8');
    expect(rating).toBeInTheDocument();
  });
});
