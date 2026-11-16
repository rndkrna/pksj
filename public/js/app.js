/**
 * SIAKAD Client-side Script
 */

document.addEventListener('DOMContentLoaded', () => {
  // Auto-dismiss alerts after 5 seconds
  const alerts = document.querySelectorAll('.alert-dismissible');
  alerts.forEach(alert => {
    setTimeout(() => {
      const bsAlert = new bootstrap.Alert(alert);
      bsAlert.close();
    }, 6000);
  });

  // Client-side quick calculation of grade preview on input
  const gradeRows = document.querySelectorAll('tr[data-krs-row]');
  gradeRows.forEach(row => {
    const tugasInput = row.querySelector('input[name="nilai_tugas"]');
    const utsInput = row.querySelector('input[name="nilai_uts"]');
    const uasInput = row.querySelector('input[name="nilai_uas"]');
    const akhirCell = row.querySelector('.cell-nilai-akhir');
    const hurufBadge = row.querySelector('.badge-huruf-mutu');

    function updatePreview() {
      if (!tugasInput || !utsInput || !uasInput) return;
      const t = parseFloat(tugasInput.value) || 0;
      const u = parseFloat(utsInput.value) || 0;
      const a = parseFloat(uasInput.value) || 0;
      const total = (t * 0.3) + (u * 0.3) + (a * 0.4);
      if (akhirCell) akhirCell.textContent = total.toFixed(2);
    }

    if (tugasInput) tugasInput.addEventListener('input', updatePreview);
    if (utsInput) utsInput.addEventListener('input', updatePreview);
    if (uasInput) uasInput.addEventListener('input', updatePreview);
  });
});

