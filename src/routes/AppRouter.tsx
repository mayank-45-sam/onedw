import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { PublicLayout } from '@/components/layouts/PublicLayout';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { LoadingState } from '@/components/common/States';
import { ROUTES } from '@/constants/routes';

// Public pages
const LandingPage         = lazy(() => import('@/pages/public/LandingPage'));
const AboutPage           = lazy(() => import('@/pages/public/AboutPage'));
const ServicesPage        = lazy(() => import('@/pages/public/ServicesPage'));
const CategoriesPage      = lazy(() => import('@/pages/public/CategoriesPage'));
const CategoryDetailPage  = lazy(() => import('@/pages/public/CategoryDetailPage'));
const WorkersPage         = lazy(() => import('@/pages/public/WorkersPage'));
const SearchPage          = lazy(() => import('@/pages/public/SearchPage'));
const WorkerDetailPage    = lazy(() => import('@/pages/public/WorkerDetailPage'));
const HelpCenterPage      = lazy(() => import('@/pages/public/HelpCenterPage'));
const FAQPage             = lazy(() => import('@/pages/public/FAQPage'));
const ImageRepairResultPage = lazy(() => import('@/pages/public/ImageRepairResultPage'));
const NotFoundPage        = lazy(() => import('@/pages/public/NotFoundPage'));

