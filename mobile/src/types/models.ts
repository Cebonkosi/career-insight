// Row shapes for the tables the mobile app reads. They mirror
// supabase/migrations/0001_init.sql; regenerate with `supabase gen types` once
// the CLI is linked if these drift.

export type UserRole = 'student' | 'parent' | 'contributor' | 'admin';

export type ContributorType =
  | 'university'
  | 'college'
  | 'company'
  | 'ngo'
  | 'government'
  | 'professional'
  | 'tutor';

export type UserProfile = {
  id: string;
  user_id: string;
  role: UserRole;
  display_name: string;
  avatar_url: string | null;
  province: string | null;
  city: string | null;
  grade: number | null;
  school: string | null;
  contributor_type: ContributorType | null;
  organization_name: string | null;
  verified: boolean;
  onboarding_complete: boolean;
};

export type OpportunityType =
  | 'scholarship'
  | 'bursary'
  | 'internship'
  | 'learnnership'
  | 'open_day'
  | 'workshop'
  | 'competition'
  | 'mentorship'
  | 'volunteer';

export type Opportunity = {
  id: string;
  title: string;
  type: OpportunityType;
  contributor_name: string | null;
  contributor_logo: string | null;
  description: string | null;
  requirements: string | null;
  eligibility_grades: number[] | null;
  application_url: string | null;
  form_url: string | null;
  deadline: string | null;
  location: string | null;
  is_remote: boolean;
  province: string | null;
  value: string | null;
  image_url: string | null;
  featured: boolean;
  downloads_count: number;
};

export type Application = {
  id: string;
  opportunity_id: string | null;
  opportunity_title: string | null;
  opportunity_type: OpportunityType | null;
  organization_name: string | null;
  download_date: string;
  deadline: string | null;
  form_url: string | null;
};
