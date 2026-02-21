
import Header from './Header';
import Breadcrumb from './Breadcrumb';
import Footer from './Footer';

export default function Layout({ children, headerIcon = 'bar', breadcrumbItems = [] }) {
  return (
    <div className="min-h-screen bg-slate-50 text-foreground">
      <Header icon={headerIcon} />
      {breadcrumbItems.length > 0 && <Breadcrumb items={breadcrumbItems} />}
      <main className="container py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}
