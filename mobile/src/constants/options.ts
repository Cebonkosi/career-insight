import type { ContributorType, OpportunityType, UserRole } from '@/types/models';

export const OPPORTUNITY_TYPES: { value: OpportunityType; label: string; plural: string }[] = [
  { value: 'scholarship', label: 'Scholarship', plural: 'Scholarships' },
  { value: 'bursary', label: 'Bursary', plural: 'Bursaries' },
  { value: 'internship', label: 'Internship', plural: 'Internships' },
  // The schema spells this value with a double "n"; keep it in sync with the DB.
  { value: 'learnnership', label: 'Learnership', plural: 'Learnerships' },
  { value: 'open_day', label: 'Open Day', plural: 'Open days' },
  { value: 'workshop', label: 'Workshop', plural: 'Workshops' },
  { value: 'competition', label: 'Competition', plural: 'Competitions' },
  { value: 'mentorship', label: 'Mentorship', plural: 'Mentorships' },
  { value: 'volunteer', label: 'Volunteer', plural: 'Volunteering' },
];

export function opportunityTypeLabel(type: OpportunityType | null) {
  return OPPORTUNITY_TYPES.find((t) => t.value === type)?.label ?? 'Opportunity';
}

// Admins are created from the Supabase dashboard, not the app.
export const SIGN_UP_ROLES: { value: Exclude<UserRole, 'admin'>; label: string; hint: string }[] = [
  { value: 'student', label: 'Student', hint: 'Grade 8–12 learner' },
  { value: 'parent', label: 'Parent', hint: 'Supporting a learner' },
  { value: 'contributor', label: 'Contributor', hint: 'Institution, company or tutor' },
];

export const CONTRIBUTOR_TYPES: { value: ContributorType; label: string }[] = [
  { value: 'university', label: 'University' },
  { value: 'college', label: 'College' },
  { value: 'company', label: 'Company' },
  { value: 'ngo', label: 'NGO' },
  { value: 'government', label: 'Government' },
  { value: 'professional', label: 'Professional' },
  { value: 'tutor', label: 'Tutor' },
];

export const PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
  'Western Cape',
];

export const GRADES = [8, 9, 10, 11, 12];
