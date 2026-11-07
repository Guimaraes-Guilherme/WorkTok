import { supabase } from './supabase';
import type { FeedItem, FeedPost, Job, PresentationVideo, Profile } from './types';

const PAGE = 20;
const JOB_EVERY = 4; // uma vaga a cada 4 posts no feed

// ---------------- FEED ----------------

/** Mistura posts e vagas: 4 posts, 1 vaga, 4 posts, 1 vaga... */
function interleave(posts: FeedPost[], jobs: Job[]): FeedItem[] {
  const out: FeedItem[] = [];
  let j = 0;
  posts.forEach((post, i) => {
    out.push({ type: 'post', key: `p-${post.id}`, post });
    if ((i + 1) % JOB_EVERY === 0 && j < jobs.length) {
      const job = jobs[j++];
      out.push({ type: 'job', key: `j-${job.id}`, job });
    }
  });
  while (j < jobs.length && out.length < 3) {
    const job = jobs[j++];
    out.push({ type: 'job', key: `j-${job.id}`, job });
  }
  return out;
}

export async function fetchFeed(
  mode: 'pra-voce' | 'seguindo',
  me: Profile,
  before?: string,
): Promise<{ items: FeedItem[]; cursor?: string }> {
  let postsQ = supabase.from('feed_posts').select('*').order('created_at', { ascending: false }).limit(PAGE);
  if (before) postsQ = postsQ.lt('created_at', before);

  if (mode === 'seguindo') {
    const { data: f } = await supabase.from('follows').select('following_id').eq('follower_id', me.id);
    const ids = (f ?? []).map((r) => r.following_id as string);
    if (!ids.length) return { items: [] };
    postsQ = postsQ.in('author_id', ids);
  } else if (me.areas.length) {
    postsQ = postsQ.in('area', me.areas);
  }

  let jobsQ = supabase
    .from('feed_jobs')
    .select('*')
    .eq('is_open', true)
    .order('created_at', { ascending: false })
    .limit(Math.ceil(PAGE / JOB_EVERY));
  if (me.areas.length) jobsQ = jobsQ.in('area', me.areas);
  if (before) jobsQ = jobsQ.lt('created_at', before);

  const [{ data: posts, error }, { data: jobs }] = await Promise.all([
    postsQ,
    mode === 'pra-voce' ? jobsQ : Promise.resolve({ data: [] as Job[] }),
  ]);
  if (error) throw error;

  let list = (posts ?? []) as FeedPost[];
  // se a área ainda não tem conteúdo, mostra o geral para o feed não ficar vazio
  if (mode === 'pra-voce' && !list.length && !before && me.areas.length) {
    const { data } = await supabase.from('feed_posts').select('*').order('created_at', { ascending: false }).limit(PAGE);
    list = (data ?? []) as FeedPost[];
  }

  const items = interleave(list, (jobs ?? []) as Job[]);
  const cursor = list.length === PAGE ? list[list.length - 1].created_at : undefined;
  return { items, cursor };
}

// ---------------- CURTIR / SALVAR / COMENTAR ----------------

export async function myLikedIds(userId: string, postIds: string[]) {
  if (!postIds.length) return new Set<string>();
  const { data } = await supabase.from('post_likes').select('post_id').eq('user_id', userId).in('post_id', postIds);
  return new Set((data ?? []).map((r) => r.post_id as string));
}

export async function mySavedIds(userId: string, postIds: string[]) {
  if (!postIds.length) return new Set<string>();
  const { data } = await supabase.from('post_saves').select('post_id').eq('user_id', userId).in('post_id', postIds);
  return new Set((data ?? []).map((r) => r.post_id as string));
}

export async function setLike(userId: string, postId: string, like: boolean) {
  const q = like
    ? supabase.from('post_likes').insert({ user_id: userId, post_id: postId })
    : supabase.from('post_likes').delete().eq('user_id', userId).eq('post_id', postId);
  const { error } = await q;
  if (error && !error.message.includes('duplicate')) throw error;
}

export async function setSave(userId: string, postId: string, save: boolean) {
  const q = save
    ? supabase.from('post_saves').insert({ user_id: userId, post_id: postId })
    : supabase.from('post_saves').delete().eq('user_id', userId).eq('post_id', postId);
  const { error } = await q;
  if (error && !error.message.includes('duplicate')) throw error;
}

export type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  author: { username: string; full_name: string; avatar_url: string | null } | null;
};

