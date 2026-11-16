/**
 * Helper Functions
 */

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function getCurrentAcademicYear() {
  return {
    tahunAjaran: '2026/2027',
    semesterType: 'ganjil'
  };
}

function gradeColor(huruf) {
  switch (huruf) {
    case 'A':
    case 'A-':
      return 'success';
    case 'B+':
    case 'B':
    case 'B-':
      return 'primary';
    case 'C+':
    case 'C':
      return 'warning';
    case 'D':
    case 'E':
      return 'danger';
    default:
      return 'secondary';
  }
}

module.exports = {
  formatDate,
  formatDateShort,
  getCurrentAcademicYear,
  gradeColor
};

