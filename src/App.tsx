import { Navigate, Route, Routes } from 'react-router-dom';
import { EvidenceDrawer } from '@/components/evidence/EvidenceDrawer';
import { DemoGuide } from '@/components/system/DemoGuide';
import { ScrollToTop } from '@/components/system/ScrollToTop';
import { VitaProvider } from '@/hooks/useVita';
import { AppShell } from '@/layouts/AppShell';
import { ClinicianShell } from '@/layouts/ClinicianShell';

import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import { RegisterClinician, RegisterPatient } from '@/pages/auth/Register';
import NotFound from '@/pages/NotFound';

/* Emergency Mode — its own surface, outside both shells. */
import EmergencyEntry from '@/pages/EmergencyEntry';
import EmergencyMode from '@/pages/EmergencyMode';

/* Patient */
import Dashboard from '@/pages/Dashboard';
import HealthProfile from '@/pages/HealthProfile';
import Documents from '@/pages/Documents';
import DocumentDetail from '@/pages/DocumentDetail';
import Ingest from '@/pages/Ingest';
import TimelinePage from '@/pages/TimelinePage';
import Consent from '@/pages/Consent';
import Caregiver from '@/pages/Caregiver';
import Settings from '@/pages/Settings';
import {
  PatientEmergencyProfile,
  PatientMedications,
  PatientNotifications,
  PatientRequests,
} from '@/pages/patient';

/* Clinician */
import ClinicianOverview from '@/pages/clinician/Overview';
import ClinicianPatients from '@/pages/clinician/Patients';
import ClinicianPatient from '@/pages/ClinicianPatient';
import {
  ClinicianAudit,
  ClinicianNotifications,
  ClinicianRequests,
  ClinicianSettings,
  ClinicianTimeline,
  EmergencyBoard,
  NewPatient,
} from '@/pages/clinician';

/* ============================================================================
   Routing
   ----------------------------------------------------------------------------
   Three surfaces, and the separation is the product:

     /app/*         the patient's application — their record, their consent
     /clinician/*   the clinician's workspace — their queue, their requests
     /emergency/*   Emergency Mode, belonging to neither shell

   A patient has no route into the clinician workspace's patient list, and a
   clinician has no route into consent administration. That is enforced by the
   route tree rather than by hiding buttons.
   ========================================================================== */

export default function App() {
  return (
    <VitaProvider>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register/patient" element={<RegisterPatient />} />
        <Route path="/register/clinician" element={<RegisterClinician />} />

        {/* Emergency Mode is a mode, not a page inside an app. */}
        <Route path="/emergency" element={<EmergencyEntry />} />
        <Route path="/emergency/:patientId" element={<EmergencyMode />} />

        {/* --- Patient ----------------------------------------------------- */}
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="profile" element={<HealthProfile />} />
          <Route path="medications" element={<PatientMedications />} />
          <Route path="timeline" element={<TimelinePage />} />
          <Route path="emergency-profile" element={<PatientEmergencyProfile />} />
          <Route path="documents" element={<Documents />} />
          <Route path="documents/:documentId" element={<DocumentDetail />} />
          <Route path="ingest" element={<Ingest />} />
          <Route path="requests" element={<PatientRequests />} />
          <Route path="consent" element={<Consent />} />
          <Route path="notifications" element={<PatientNotifications />} />
          <Route path="caregiver" element={<Caregiver />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* --- Clinician ---------------------------------------------------- */}
        <Route path="/clinician" element={<ClinicianShell />}>
          <Route index element={<ClinicianOverview />} />
          <Route path="patients" element={<ClinicianPatients />} />
          <Route path="patients/:patientId" element={<ClinicianPatient />} />
          <Route path="emergency" element={<EmergencyBoard />} />
          <Route path="requests" element={<ClinicianRequests />} />
          <Route path="new-patient" element={<NewPatient />} />
          <Route path="timeline" element={<ClinicianTimeline />} />
          <Route path="audit" element={<ClinicianAudit />} />
          <Route path="notifications" element={<ClinicianNotifications />} />
          <Route path="settings" element={<ClinicianSettings />} />
        </Route>

        {/* The old flat clinician patient route, kept working. */}
        <Route path="/clinician/patient/:patientId" element={<Navigate to="/clinician/patients" replace />} />

        <Route path="*" element={<NotFound />} />
      </Routes>

      <EvidenceDrawer />
      <DemoGuide />
    </VitaProvider>
  );
}