export async function fetchComments(postId: string) {
  const { data, error } = await supabase
    .from('comments')
    .select('id, body, created_at, author_id, author:profiles(username, full_name, avatar_url)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as CommentRow[];
}

export async function addComment(userId: string, postId: string, body: string) {
  const { error } = await supabase.from('comments').insert({ author_id: userId, post_id: postId, body });
  if (error) throw error;
}

// ---------------- PERFIL ----------------

export async function fetchProfile(id: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Profile;
}

export async function fetchStats(id: string) {
  const { data } = await supabase.rpc('profile_stats', { uid: id });
  const row = Array.isArray(data) ? data[0] : data;
  return (row ?? { following: 0, followers: 0, likes: 0 }) as { following: number; followers: number; likes: number };
}

export async function fetchUserPosts(id: string) {
  const { data, error } = await supabase
    .from('feed_posts')
    .select('*')
    .eq('author_id', id)
    .order('created_at', { ascending: false })
    .limit(60);
  if (error) throw error;
  return (data ?? []) as FeedPost[];
}

export async function fetchSavedPosts(userId: string) {
  const { data } = await supabase
    .from('post_saves')
    .select('post_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(60);
  const ids = (data ?? []).map((r) => r.post_id as string);
  if (!ids.length) return [];
  const { data: posts } = await supabase.from('feed_posts').select('*').in('id', ids);
  return (posts ?? []) as FeedPost[];
}

export async function fetchLikedPosts(userId: string) {
  const { data } = await supabase
    .from('post_likes')
    .select('post_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(60);
  const ids = (data ?? []).map((r) => r.post_id as string);
  if (!ids.length) return [];
  const { data: posts } = await supabase.from('feed_posts').select('*').in('id', ids);
  return (posts ?? []) as FeedPost[];
}

export async function fetchPresentations(userId: string) {
  const { data } = await supabase.from('presentation_videos').select('*').eq('user_id', userId).order('slot');
  return (data ?? []) as PresentationVideo[];
}

export async function isFollowing(me: string, other: string) {
  const { data } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', me)
    .eq('following_id', other)
    .maybeSingle();
  return Boolean(data);
}

export async function setFollow(me: string, other: string, follow: boolean) {
  const q = follow
    ? supabase.from('follows').insert({ follower_id: me, following_id: other })
    : supabase.from('follows').delete().eq('follower_id', me).eq('following_id', other);
  const { error } = await q;
  if (error && !error.message.includes('duplicate')) throw error;
}

export async function canStartChat(me: string, other: string) {
  const { data } = await supabase.rpc('can_start_chat', { me, other });
  return Boolean(data);
}

// ---------------- VAGAS ----------------

export async function fetchJobs(areas: string[], search?: string) {
  let q = supabase.from('feed_jobs').select('*').eq('is_open', true).order('created_at', { ascending: false }).limit(50);
  if (areas.length) q = q.in('area', areas);
  if (search) q = q.ilike('title', `%${search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Job[];
}

export async function fetchJob(id: string) {
  const { data, error } = await supabase.from('feed_jobs').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Job;
}

export async function hasApplied(userId: string, jobId: string) {
  const { data } = await supabase
    .from('job_applications')
    .select('status')
    .eq('job_id', jobId)
    .eq('applicant_id', userId)
    .maybeSingle();
  return (data?.status as string | undefined) ?? null;
}

/** Candidata e devolve o id da conversa aberta com quem publicou a vaga */
export async function applyToJob(jobId: string) {
  const { data, error } = await supabase.rpc('apply_to_job', { job: jobId });
  if (error) throw error;
  return data as string;
}

export async function setJobSave(userId: string, jobId: string, save: boolean) {
  const q = save
    ? supabase.from('job_saves').insert({ user_id: userId, job_id: jobId })
    : supabase.from('job_saves').delete().eq('user_id', userId).eq('job_id', jobId);
  const { error } = await q;
  if (error && !error.message.includes('duplicate')) throw error;
}

export async function isJobSaved(userId: string, jobId: string) {
  const { data } = await supabase.from('job_saves').select('job_id').eq('user_id', userId).eq('job_id', jobId).maybeSingle();
  return Boolean(data);
}

/** Quanto a vaga combina com o perfil (área + skills em comum) */
export function matchScore(job: Pick<Job, 'area' | 'skills'>, me: Pick<Profile, 'areas' | 'skills'>) {
  let score = me.areas.includes(job.area) ? 50 : 15;
  if (job.skills.length) {
    const mine = new Set(me.skills.map((s) => s.toLowerCase()));
    const hit = job.skills.filter((s) => mine.has(s.toLowerCase())).length;
    score += Math.round((hit / job.skills.length) * 50);
  } else {
    score += 25;
  }
  return Math.min(score, 100);
}

// ---------------- CHAT ----------------

export async function startConversation(other: string, jobId?: string) {
  const { data, error } = await supabase.rpc('start_conversation', { other, about_job: jobId ?? null });
  if (error) throw error;
  return data as string;
}

// ---------------- BUSCA ----------------

export async function search(term: string) {
  // remove caracteres que quebram o filtro do Supabase
  const t = term.trim().replace(/[,()%*]/g, ' ');
  const like = `%${t}%`;
  const [people, posts, jobs] = await Promise.all([
    supabase.from('profiles').select('*').or(`username.ilike.${like},full_name.ilike.${like},headline.ilike.${like}`).limit(30),
    supabase.from('feed_posts').select('*').ilike('caption', like).order('created_at', { ascending: false }).limit(30),
    supabase.from('feed_jobs').select('*').eq('is_open', true).or(`title.ilike.${like},company_name.ilike.${like}`).limit(30),
  ]);
  return {
    people: (people.data ?? []) as Profile[],
    posts: (posts.data ?? []) as FeedPost[],
    jobs: (jobs.data ?? []) as Job[],
  };
}
