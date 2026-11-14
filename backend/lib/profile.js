// lib/profile.js — a student's details: the checks, and the columns they are
// saved to. Used by sign-up, the student's own profile page and the admin's
// "Add student", so all three accept exactly the same details.

const EXAMS        = ['neet', 'jee-main', 'jee-advanced'];
const GRADES       = ['Class 11', 'Class 12', 'Dropper / repeater'];
const MIN_PASSWORD = 8;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normEmail  = (email) => String(email || '').trim().toLowerCase();
const clean      = (v, max = 80) => String(v || '').trim().slice(0, max);
const blank      = (v) => v == null || String(v).trim() === '';

// { field, error } for the first invalid detail, or null. With `optional`,
// target year, state and city may be left empty (an admin adding a student may
// not know them; the student fills them in later).
const checkProfile = (b, { optional = false } = {}) => {
  const year = new Date().getFullYear();
  const ty   = Number(b.targetYear);
  if (clean(b.name).length < 2)                    return { field: 'name', error: 'Enter the full name.' };
  if (!/^[6-9]\d{9}$/.test(String(b.phone || ''))) return { field: 'phone', error: 'Enter a valid 10-digit mobile number.' };
  if (!EXAMS.includes(b.exam))                     return { field: 'exam', error: 'Choose the exam.' };
  if (!GRADES.includes(b.grade))                   return { field: 'grade', error: 'Choose the class.' };
  if (!(optional && blank(b.targetYear)) && !(Number.isInteger(ty) && ty >= year && ty <= year + 3)) {
    return { field: 'targetYear', error: 'Choose the exam year.' };
  }
  if (!(optional && blank(b.state)) && clean(b.state).length < 2) return { field: 'state', error: 'Enter the state.' };
  if (!(optional && blank(b.city)) && clean(b.city).length < 2)   return { field: 'city', error: 'Enter the city.' };
  return null;
};

const checkPassword = (p, field = 'password') =>
  !p || String(p).length < MIN_PASSWORD ? { field, error: `Password must be at least ${MIN_PASSWORD} characters long.` } : null;

// The User columns for checked details.
const profileData = (b) => ({
  name:       clean(b.name),
  phone:      String(b.phone),
  exam:       b.exam,
  grade:      b.grade,
  targetYear: blank(b.targetYear) ? null : Number(b.targetYear),
  state:      clean(b.state) || null,
  city:       clean(b.city) || null,
});

module.exports = { EXAMS, GRADES, MIN_PASSWORD, emailRegex, normEmail, clean, checkProfile, checkPassword, profileData };
