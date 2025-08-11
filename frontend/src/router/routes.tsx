import { ReactNode } from 'react'
import Home from '@/pages/Home'
import Login from '@/components/auth/Login'
import Register from '@/components/auth/Register'
import Unauthorized from '@/components/auth/Unauthorized'
import PatientIndex from '@/pages/patients/PatientIndex'
import PatientDetail from '@/pages/patients/PatientDetail'
import PatientForm from '@/components/forms/PatientForm'
import PatientReportList from '@/pages/patients/PatientReportList'
import { ReportFormWrapper } from '@/components/ReportFormWrapper'
import DoctorIndex from '@/pages/doctors/DoctorIndex'
import DoctorDetail from '@/pages/doctors/DoctorDetail'
import DoctorForm from '@/components/forms/DoctorForm'
import DeviceIndex from '@/pages/devices/DeviceIndex'
import DeviceDetail from '@/pages/devices/DeviceDetail'
import DeviceForm from '@/components/forms/DeviceForm'
import LeadIndex from '@/pages/leads/LeadIndex'
import LeadDetail from '@/pages/leads/LeadDetail'
import LeadForm from '@/components/forms/LeadForm'
import PatientSearch from '@/pages/search/PatientSearch'

export interface RouteConfig {
  path: string
  element: ReactNode
  requiresAuth?: boolean
  layout?: 'default' | 'home'
  roles?: string[]
}

export const routes: RouteConfig[] = [
  // Public routes with home layout
  {
    path: '/login',
    element: <Login />,
    layout: 'home'
  },
  {
    path: '/register',
    element: <Register />,
    layout: 'home'
  },
  {
    path: '/unauthorized',
    element: <Unauthorized />,
    layout: 'home'
  },

  // Protected routes with default layout
  {
    path: '/',
    element: <Home />,
    requiresAuth: true,
    layout: 'default'
  },
  // Patient routes
  {
    path: '/patients',
    element: <PatientIndex />,
    requiresAuth: true,
    layout: 'default'
  },
  {
    path: '/patients/new',
    element: <PatientForm />,
    requiresAuth: true,
    layout: 'default'
  },
  {
    path: '/patients/:id',
    element: <PatientDetail />,
    requiresAuth: true,
    layout: 'default'
  },
  {
    path: '/patients/:id/edit',
    element: <PatientForm />,
    requiresAuth: true,
    layout: 'default'
  },
  {
    path: '/patients/:patientId/reports',
    element: <PatientReportList />,
    requiresAuth: true,
    layout: 'default'
  },
  {
    path: '/patients/:patientId/reports/new',
    element: <ReportFormWrapper />,
    requiresAuth: true,
    layout: 'default'
  },
  {
    path: '/reports/:reportId/edit',
    element: <ReportFormWrapper />,
    requiresAuth: true,
    layout: 'default'
  },
  { path: 'search/patients', 
    element: <PatientSearch />,
    requiresAuth: true,
    layout: 'default'
  },
  // Doctor routes
  {
    path: '/doctors',
    element: <DoctorIndex />,
    requiresAuth: true,
    layout: 'default'
  },
  {
    path: '/doctors/new',
    element: <DoctorForm />,
    requiresAuth: true,
    layout: 'default'
  },
  {
    path: '/doctors/:id',
    element: <DoctorDetail />,
    requiresAuth: true,
    layout: 'default'
  },
  {
    path: '/doctors/:id/edit',
    element: <DoctorForm />,
    requiresAuth: true,
    layout: 'default'
  },

  // Device routes
  {
    path: '/devices',
    element: <DeviceIndex />,
    requiresAuth: true,
    layout: 'default'
  },
  {
    path: '/devices/new',
    element: <DeviceForm />,
    requiresAuth: true,
    layout: 'default'
  },
  {
    path: '/devices/:id',
    element: <DeviceDetail />,
    requiresAuth: true,
    layout: 'default'
  },
  {
    path: '/devices/:id/edit',
    element: <DeviceForm />,
    requiresAuth: true,
    layout: 'default'
  },

  // Lead routes
  {
    path: '/leads',
    element: <LeadIndex />,
    requiresAuth: true,
    layout: 'default'
  },
  {
    path: '/leads/new',
    element: <LeadForm />,
    requiresAuth: true,
    layout: 'default'
  },
  {
    path: '/leads/:id',
    element: <LeadDetail />,
    requiresAuth: true,
    layout: 'default'
  },
  {
    path: '/leads/:id/edit',
    element: <LeadForm />,
    requiresAuth: true,
    layout: 'default'
  }
]