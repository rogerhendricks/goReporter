import type { ReactNode } from 'react'
import Home from '@/pages/Home'
import Login from '@/components/auth/Login'
// import Register from '@/components/auth/Register'
import Unauthorized from '@/components/auth/Unauthorized'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import DoctorDashboard from '@/pages/DoctorDashboard'
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
import { TagManagement } from '@/components/admin/TagManagement'
import { TaskList } from '@/components/tasks/TaskList'
import { TaskForm } from '@/components/forms/TaskForm'
import { TaskDetail } from '@/components/tasks/TaskDetail'
import { TaskTemplateManager } from '@/components/admin/TaskTemplateManager'
import { ReportBuilder } from '@/components/report-builder/ReportBuilder'
import WebhooksPage from '@/pages/WebhooksPage'
import WebhookFormPage from '@/pages/WebhookFormPage'
import ProductivityReportPage from '@/pages/ProductivityReportPage'
import KnowledgeBase from '@/pages/KnowledgeBase'
import AppointmentCalendarPage from '@/pages/appointments/AppointmentCalendarPage'


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
    path:'/reports/saved',
    element:<ReportFormWrapper />,
    requiresAuth:true,
    layout:'default',
    roles:['admin','user'] 

  },
  { path: 'search/patients', 
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
    layout: 'default'
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
    roles: ['admin', 'doctor', 'user']
  },
  {
    path: '/tasks/:id',
    element: <TaskDetail />,
    requiresAuth: true,
    layout: 'default',
    roles: ['admin', 'doctor', 'user']
  },
  {
    path: '/task-templates',
    element: <TaskTemplateManager />,
    requiresAuth: true,
    layout: 'default',
    roles: ['admin']
  },
  {
    path: '/patients/:patientId/tasks/mew',
    element: <TaskForm />,
    requiresAuth: true,
    layout: 'default',
    roles: ['admin', 'doctor', 'user']
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
    roles: ['admin', 'doctor', 'user']
  }
]