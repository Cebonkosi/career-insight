import { File } from 'expo-file-system';
import type { ImagePickerAsset } from 'expo-image-picker';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

// Limits match the storage buckets set in migration 0004 (UAT POST-012).
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const VIDEO_TYPES = ['video/mp4', 'video/quicktime'];
export const MAX_RECORDING_BYTES = 50 * 1024 * 1024;

export class UploadRejected extends Error {}

function extensionFor(mime: string) {
  return { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/quicktime': 'mov' }[
    mime
  ];
}

/** Throws UploadRejected with a learner-friendly message when the asset isn't allowed. */
export function validateAsset(asset: ImagePickerAsset, kind: 'image' | 'video') {
  const types = kind === 'image' ? IMAGE_TYPES : VIDEO_TYPES;
  const max = kind === 'image' ? MAX_IMAGE_BYTES : MAX_RECORDING_BYTES;
  const mime = asset.mimeType ?? '';
  if (!types.includes(mime)) {
    throw new UploadRejected(
      kind === 'image' ? 'Please choose a JPG, PNG or WebP image.' : 'Please choose an MP4 or MOV video.'
    );
  }
  if (asset.fileSize && asset.fileSize > max) {
    throw new UploadRejected(`That file is too large. The limit is ${Math.round(max / 1024 / 1024)} MB.`);
  }
  return mime;
}

async function assetBytes(asset: ImagePickerAsset) {
  if (Platform.OS === 'web') {
    return await (await fetch(asset.uri)).arrayBuffer();
  }
  return await new File(asset.uri).bytes();
}

async function upload(bucket: string, folder: string, asset: ImagePickerAsset, mime: string) {
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extensionFor(mime)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, await assetBytes(asset), {
    contentType: mime,
    upsert: false,
  });
  if (error) {
    // The bucket's own type/size limits are the final check.
    throw new UploadRejected(error.message);
  }
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export function uploadPostImage(userId: string, asset: ImagePickerAsset) {
  return upload('public-media', `posts/${userId}`, asset, validateAsset(asset, 'image'));
}

export function uploadAvatar(userId: string, asset: ImagePickerAsset) {
  return upload('public-media', `avatars/${userId}`, asset, validateAsset(asset, 'image'));
}

export function uploadRecording(userId: string, asset: ImagePickerAsset) {
  return upload('recordings', userId, asset, validateAsset(asset, 'video'));
}
