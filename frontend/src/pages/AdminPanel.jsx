import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import {
  Activity,
  BarChart3,
  Download,
  FileWarning,
  ListChecks,
  RefreshCw,
  ShieldAlert,
  Siren,
  Trash2,
  UserCog,
  Users,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import {
  deleteCrimeReport,
  deleteUser,
  getAdminUsers,
  getAuthRoles,
  getCrimeReports,
  getStats,
  getSystemLogs,
  updateUserRole,
} from '../services';
import { ROLE_LABELS, ROLES } from '../utils/roles';

const tabs = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'reports', label: 'Reports', icon: FileWarning },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'logs', label: 'Logs', icon: ListChecks },
];
const ADMIN_PAGE_LIMIT = 50;

const formatDate = (value) => {
  if (!value) {
    return 'Unknown';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString();
};

const getReportSnippet = (report) => (
  report.inputText ||
  report.prediction ||
  'No report text available'
);

const isEmergencyReport = (report) => Boolean(report.emergencyAlert?.detected);

const getEmergencyLabels = (alert) => (
  alert?.categories?.map((category) => category.label).join(', ') || ''
);

const csvValue = (value) => `"${String(value ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;

const getReportExportRows = (items) => items.map((report) => ({
  'Report ID': report._id,
  'Prediction ID': report.predictionId,
  'Created At': formatDate(report.createdAt),
  Status: report.status || 'new',
  Prediction: report.prediction || '',
  Confidence: `${Number(report.confidence || 0).toFixed(1)}%`,
  User: report.user?.name || 'Unknown',
  Role: report.user?.role || 'user',
  Alert: getEmergencyLabels(report.emergencyAlert),
  'Input Text': getReportSnippet(report)
}));

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const exportCsv = (rows, filename) => {
  const headers = Object.keys(rows[0] || {});
  const csvRows = [
    headers.map(csvValue).join(','),
    ...rows.map((row) => headers.map((header) => csvValue(row[header])).join(','))
  ];
  downloadBlob(new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' }), filename);
};

const exportExcel = (rows, filename) => {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 16 },
    { wch: 16 },
    { wch: 22 },
    { wch: 12 },
    { wch: 18 },
    { wch: 12 },
    { wch: 18 },
    { wch: 14 },
    { wch: 22 },
    { wch: 80 }
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Crime Reports');
  XLSX.writeFile(workbook, filename);
};

const exportPdf = (rows, filename) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const columns = [
    { label: 'Date', key: 'Created At', width: 96 },
    { label: 'ID', key: 'Report ID', width: 72 },
    { label: 'Status', key: 'Status', width: 52 },
    { label: 'Alert', key: 'Alert', width: 76 },
    { label: 'Prediction', key: 'Prediction', width: 78 },
    { label: 'Confidence', key: 'Confidence', width: 54 },
    { label: 'User', key: 'User', width: 78 },
    { label: 'Role', key: 'Role', width: 56 },
    { label: 'Text', key: 'Input Text', width: pageWidth - (margin * 2) - 562 }
  ];
  let y = margin;

  const drawTitle = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Export Crime Reports', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Created ${formatDate(new Date())}`, margin, y + 16);
    y += 42;
  };

  const drawHeader = () => {
    let x = margin;
    doc.setFillColor(30, 41, 59);
    doc.rect(margin, y, pageWidth - (margin * 2), 24, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    columns.forEach((column) => {
      doc.text(column.label, x + 4, y + 15, { maxWidth: column.width - 8 });
      x += column.width;
    });
    y += 24;
    doc.setTextColor(0, 0, 0);
  };

  drawTitle();
  drawHeader();

  rows.forEach((row, index) => {
    const cells = columns.map((column) => {
      const text = String(row[column.key] ?? '');
      return doc.splitTextToSize(text, column.width - 8).slice(0, column.key === 'Input Text' ? 3 : 2);
    });
    const rowHeight = Math.max(30, ...cells.map((cell) => cell.length * 10 + 12));

    if (y + rowHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      drawHeader();
    }

    let x = margin;
    doc.setFillColor(index % 2 === 0 ? 248 : 238, index % 2 === 0 ? 250 : 242, index % 2 === 0 ? 252 : 247);
    doc.rect(margin, y, pageWidth - (margin * 2), rowHeight, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    cells.forEach((cell, cellIndex) => {
      doc.text(cell, x + 4, y + 12, { maxWidth: columns[cellIndex].width - 8 });
      x += columns[cellIndex].width;
    });
    y += rowHeight;
  });

  doc.save(filename);
};

const AdminPanel = () => {
  const currentUser = useSelector((state) => state.auth.user);
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [reports, setReports] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [reportPagination, setReportPagination] = useState({ page: 1, pages: 1, total: 0, limit: ADMIN_PAGE_LIMIT });
  const [logPagination, setLogPagination] = useState({ page: 1, pages: 1, total: 0, limit: ADMIN_PAGE_LIMIT });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [deletingReportId, setDeletingReportId] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const roleCounts = useMemo(() => (
    users.reduce((counts, user) => {
      counts[user.role] = (counts[user.role] || 0) + 1;
      return counts;
    }, {})
  ), [users]);

  const loadAdminData = useCallback(async ({ reportsPage = 1, logsPage = 1, quiet = false } = {}) => {
    if (quiet) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [usersData, rolesData, statsData, reportsData, logsData] = await Promise.all([
        getAdminUsers(),
        getAuthRoles(),
        getStats(),
        getCrimeReports(reportsPage, ADMIN_PAGE_LIMIT),
        getSystemLogs(logsPage, ADMIN_PAGE_LIMIT),
      ]);

      setUsers(usersData.users || []);
      setRoles(rolesData.roles || []);
      setStats(statsData);
      setReports(reportsData.reports || []);
      setLogs(logsData.logs || []);
      setReportPagination(reportsData.pagination || { page: reportsPage, pages: 1, total: 0, limit: ADMIN_PAGE_LIMIT });
      setLogPagination(logsData.pagination || { page: logsPage, pages: 1, total: 0, limit: ADMIN_PAGE_LIMIT });
      setError(null);
    } catch (err) {
      setError(err.response?.data?.details || err.response?.data?.error || 'Admin data could not be loaded');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => loadAdminData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadAdminData]);

  const handleRoleChange = async (member, role) => {
    setUpdatingUserId(member._id);
    setNotice(null);
    setError(null);

    try {
      const data = await updateUserRole(member._id, role);
      setUsers((items) => items.map((item) => (item._id === member._id ? data.user : item)));
      setNotice(`${member.name}'s role is now ${ROLE_LABELS[data.user.role] || data.user.role}.`);
    } catch (err) {
      setError(err.response?.data?.details || err.response?.data?.error || 'The user role could not be updated');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteUser = async (member) => {
    const confirmed = window.confirm(`Delete ${member.name}'s account? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setDeletingUserId(member._id);
    setNotice(null);
    setError(null);

    try {
      await deleteUser(member._id);
      setUsers((items) => items.filter((item) => item._id !== member._id));
      setNotice('The user was deleted.');
    } catch (err) {
      setError(err.response?.data?.details || err.response?.data?.error || 'The user could not be deleted');
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleDeleteReport = async (report) => {
    const confirmed = window.confirm('Delete this report? This cannot be undone.');
    if (!confirmed) {
      return;
    }

    setDeletingReportId(report._id);
    setNotice(null);
    setError(null);

    try {
      await deleteCrimeReport(report._id);
      setReports((items) => items.filter((item) => item._id !== report._id));
      setReportPagination((pagination) => ({
        ...pagination,
        total: Math.max((pagination.total || 1) - 1, 0),
      }));
      setNotice('The report was deleted.');
    } catch (err) {
      setError(err.response?.data?.details || err.response?.data?.error || 'The report could not be deleted');
    } finally {
      setDeletingReportId(null);
    }
  };

  const exportReports = async (format = 'csv') => {
    setExporting(true);
    setNotice(null);
    setError(null);

    try {
      const limit = Math.max(reportPagination.total || reports.length || 1, 1);
      const data = await getCrimeReports(1, limit);
      const exportRows = getReportExportRows(data.reports || reports);
      const date = new Date().toISOString().slice(0, 10);

      if (exportRows.length === 0) {
        setNotice('There are no reports to export.');
        return;
      }

      if (format === 'pdf') {
        exportPdf(exportRows, `crime-reports-${date}.pdf`);
      } else if (format === 'excel') {
        exportExcel(exportRows, `crime-reports-${date}.xlsx`);
      } else {
        exportCsv(exportRows, `crime-reports-${date}.csv`);
      }

      setNotice(`${exportRows.length} reports were exported as ${format.toUpperCase()}.`);
    } catch (err) {
      setError(err.response?.data?.details || err.response?.data?.error || 'The reports could not be exported');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-8">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-primary mb-3">
            <ShieldAlert className="w-4 h-4" /> Admin
          </div>
          <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
        </div>

        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto xl:flex xl:flex-wrap xl:items-center">
          <button type="button" onClick={() => exportReports('pdf')} disabled={exporting || (reportPagination.total || 0) === 0} className="btn-outline w-full disabled:opacity-50 disabled:cursor-not-allowed xl:w-auto">
            {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export PDF
          </button>
          <button type="button" onClick={() => exportReports('csv')} disabled={exporting || (reportPagination.total || 0) === 0} className="btn-outline w-full disabled:opacity-50 disabled:cursor-not-allowed xl:w-auto">
            {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export CSV
          </button>
          <button type="button" onClick={() => exportReports('excel')} disabled={exporting || (reportPagination.total || 0) === 0} className="btn-outline w-full disabled:opacity-50 disabled:cursor-not-allowed xl:w-auto">
            {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export Excel
          </button>
          <button type="button" onClick={() => loadAdminData({ reportsPage: reportPagination.page, logsPage: logPagination.page, quiet: true })} className="btn-primary w-full xl:w-auto">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {(error || notice) && (
        <div className={`mb-6 rounded-lg border p-4 text-sm ${error ? 'border-danger/20 bg-danger/10 text-danger' : 'border-success/20 bg-success/10 text-success'}`}>
          {error || notice}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <MetricCard icon={<Users className="w-5 h-5 text-primary" />} label="Users" value={users.length} />
        <MetricCard icon={<FileWarning className="w-5 h-5 text-danger" />} label="Crime Reports" value={reportPagination.total} />
        <MetricCard icon={<Activity className="w-5 h-5 text-success" />} label="Analyticso" value={stats?.total || 0} />
        <MetricCard icon={<ListChecks className="w-5 h-5 text-purple-400" />} label="System Logs" value={logPagination.total} />
      </div>

      <div className="glass-panel p-2 mb-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-medium transition-colors sm:px-4 ${
                  active
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'text-textMuted hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'users' && (
        <Panel title="Manage Users" icon={<UserCog className="w-5 h-5 text-primary" />}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {roles.map((role) => (
              <div key={role.value} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <div className="text-2xl font-bold">{roleCounts[role.value] || 0}</div>
                <div className="text-xs uppercase tracking-wider text-textMuted">{role.label}</div>
              </div>
            ))}
          </div>

          <div className="table-scroll">
            <table className="responsive-table-wide w-full text-left border-collapse">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-textMuted border-b border-white/5">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Role</th>
                  <th className="pb-3 font-medium text-right">Joined</th>
                  <th className="pb-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((member, index) => {
                  const isCurrentUser = currentUser?._id === member._id;
                  return (
                    <motion.tr
                      key={member._id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="py-4 pr-4">
                        <div className="font-medium text-white/90">{member.name}</div>
                        {isCurrentUser && <div className="text-xs text-primary mt-1">Current session</div>}
                      </td>
                      <td className="py-4 pr-4 text-sm text-textMuted">{member.email}</td>
                      <td className="py-4 pr-4">
                        <select
                          value={member.role}
                          disabled={updatingUserId === member._id || (isCurrentUser && member.role === ROLES.ADMIN)}
                          onChange={(event) => handleRoleChange(member, event.target.value)}
                          className="glass-input w-full max-w-[220px] py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {roles.map((role) => (
                            <option key={role.value} value={role.value} className="bg-surface text-white">
                              {role.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-4 text-right text-sm text-textMuted whitespace-nowrap">{formatDate(member.createdAt)}</td>
                      <td className="py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(member)}
                          disabled={isCurrentUser || deletingUserId === member._id}
                          className="inline-flex items-center justify-center rounded-lg border border-danger/30 p-2 text-danger hover:bg-danger/10 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={isCurrentUser ? 'Current session' : 'Delete user'}
                        >
                          {deletingUserId === member._id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {activeTab === 'reports' && (
        <Panel title="Delete Reports" icon={<FileWarning className="w-5 h-5 text-danger" />}>
          <div className="table-scroll">
            <table className="responsive-table-wide w-full text-left border-collapse">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-textMuted border-b border-white/5">
                  <th className="pb-3 font-medium">History</th>
                  <th className="pb-3 font-medium">Report</th>
                  <th className="pb-3 font-medium">Submitted by</th>
                  <th className="pb-3 font-medium">Confidence</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {reports.length > 0 ? (
                  reports.map((report, index) => {
                    const emergency = isEmergencyReport(report);
                    return (
                      <motion.tr
                        key={report._id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={`transition-colors ${
                          emergency ? 'bg-danger/10 ring-1 ring-danger/20' : 'hover:bg-white/5'
                        }`}
                      >
                        <td className="py-4 pr-4 text-sm text-textMuted whitespace-nowrap">{formatDate(report.createdAt)}</td>
                        <td className="py-4 pr-4">
                          <div className="max-w-[420px] text-sm text-white/90 line-clamp-2">{getReportSnippet(report)}</div>
                          <div className="text-xs text-textMuted mt-1">{report.predictionId}</div>
                        </td>
                        <td className="py-4 pr-4 text-sm">
                          <div className="font-medium text-white/90">{report.user?.name || 'Unknown'}</div>
                          <div className="text-xs text-textMuted capitalize">{report.user?.role || 'user'}</div>
                        </td>
                        <td className="py-4 pr-4">
                          <span className="font-mono text-sm bg-white/5 px-2 py-1 rounded">{Number(report.confidence || 0).toFixed(1)}%</span>
                        </td>
                        <td className="py-4 pr-4">
                          <div className="flex flex-wrap gap-2">
                            {emergency && (
                              <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2 py-1 rounded border bg-danger/15 text-danger border-danger/40">
                                <Siren className="h-3 w-3" />
                                Urgent
                              </span>
                            )}
                            <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded border bg-danger/10 text-danger border-danger/20">
                              {report.status || 'new'}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteReport(report)}
                            disabled={deletingReportId === report._id}
                            className="inline-flex items-center justify-center rounded-lg border border-danger/30 p-2 text-danger hover:bg-danger/10 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete report"
                          >
                            {deletingReportId === report._id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="py-10 text-center text-textMuted">No crime reports found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            pagination={reportPagination}
            onPageChange={(page) => loadAdminData({ reportsPage: page, logsPage: logPagination.page, quiet: true })}
          />
        </Panel>
      )}

      {activeTab === 'analytics' && (
        <Panel title="View Analyticsta" icon={<BarChart3 className="w-5 h-5 text-success" />}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <MetricCard icon={<Activity className="w-5 h-5 text-primary" />} label="Total Analyses" value={stats?.total || 0} compact />
            <MetricCard icon={<ShieldAlert className="w-5 h-5 text-danger" />} label="Crime La Ogaaday" value={stats?.crime_count || 0} compact />
            <MetricCard icon={<FileWarning className="w-5 h-5 text-success" />} label="Safe Content" value={stats?.not_crime_count || 0} compact />
          </div>

          <div className="space-y-5">
            {stats?.by_type && Object.keys(stats.by_type).length > 0 ? (
              Object.entries(stats.by_type).map(([type, count]) => {
                const percentage = stats.total ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <div key={type}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="capitalize font-medium">{type}</span>
                      <span className="text-textMuted">{count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 w-full bg-surfaceLight rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.7 }}
                        className="h-full bg-primary rounded-full"
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-10 text-center text-textMuted">No analytics data yet.</div>
            )}
          </div>
        </Panel>
      )}

      {activeTab === 'logs' && (
        <Panel title="System Logs Monitor" icon={<ListChecks className="w-5 h-5 text-purple-400" />}>
          <div className="table-scroll">
            <table className="responsive-table-wide w-full text-left border-collapse">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-textMuted border-b border-white/5">
                  <th className="pb-3 font-medium">Time</th>
                  <th className="pb-3 font-medium">Level</th>
                  <th className="pb-3 font-medium">Action</th>
                  <th className="pb-3 font-medium">Message</th>
                  <th className="pb-3 font-medium">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.length > 0 ? (
                  logs.map((log, index) => (
                    <motion.tr
                      key={log._id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="py-4 pr-4 text-sm text-textMuted whitespace-nowrap">{formatDate(log.createdAt)}</td>
                      <td className="py-4 pr-4">
                        <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded border ${getLogLevelClass(log.level)}`}>
                          {log.level || 'info'}
                        </span>
                      </td>
                      <td className="py-4 pr-4 font-mono text-sm text-white/90">{log.action}</td>
                      <td className="py-4 pr-4 text-sm text-textMuted max-w-[360px]">{log.message || 'No message available'}</td>
                      <td className="py-4 text-sm">
                        <div className="font-medium text-white/90">{log.user?.name || 'System'}</div>
                        <div className="text-xs text-textMuted capitalize">{log.user?.role || 'service'}</div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-10 text-center text-textMuted">No logs recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            pagination={logPagination}
            onPageChange={(page) => loadAdminData({ reportsPage: reportPagination.page, logsPage: page, quiet: true })}
          />
        </Panel>
      )}
    </div>
  );
};

const getLogLevelClass = (level) => {
  if (level === 'error') {
    return 'bg-danger/10 text-danger border-danger/20';
  }
  if (level === 'warn') {
    return 'bg-amber-400/10 text-amber-300 border-amber-300/20';
  }
  return 'bg-success/10 text-success border-success/20';
};

const MetricCard = ({ icon, label, value, compact = false }) => (
  <div className={`glass-panel ${compact ? 'p-4' : 'p-5'}`}>
    <div className="flex items-center gap-3">
      <div className="bg-surface p-2 rounded-lg border border-white/5">{icon}</div>
      <div>
        <div className={compact ? 'text-2xl font-bold' : 'text-3xl font-bold'}>{value}</div>
        <div className="text-xs uppercase tracking-wider text-textMuted">{label}</div>
      </div>
    </div>
  </div>
);

const Panel = ({ title, icon, children }) => (
  <motion.section
    key={title}
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25 }}
    className="glass-panel p-4 sm:p-6"
  >
    <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-white/10 pb-4">
      {icon}
      <h2 className="text-xl font-bold">{title}</h2>
    </div>
    {children}
  </motion.section>
);

const Pagination = ({ pagination, onPageChange }) => (
  <div className="flex flex-col items-stretch justify-between gap-3 mt-6 pt-4 border-t border-white/10 sm:flex-row sm:items-center">
    <button
      type="button"
      className="btn-outline w-full disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
      disabled={pagination.page <= 1}
      onClick={() => onPageChange(pagination.page - 1)}
    >
      Previous
    </button>
    <span className="text-center text-sm text-textMuted">
      Page {pagination.page} / {pagination.pages || 1}
    </span>
    <button
      type="button"
      className="btn-outline w-full disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
      disabled={pagination.page >= pagination.pages}
      onClick={() => onPageChange(pagination.page + 1)}
    >
      Next
    </button>
  </div>
);

export default AdminPanel;
