import jsPDF from 'jspdf'
import 'jspdf-autotable'

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

interface TimeTrackingData {
  summary: {
    totalHours: number
    totalEntries: number
    uniqueUsers: number
    uniqueProjects: number
    dateRange: {
      start: string
      end: string
    }
  }
  userStats: Array<{
    user: {
      name: string
      email: string
    }
    totalHours: number
    entriesCount: number
    projects: string[]
  }>
  projectStats: Array<{
    project: {
      name: string
      team: {
        name: string
      }
    }
    totalHours: number
    entriesCount: number
    users: string[]
  }>
}

interface ProjectProgressData {
  overallStats: {
    totalProjects: number
    totalTasks: number
    totalCompletedTasks: number
    totalLoggedHours: number
    averageCompletionRate: number
  }
  projectReports: Array<{
    project: {
      name: string
      status: string
      team: {
        name: string
      }
    }
    taskStats: {
      total: number
      completed: number
      inProgress: number
      todo: number
      overdue: number
      completionRate: number
    }
    timeStats: {
      totalLoggedHours: number
      totalEstimatedHours: number
      efficiency: number
    }
  }>
}

export function exportTimeTrackingToPDF(data: TimeTrackingData, filters: any) {
  const doc = new jsPDF()
  
  // Title
  doc.setFontSize(20)
  doc.text('Time Tracking Report', 20, 20)
  
  // Date range
  doc.setFontSize(12)
  const dateRange = filters.startDate && filters.endDate 
    ? `${filters.startDate} to ${filters.endDate}`
    : 'All time'
  doc.text(`Period: ${dateRange}`, 20, 35)
  
  // Summary section
  doc.setFontSize(16)
  doc.text('Summary', 20, 55)
  
  doc.setFontSize(12)
  const summaryData = [
    ['Total Hours', formatHours(data.summary.totalHours)],
    ['Total Entries', data.summary.totalEntries.toString()],
    ['Active Users', data.summary.uniqueUsers.toString()],
    ['Projects Involved', data.summary.uniqueProjects.toString()]
  ]
  
  doc.autoTable({
    startY: 65,
    head: [['Metric', 'Value']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [66, 139, 202] }
  })
  
  // User Statistics
  let currentY = (doc as any).lastAutoTable.finalY + 20
  
  doc.setFontSize(16)
  doc.text('User Statistics', 20, currentY)
  
  const userTableData = data.userStats.map(user => [
    user.user.name || user.user.email,
    formatHours(user.totalHours),
    user.entriesCount.toString(),
    user.projects.join(', ')
  ])
  
  doc.autoTable({
    startY: currentY + 10,
    head: [['User', 'Total Hours', 'Entries', 'Projects']],
    body: userTableData,
    theme: 'grid',
    headStyles: { fillColor: [66, 139, 202] },
    columnStyles: {
      3: { cellWidth: 60 }
    }
  })
  
  // Project Statistics
  currentY = (doc as any).lastAutoTable.finalY + 20
  
  // Check if we need a new page
  if (currentY > 250) {
    doc.addPage()
    currentY = 20
  }
  
  doc.setFontSize(16)
  doc.text('Project Statistics', 20, currentY)
  
  const projectTableData = data.projectStats.map(project => [
    project.project.name,
    project.project.team.name,
    formatHours(project.totalHours),
    project.entriesCount.toString(),
    project.users.join(', ')
  ])
  
  doc.autoTable({
    startY: currentY + 10,
    head: [['Project', 'Team', 'Total Hours', 'Entries', 'Contributors']],
    body: projectTableData,
    theme: 'grid',
    headStyles: { fillColor: [66, 139, 202] },
    columnStyles: {
      4: { cellWidth: 50 }
    }
  })
  
  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(10)
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} - Page ${i} of ${pageCount}`,
      20,
      doc.internal.pageSize.height - 10
    )
  }
  
  return doc
}

export function exportProjectProgressToPDF(data: ProjectProgressData, filters: any) {
  const doc = new jsPDF()
  
  // Title
  doc.setFontSize(20)
  doc.text('Project Progress Report', 20, 20)
  
  // Date range
  doc.setFontSize(12)
  const dateRange = filters.startDate && filters.endDate 
    ? `${filters.startDate} to ${filters.endDate}`
    : 'All time'
  doc.text(`Period: ${dateRange}`, 20, 35)
  
  // Overall Summary
  doc.setFontSize(16)
  doc.text('Overall Summary', 20, 55)
  
  doc.setFontSize(12)
  const overallData = [
    ['Total Projects', data.overallStats.totalProjects.toString()],
    ['Total Tasks', data.overallStats.totalTasks.toString()],
    ['Completed Tasks', data.overallStats.totalCompletedTasks.toString()],
    ['Total Hours Logged', formatHours(data.overallStats.totalLoggedHours)],
    ['Average Completion Rate', `${data.overallStats.averageCompletionRate.toFixed(1)}%`]
  ]
  
  doc.autoTable({
    startY: 65,
    head: [['Metric', 'Value']],
    body: overallData,
    theme: 'grid',
    headStyles: { fillColor: [66, 139, 202] }
  })
  
  // Project Details
  let currentY = (doc as any).lastAutoTable.finalY + 20
  
  doc.setFontSize(16)
  doc.text('Project Details', 20, currentY)
  
  const projectTableData = data.projectReports.map(project => [
    project.project.name,
    project.project.team.name,
    project.project.status,
    project.taskStats.total.toString(),
    project.taskStats.completed.toString(),
    `${project.taskStats.completionRate.toFixed(1)}%`,
    formatHours(project.timeStats.totalLoggedHours),
    `${project.timeStats.efficiency.toFixed(1)}%`
  ])
  
  doc.autoTable({
    startY: currentY + 10,
    head: [['Project', 'Team', 'Status', 'Total Tasks', 'Completed', 'Completion %', 'Hours Logged', 'Efficiency %']],
    body: projectTableData,
    theme: 'grid',
    headStyles: { fillColor: [66, 139, 202] },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 20 },
      2: { cellWidth: 15 },
      3: { cellWidth: 15 },
      4: { cellWidth: 15 },
      5: { cellWidth: 15 },
      6: { cellWidth: 20 },
      7: { cellWidth: 15 }
    }
  })
  
  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(10)
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} - Page ${i} of ${pageCount}`,
      20,
      doc.internal.pageSize.height - 10
    )
  }
  
  return doc
}

function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}