// Auth pages
const LoginPage         = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage      = lazy(() => import('@/pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const OtpPage           = lazy(() => import('@/pages/auth/OtpPage'));

// Dashboard pages
const Dashboard            = lazy(() => import('@/pages/Dashboard'));
const Profile              = lazy(() => import('@/pages/Profile'));
const WorkerDashboardPage   = lazy(() => import('@/pages/dashboard/WorkerDashboardPage'));
const AdminDashboardPage    = lazy(() => import('@/pages/dashboard/AdminDashboardPage'));
const AdminBookingsPage     = lazy(() => import('@/pages/dashboard/AdminBookingsPage'));
const AdminWorkersPage      = lazy(() => import('@/pages/dashboard/AdminWorkersPage'));
const AdminCustomersPage    = lazy(() => import('@/pages/dashboard/AdminCustomersPage'));
const AdminServicesPage     = lazy(() => import('@/pages/dashboard/AdminServicesPage'));
const AdminCategoriesPage   = lazy(() => import('@/pages/dashboard/AdminCategoriesPage'));
const AdminCouponsPage      = lazy(() => import('@/pages/dashboard/AdminCouponsPage'));
const AdminReportsPage      = lazy(() => import('@/pages/dashboard/AdminReportsPage'));
const AdminAnalyticsPage    = lazy(() => import('@/pages/dashboard/AdminAnalyticsPage'));
const WorkerApprovalQueuePage = lazy(() => import('@/pages/dashboard/WorkerApprovalQueuePage'));
const AdminVerificationPage   = lazy(() => import('@/pages/dashboard/AdminVerificationPage'));
const ComplaintManagementPage = lazy(() => import('@/pages/dashboard/ComplaintManagementPage'));
const RefundRequestsPage    = lazy(() => import('@/pages/dashboard/RefundRequestsPage'));
const BookingPage        = lazy(() => import('@/pages/booking/BookingPage'));
const BookingDetailsPage = lazy(() => import('@/pages/booking/BookingDetailsPage'));
const WalletPage         = lazy(() => import('@/pages/dashboard/WalletPage'));
const NotificationsPage  = lazy(() => import('@/pages/dashboard/NotificationsPage'));
const ReviewsPage        = lazy(() => import('@/pages/dashboard/ReviewsPage'));
const FeedbackPage       = lazy(() => import('@/pages/dashboard/FeedbackPage'));
const SettingsPage       = lazy(() => import('@/pages/dashboard/SettingsPage'));
const PrivacySecurityPage = lazy(() => import('@/pages/dashboard/PrivacySecurityPage'));
const CouponsPage        = lazy(() => import('@/pages/dashboard/CouponsPage'));
const OffersPage         = lazy(() => import('@/pages/dashboard/OffersPage'));
const ChatPage           = lazy(() => import('@/pages/dashboard/ChatPage'));
const WorkerVerificationPage = lazy(() => import('@/pages/auth/WorkerVerificationPage'));
const FraudDashboardPage = lazy(() => import('@/pages/dashboard/FraudDashboardPage'));

const fallback = <LoadingState className="min-h-[60vh]" />;

export function AppRouter() {
  return (
    <Routes>
      {/* ── Public ── */}
      <Route element={<PublicLayout />}>
        <Route path={ROUTES.home}           element={<Suspense fallback={fallback}><LandingPage /></Suspense>} />
        <Route path={ROUTES.about}          element={<Suspense fallback={fallback}><AboutPage /></Suspense>} />
        <Route path={ROUTES.services}       element={<Suspense fallback={fallback}><ServicesPage /></Suspense>} />
        <Route path={ROUTES.categories}     element={<Suspense fallback={fallback}><CategoriesPage /></Suspense>} />
        <Route path={ROUTES.categoryDetail} element={<Suspense fallback={fallback}><CategoryDetailPage /></Suspense>} />
        <Route path={ROUTES.workers}        element={<Suspense fallback={fallback}><WorkersPage /></Suspense>} />
        <Route path={ROUTES.search}         element={<Suspense fallback={fallback}><SearchPage /></Suspense>} />
        <Route path={ROUTES.workerDetail}   element={<Suspense fallback={fallback}><WorkerDetailPage /></Suspense>} />
        <Route path={ROUTES.help}           element={<Suspense fallback={fallback}><HelpCenterPage /></Suspense>} />
        <Route path={ROUTES.faq}            element={<Suspense fallback={fallback}><FAQPage /></Suspense>} />
        <Route path={ROUTES.imageRepairResult} element={<Suspense fallback={fallback}><ImageRepairResultPage /></Suspense>} />
      </Route>

      {/* ── Auth ── */}
      <Route element={<AuthLayout />}>
        <Route path={ROUTES.login}    element={<Suspense fallback={fallback}><LoginPage /></Suspense>} />
        <Route path={ROUTES.register} element={<Suspense fallback={fallback}><RegisterPage /></Suspense>} />
        <Route path={ROUTES.forgot}   element={<Suspense fallback={fallback}><ForgotPasswordPage /></Suspense>} />
        <Route path={ROUTES.otp}      element={<Suspense fallback={fallback}><OtpPage /></Suspense>} />
      </Route>

      {/* ── Protected dashboard ── */}
      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path={ROUTES.customerDashboard} element={<Suspense fallback={fallback}><Dashboard /></Suspense>} />
        <Route path={ROUTES.workerDashboard}   element={<Suspense fallback={fallback}><WorkerDashboardPage /></Suspense>} />
        <Route path={ROUTES.adminDashboard}    element={<Suspense fallback={fallback}><AdminDashboardPage /></Suspense>} />
        <Route path={ROUTES.adminBookings}     element={<Suspense fallback={fallback}><AdminBookingsPage /></Suspense>} />
        <Route path={ROUTES.adminWorkers}      element={<Suspense fallback={fallback}><AdminWorkersPage /></Suspense>} />
        <Route path={ROUTES.adminCustomers}    element={<Suspense fallback={fallback}><AdminCustomersPage /></Suspense>} />
        <Route path={ROUTES.adminServices}     element={<Suspense fallback={fallback}><AdminServicesPage /></Suspense>} />
        <Route path={ROUTES.adminCategories}   element={<Suspense fallback={fallback}><AdminCategoriesPage /></Suspense>} />
        <Route path={ROUTES.adminCoupons}      element={<Suspense fallback={fallback}><AdminCouponsPage /></Suspense>} />
        <Route path={ROUTES.adminReports}      element={<Suspense fallback={fallback}><AdminReportsPage /></Suspense>} />
        <Route path={ROUTES.adminAnalytics}    element={<Suspense fallback={fallback}><AdminAnalyticsPage /></Suspense>} />
        <Route path={ROUTES.workerApprovalQueue} element={<Suspense fallback={fallback}><WorkerApprovalQueuePage /></Suspense>} />
        <Route path={ROUTES.adminVerification}   element={<Suspense fallback={fallback}><AdminVerificationPage /></Suspense>} />
        <Route path={ROUTES.complaintManagement} element={<Suspense fallback={fallback}><ComplaintManagementPage /></Suspense>} />
        <Route path={ROUTES.refundRequests}    element={<Suspense fallback={fallback}><RefundRequestsPage /></Suspense>} />
        <Route path={ROUTES.adminFraudDashboard} element={<Suspense fallback={fallback}><FraudDashboardPage /></Suspense>} />
        <Route path={ROUTES.wallet}            element={<Suspense fallback={fallback}><WalletPage /></Suspense>} />
        <Route path={ROUTES.notifications}     element={<Suspense fallback={fallback}><NotificationsPage /></Suspense>} />
        <Route path={ROUTES.reviews}           element={<Suspense fallback={fallback}><ReviewsPage /></Suspense>} />
        <Route path={ROUTES.profile}           element={<Suspense fallback={fallback}><Profile /></Suspense>} />
        <Route path={ROUTES.settings}          element={<Suspense fallback={fallback}><SettingsPage /></Suspense>} />
        <Route path={ROUTES.privacySecurity}   element={<Suspense fallback={fallback}><PrivacySecurityPage /></Suspense>} />
        <Route path={ROUTES.coupons}           element={<Suspense fallback={fallback}><CouponsPage /></Suspense>} />
        <Route path={ROUTES.offers}            element={<Suspense fallback={fallback}><OffersPage /></Suspense>} />
        <Route path={ROUTES.chat}              element={<Suspense fallback={fallback}><ChatPage /></Suspense>} />
        <Route path={ROUTES.chatConversation}  element={<Suspense fallback={fallback}><ChatPage /></Suspense>} />
      </Route>

      {/* ── Standalone protected ── */}
      <Route path={ROUTES.booking}        element={<ProtectedRoute><Suspense fallback={fallback}><BookingPage /></Suspense></ProtectedRoute>} />
      <Route path={ROUTES.bookingDetails} element={<ProtectedRoute><Suspense fallback={fallback}><BookingDetailsPage /></Suspense></ProtectedRoute>} />
      <Route path={ROUTES.feedback}       element={<ProtectedRoute><Suspense fallback={fallback}><FeedbackPage /></Suspense></ProtectedRoute>} />
      <Route path={ROUTES.workerVerification} element={<ProtectedRoute><Suspense fallback={fallback}><WorkerVerificationPage /></Suspense></ProtectedRoute>} />

      <Route path={ROUTES.adminFraudWorker} element={<ProtectedRoute><Suspense fallback={fallback}><FraudDashboardPage /></Suspense></ProtectedRoute>} />

  <Route path={ROUTES.notFound} element={<Suspense fallback={fallback}><NotFoundPage /></Suspense>} />
    </Routes>
  );
}
