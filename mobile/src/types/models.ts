// Row shapes for the tables the mobile app reads. They mirror
// supabase/migrations/ (0001–0004); regenerate with `supabase gen types` if
// these drift.

export type UserRole = 'student' | 'parent' | 'contributor' | 'admin';

export type ContributorType =
  | 'university'
  | 'college'
  | 'company'
  | 'ngo'
  | 'government'
  | 'professional'
  | 'tutor';

/** The signed-in user's own full profile (other people's are ProfileCards). */
export type UserProfile = {
  id: string;
  user_id: string;
  role: UserRole;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  province: string | null;
  city: string | null;
  phone: string | null;
  grade: number | null;
  school: string | null;
  contributor_type: ContributorType | null;
  organization_name: string | null;
  website: string | null;
  verified: boolean;
  can_host_live: boolean;
  followers_count: number;
  following_count: number;
  onboarding_complete: boolean;
};

/** Public, non-sensitive profile fields from the `profile_cards` view. */
export type ProfileCard = {
  user_id: string;
  role: UserRole;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  province: string | null;
  contributor_type: ContributorType | null;
  organization_name: string | null;
  organization_logo: string | null;
  website: string | null;
  verified: boolean;
  followers_count: number;
  following_count: number;
  created_at: string;
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
  contributor_id: string | null;
  contributor_name: string | null;
  contributor_logo: string | null;
  description: string | null;
  requirements: string | null;
  eligibility_grades: number[] | null;
  application_url: string | null;
  external_instructions: string | null;
  form_url: string | null;
  deadline: string | null;
  location: string | null;
  is_remote: boolean;
  province: string | null;
  value: string | null;
  /** Cover image. */
  image_url: string | null;
  featured: boolean;
  downloads_count: number;
  published_at: string | null;
};

/** A Saved Downloads row: a form the user has downloaded. Not an application. */
export type SavedDownload = {
  id: string;
  opportunity_id: string | null;
  opportunity_title: string | null;
  opportunity_type: OpportunityType | null;
  organization_name: string | null;
  download_date: string;
  last_downloaded_at: string | null;
  times_downloaded: number;
  deadline: string | null;
  form_url: string | null;
};

export type PostType = 'article' | 'tip' | 'story' | 'announcement' | 'question';
export type PostStatus = 'published' | 'draft' | 'flagged' | 'removed';

export type Post = {
  id: string;
  author_id: string;
  author_name: string | null;
  author_avatar: string | null;
  author_role: UserRole | null;
  content: string;
  media_urls: string[] | null;
  post_type: PostType | null;
  likes_count: number;
  comments_count: number;
  status: PostStatus;
  created_at: string;
  updated_at: string;
};

export type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string | null;
  author_avatar: string | null;
  content: string;
  status: 'published' | 'flagged' | 'removed';
  created_at: string;
};

export type LiveStatus = 'upcoming' | 'live' | 'ended';

export type LiveStream = {
  id: string;
  title: string;
  description: string | null;
  stream_url: string;
  host_id: string;
  host_name: string | null;
  host_avatar: string | null;
  host_role: UserRole | null;
  status: LiveStatus;
  scheduled_date: string | null;
  started_at: string | null;
  ended_at: string | null;
  category: string | null;
  image_url: string | null;
  viewers_count: number;
  recording_url: string | null;
  created_at: string;
};

export type NotificationType = 'like' | 'comment' | 'follow' | 'opportunity' | 'system' | 'mention';

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  actor_name: string | null;
  created_at: string;
};

export type ContributorAnalytics = {
  followers_total: number;
  new_followers: number;
  posts: number;
  likes: number;
  comments: number;
  sessions: number;
  session_viewers: number;
  top_posts: { id: string; content: string; likes_count: number; comments_count: number; created_at: string }[];
  opportunities: { id: string; title: string; views: number; downloads: number; unique_downloaders: number }[];
};

export type PlatformAnalytics = {
  views: number;
  downloads: number;
  unique_downloaders: number;
  new_students: number;
  new_parents: number;
  posts: number;
  comments: number;
  likes: number;
  live_viewers: number;
};
