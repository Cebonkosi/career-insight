import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

// Application forms and live-session recordings saved on the device, so they
// can be reopened later and recordings can play offline (UAT DL-006/008,
// LIVE-007/008). Files live in the app's document directory, which the OS
// does not clear.

const FORMS_DIR = 'forms';
const RECORDINGS_DIR = 'recordings';

function fileNameFromUrl(url: string, fallback: string) {
  try {
    const path = new URL(url).pathname;
    const name = decodeURIComponent(path.slice(path.lastIndexOf('/') + 1));
    return name.replace(/[^\w.\- ]/g, '_') || fallback;
  } catch {
    return fallback;
  }
}

function ensureDir(...parts: string[]) {
  const dir = new Directory(Paths.document, ...parts);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

async function downloadTo(url: string, dir: Directory, name: string) {
  const target = new File(dir, name);
  // Replacing keeps a re-download fresh if the admin swapped the form (OPP-006).
  if (target.exists) target.delete();
  const saved = await File.downloadFileAsync(url, target);
  if (!saved.exists || saved.size === 0) {
    if (saved.exists) saved.delete();
    throw new Error('The file could not be saved. Check your connection and try again.');
  }
  return saved;
}

export const deviceFilesSupported = Platform.OS !== 'web';

// ----- Application forms -----------------------------------------------------

export function localForm(opportunityId: string) {
  if (!deviceFilesSupported) return null;
  const dir = new Directory(Paths.document, FORMS_DIR, opportunityId);
  if (!dir.exists) return null;
  const file = dir.list().find((item): item is File => item instanceof File);
  return file && file.exists ? file : null;
}

/** Saves the form on the device and returns it. Throws if the download fails, so nothing is recorded. */
export async function downloadForm(opportunityId: string, formUrl: string) {
  const dir = ensureDir(FORMS_DIR, opportunityId);
  for (const item of dir.list()) item.delete();
  return downloadTo(formUrl, dir, fileNameFromUrl(formUrl, 'application-form.pdf'));
}

/** Opens a saved file in the system viewer / share sheet (Save to Files, Drive, a PDF reader…). */
export async function openFile(file: File, title: string) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Opening files is not supported on this device.');
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: file.type || undefined,
    dialogTitle: title,
  });
}

/** Web has no device file storage: open the hosted file in a new tab instead. */
export async function openRemote(url: string) {
  await WebBrowser.openBrowserAsync(url);
}

// ----- Recordings --------------------------------------------------------------

export function localRecording(streamId: string) {
  if (!deviceFilesSupported) return null;
  const dir = new Directory(Paths.document, RECORDINGS_DIR, streamId);
  if (!dir.exists) return null;
  const file = dir.list().find((item): item is File => item instanceof File);
  return file && file.exists ? file : null;
}

export async function downloadRecording(streamId: string, recordingUrl: string) {
  const dir = ensureDir(RECORDINGS_DIR, streamId);
  for (const item of dir.list()) item.delete();
  return downloadTo(recordingUrl, dir, fileNameFromUrl(recordingUrl, 'recording.mp4'));
}

export function deleteRecording(streamId: string) {
  const dir = new Directory(Paths.document, RECORDINGS_DIR, streamId);
  if (dir.exists) dir.delete();
}

/** Stream ids that have a recording saved on this device. */
export function downloadedRecordingIds() {
  if (!deviceFilesSupported) return [];
  const root = new Directory(Paths.document, RECORDINGS_DIR);
  if (!root.exists) return [];
  return root
    .list()
    .filter((item): item is Directory => item instanceof Directory)
    .filter((dir) => dir.list().some((f) => f instanceof File))
    .map((dir) => dir.name);
}
