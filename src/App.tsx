import { Route, Routes } from 'react-router-dom';
import { EvidenceDrawer } from '@/components/evidence/EvidenceDrawer';
import { DemoGuide } from '@/components/system/DemoGuide';
import { ScrollToTop } from '@/components/system/ScrollToTop';
import { VitaProvider } from '@/hooks/useVita';
import { AppShell } from '@/layouts/AppShell';
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import EmergencyEntry from '@/pages/EmergencyEntry';
import EmergencyMode from '@/pages/EmergencyMode';
import ClinicianWorkspace from '@/pages/ClinicianWorkspace';
import ClinicianPatient from '@/pages/ClinicianPatient';
import Dashboard from '@/pages/Dashboard';
import HealthProfile from '@/pages/HealthProfile';
import Documents from '@/pages/Documents';
import DocumentDetail from '@/pages/DocumentDetail';
import Ingest from '@/pages/Ingest';
import TimelinePage from '@/pages/TimelinePage';
import Consent from '@/pages/Consent';
import Caregiver from '@/pages/Caregiver';
import Settings from '@/pages/Settings';
import NotFound from '@/pages/NotFound';

export default function App() {
  return (
    <VitaProvider>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />

        {/* Emergency Mode lives outside the application shell on purpose:
            it is a different surface with a different job. */}
        <Route path="/emergency" element={<EmergencyEntry />} />
        <Route path="/emergency/:patientId" element={<EmergencyMode />} />

        <Route path="/clinician" element={<ClinicianWorkspace />} />
        <Route path="/clinician/:patientId" element={<ClinicianPatient />} />

        <Route path="/app" element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="profile" element={<HealthProfile />} />
          <Route path="documents" element={<Documents />} />
          <Route path="documents/:documentId" element={<DocumentDetail />} />
          <Route path="ingest" element={<Ingest />} />
          <Route path="timeline" element={<TimelinePage />} />
          <Route path="consent" element={<Consent />} />
          <Route path="caregiver" element={<Caregiver />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>

      <EvidenceDrawer />
      <DemoGuide />
    </VitaProvider>
  );
}
