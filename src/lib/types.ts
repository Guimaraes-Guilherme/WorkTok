export type AccountType = 'profissional' | 'recrutador' | 'empresa';

export type Profile = {
  id: string;
  username: string;
  full_name: string;
  headline: string;
  bio: string;
  account_type: AccountType;
  areas: string[];
  skills: string[];
  avatar_url: string | null;
  open_to_work: boolean;
  onboarded: boolean;
  created_at: string;
};

export type FeedPost = {
  id: string;
  author_id: string;
  kind: 'foto' | 'video';
  media_url: string;
  caption: string;
  area: string | null;
  external_link: string | null;
  created_at: string;
  author_username: string;
  author_name: string;
  author_headline: string;
  author_avatar: string | null;
  like_count: number;
  comment_count: number;
};

export type Job = {
  id: string;
  author_id: string;
  title: string;
  company_name: string;
  location: string;
  work_mode: string;
  contract: string;
  salary_range: string | null;
  description: string;
  area: string;
  skills: string[];
  is_open: boolean;
  created_at: string;
  author_username: string;
  author_name: string;
  author_avatar: string | null;
};

export type FeedItem =
  | { type: 'post'; key: string; post: FeedPost }
  | { type: 'job'; key: string; job: Job };

export type PresentationVideo = {
  user_id: string;
  slot: number;
  title: string;
  video_url: string;
  duration_seconds: number;
};

export type Conversation = {
  id: string;
  user_a: string;
  user_b: string;
  started_by: string;
  job_id: string | null;
  last_message: string | null;
  last_message_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export function isRecruiter(p?: Pick<Profile, 'account_type'> | null) {
  return p?.account_type === 'recrutador' || p?.account_type === 'empresa';
}
