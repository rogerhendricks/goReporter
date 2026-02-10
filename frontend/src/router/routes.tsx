import { lazy, type ReactNode } from 'react'

// Eagerly load critical routes for immediate access
import Login from '@/components/auth/Login'
import Unauthorized from '@/components/auth/Unauthorized'
import Home from '@/pages/Home'

// Lazy load all other routes
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const DoctorDashboard = lazy(() => import('@/pages/DoctorDashboard'))
const ViewerDashboard = lazy(() => import('@/pages/ViewerDashboard'))
const PatientIndex = lazy(() => import('@/pages/patients/PatientIndex'))
const PatientDetail = lazy(() => import('@/pages/patients/PatientDetail'))
const PatientForm = lazy(() => import('@/components/forms/PatientForm'))
const PatientReportList = lazy(() => import('@/pages/patients/PatientReportList'))
const ReportFormWrapper = lazy(() => import('@/components/ReportFormWrapper').then(m => ({ default: m.ReportFormWrapper })))
const DoctorIndex = lazy(() => import('@/pages/doctors/DoctorIndex'))
const DoctorDetail = lazy(() => import('@/pages/doctors/DoctorDetail'))
const DoctorForm = lazy(() => import('@/components/forms/DoctorForm'))
const DeviceIndex = lazy(() => import('@/pages/devices/DeviceIndex'))
const DeviceDetail = lazy(() => import('@/pages/devices/DeviceDetail'))
const DeviceForm = lazy(() => import('@/components/forms/DeviceForm'))
const LeadIndex = lazy(() => import('@/pages/leads/LeadIndex'))
const LeadDetail = lazy(() => import('@/pages/leads/LeadDetail'))
const LeadForm = lazy(() => import('@/components/forms/LeadForm'))
const PatientSearch = lazy(() => import('@/pages/search/PatientSearch'))
const TagManagement = lazy(() => import('@/components/admin/TagManagement').then(m => ({ default: m.TagManagement })))
const TaskList = lazy(() => import('@/components/tasks/TaskList').then(m => ({ default: m.TaskList })))
const TaskForm = lazy(() => import('@/components/forms/TaskForm').then(m => ({ default: m.TaskForm })))
const TaskDetail = lazy(() => import('@/components/tasks/TaskDetail').then(m => ({ default: m.TaskDetail })))
const TaskTemplateManager = lazy(() => import('@/components/admin/TaskTemplateManager').then(m => ({ default: m.TaskTemplateManager })))
const ReportBuilder = lazy(() => import('@/components/report-builder/ReportBuilder').then(m => ({ default: m.ReportBuilder })))
const WebhooksPage = lazy(() => import('@/pages/WebhooksPage'))
const WebhookFormPage = lazy(() => import('@/pages/WebhookFormPage'))
const ProductivityReportPage = lazy(() => import('@/pages/ProductivityReportPage'))
const KnowledgeBase = lazy(() => import('@/pages/KnowledgeBase'))
const AppointmentCalendarPage = lazy(() => import('@/pages/appointments/AppointmentCalendarPage'))


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
  // {
  //   path: '/register',
  //   element: <Register />,
  //   layout: 'home'
  // },
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

  // Admin dashboard - admin only
  {
    path: '/admin',
    element: <AdminDashboard />,
    requiresAuth: true,
    layout: 'default',
    roles: ['admin']
  },

  // Doctor dashboard - doctor only
  {
    path: '/doctor',
    element: <DoctorDashboard />,
    requiresAuth: true,
    layout: 'default',
    roles: ['doctor']
  },

  // Temp dashboard - tempuser only
  {
    path: '/viewer-dashboard',
    element: <ViewerDashboard />,
    requiresAuth: true,
    layout: 'default',
    roles: ['viewer']
  },

  // Knowledge base (markdown-backed)
  {
    path: '/knowledge-base/:sectionId?/:articleId?',
    element: <KnowledgeBase />,
    requiresAuth: true,
    layout: 'default',
    roles: ['admin', 'doctor', 'user', 'viewer']
  },
  {
    path: '/appointments',
    element: <AppointmentCalendarPage />,
    requiresAuth: true,
    layout: 'default',
    roles: ['admin', 'doctor', 'user', 'viewer']
  },
  // Patient routes - admin can create/edit, doctors can view their patients
  {
    path: '/patients',
    element: <PatientIndex />,
    requiresAuth: true,
    layout: 'default',
    roles: ['admin', 'doctor', 'user', 'viewer']
  },
  {
    path: '/patients/new',
    element: <PatientForm />,
    requiresAuth: true,
    layout: 'default',
    roles: ['admin', 'user']
  },
  {
    path: '/patients/:id',
    element: <PatientDetail />,
    requiresAuth: true,
    layout: 'default',
    roles: ['admin', 'doctor', 'user', 'viewer']
  },
  {
    path: '/patients/:id/edit',
    element: <PatientForm />,
    requiresAuth: true,
    layout: 'default',
    roles: ['admin', 'user']
  },
  {
    path: '/patients/:patientId/reports',
    element: <PatientReportList />,
    requiresAuth: true,
    layout: 'default',
    roles: ['admin', 'doctor', 'user', 'viewer']
  },
  {
    path: '/patients/:patientId/reports/new',
    element: <ReportFormWrapper />,
    requiresAuth: true,
    layout: 'default',
    roles: ['admin', 'user']
  },
  {
    path: '/reports/:reportId/edit',
    element: <ReportFormWrapper />,
    requiresAuth: true,
    layout: 'default',
    roles: ['admin', 'user']
  },
  {
    path: '/reports/builder',
    element: <ReportBuilder />,
    requiresAuth: true,
    layout: 'default',
    roles: ['admin', 'user']

  },
  {
    path: '/reports/saved',
    element: <ReportFormWrapper />,
    requiresAuth: true,
    layout: 'default',
    roles: ['admin', 'user']

  },
  {
    path: 'search/patients',
    element: <PatientSearch />,
    requiresAuth: true,
    layout: 'default',
    roles: ['admin', 'doctor', 'user', 'viewer']
  },
  // Doctor routes - admin only for create/edit
  {
    path: '/doctors',
    element: <DoctorIndex />,
    requiresAuth: true,
    layout: 'default',
    roles: ['admin', 'doctor', 'user']
  },
  {
    path: '/doctors/new',
    element: <DoctorForm />,
    requiresAuth: true,
    layout: 'default',
    roles: ['admin']
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
    layout: 'default',
    roles: ['admin']
  },

  // Device routes - admin only for create/edit/delete
  {
    path: '/devices',
    element: <DeviceIndex />,
    requiresAuth: true,
    layout: 'default',
    roles: ['admin']
  },
  {
    path: '/devices/new',
    element: <DeviceForm />,
    requiresAuth: true,
    layout: 'default',
    roles: ['admin']
  },
  {
    path: '/devices/:id',
    element: <DeviceDetail />,
    requiresAuth: true,
    layout: 'default',
    roles: ['admin']
  },
  {
    path: '/devices/:id/edit',
    element: <DeviceForm />,
    requiresAuth: true,
    layout: 'default',
    roles: ['admin']
  },

  // Lead routes - admin only for create/edit/delete
  {
    path: '/leads',
    element: <LeadIndex />,
    requiresAuth: true,
    layout: 'default',
    roles: ['admin']
  },
  {
    path: '/leads/new',
    element: <LeadForm />,
    requiresAuth: true,
    layout: 'default',
    roles: ['admin']
  },
  {
    path: '/leads/:id',
    element: <LeadDetail />,
    requiresAuth: true,
    layout: 'default',
    roles: ['admin']
  },
  {
    path: '/leads/:id/edit',
    element: <LeadForm />,
    requiresAuth: true,
    layout: 'default',
    roles: ['admin']
  },
  {
    path: '/tags',
    element: <TagManagement />,
    requiresAuth: true,
    layout: 'default',
    roles: ['admin']
  },
  // Tag management - admin only
  {
    path: '/admin/tags',
    element: <TagManagement />,
    requiresAuth: true,
    layout: 'default',
    roles: ['admin']
  },

  // Task management
  {
    path: '/tasks',
    element: <TaskList />,
    requiresAuth: true,
    layout: 'default',
    roles: ['admin', 'doctor', 'user', 'viewer']
  },
  {
    path: 'tasks/new',
    element: <TaskForm />,
    requiresAuth: true,
    layout: 'default',
    roles: ['admin', 'user']
  },
  {
    path: '/tasks/:id',
    element: <TaskDetail />,
    requiresAuth: true,
    layout: 'default',
    roles: ['admin', 'user']
  },
  {
    path: '/task-templates',
    element: <TaskTemplateManager />,
    requiresAuth: true,
    layout: 'default',
    roles: ['admin']
  },
  {
    path: '/patients/:patientId/tasks/new',
    element: <TaskForm />,
    requiresAuth: true,
    layout: 'default',
    roles: ['admin', 'user']
  },

  // Webhook routes - admin only
  {
    path: '/webhooks',
    element: <WebhooksPage />,
    requiresAuth: true,
    layout: 'default',
    roles: ['admin']
  },
  {
    path: '/webhooks/new',
    element: <WebhookFormPage />,
    requiresAuth: true,
    layout: 'default',
    roles: ['admin']
  },
  {
    path: '/webhooks/:id',
    element: <WebhookFormPage />,
    requiresAuth: true,
    layout: 'default',
    roles: ['admin']
  },

  // Productivity Reports - all authenticated users
  {
    path: '/productivity',
    element: <ProductivityReportPage />,
    requiresAuth: true,
    layout: 'default',
    roles: ['admin', 'user']
  }
]