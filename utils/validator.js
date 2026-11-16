/**
 * Validasi Input Server-Side
 * R-02: Server-side validation
 * R-01: Kebijakan Password Kuat
 */

// Kebijakan Password Kuat (R-01)
function validatePassword(password) {
  const errors = [];
  if (!password || password.length < 8) {
    errors.push('Password minimal 8 karakter');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password harus memiliki minimal 1 huruf besar (A-Z)');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password harus memiliki minimal 1 huruf kecil (a-z)');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password harus memiliki minimal 1 angka (0-9)');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password harus memiliki minimal 1 karakter spesial (@, #, $, !, dll)');
  }
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Sanitasi string input sederhana
function sanitizeText(str) {
  if (typeof str !== 'string') return '';
  return str.trim();
}

// Validasi rentang nilai angka 0 - 100
function isValidScore(val) {
  if (val === null || val === undefined || val === '') return false;
  const num = Number(val);
  return !isNaN(num) && num >= 0 && num <= 100;
}

// Validasi Email
function isValidEmail(email) {
  if (!email) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

module.exports = {
  validatePassword,
  sanitizeText,
  isValidScore,
  isValidEmail
};

