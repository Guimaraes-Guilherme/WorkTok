import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

export const MAX_PRESENTATION_SECONDS = 180; // 3 minutos
export const MAX_POST_VIDEO_SECONDS = 180;

export type PickedMedia = {
  uri: string;
  mimeType: string;
  durationSeconds: number | null;
  width: number;
  height: number;
};

/** Abre a galeria (ou câmera) e devolve a mídia escolhida */
export async function pickMedia(
  kind: 'foto' | 'video',
  opts: { camera?: boolean; maxSeconds?: number } = {},
): Promise<PickedMedia | null> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: kind === 'foto' ? ['images'] : ['videos'],
    quality: 0.8,
    allowsEditing: kind === 'foto',
    aspect: kind === 'foto' ? [4, 5] : undefined,
    videoMaxDuration: kind === 'video' ? opts.maxSeconds ?? MAX_POST_VIDEO_SECONDS : undefined,
  };

  if (opts.camera) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error('Permita o acesso à câmera nas configurações.');
  } else {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) throw new Error('Permita o acesso às fotos nas configurações.');
  }

  const result = opts.camera
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.length) return null;

  const a = result.assets[0];
  return {
    uri: a.uri,
    mimeType: a.mimeType ?? (kind === 'foto' ? 'image/jpeg' : 'video/mp4'),
    // o picker devolve a duração em milissegundos
    durationSeconds: a.duration != null ? Math.round(a.duration / 1000) : null,
    width: a.width,
    height: a.height,
  };
}

function extFromMime(mime: string) {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('heic')) return 'heic';
  if (mime.includes('quicktime')) return 'mov';
  if (mime.startsWith('video')) return 'mp4';
  return 'jpg';
}

/** Envia o arquivo para o bucket "media", na pasta do usuário, e devolve a URL pública */
export async function uploadMedia(userId: string, media: PickedMedia, folder: string) {
  const ext = extFromMime(media.mimeType);
  const path = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const body = await fetch(media.uri).then((r) => r.arrayBuffer());

  const { error } = await supabase.storage.from('media').upload(path, body, {
    contentType: media.mimeType,
    upsert: false,
  });
  if (error) throw error;

  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
}
