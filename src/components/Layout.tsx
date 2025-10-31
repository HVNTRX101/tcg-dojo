import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { AnnouncementBanner } from './AnnouncementBanner';

export default function Layout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AnnouncementBanner />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
