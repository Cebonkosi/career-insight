import { useQueryClient } from '@tanstack/react-query';
import type { File } from 'expo-file-system';
import { useState } from 'react';
import { Alert } from 'react-native';

import { useAuth } from '@/hooks/use-auth';
import { deviceFilesSupported, downloadForm, localForm, openFile, openRemote } from '@/lib/device-files';
import { errorMessage } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { recordFormDownload } from '@/services/opportunities';

type FormTarget = { id: string; title: string; form_url: string | null };

/**
 * Downloads an application form to the device and only then records the
 * download (UAT DL-003/004/008, ANL-002). Web has no device storage, so the
 * file opens in a browser tab and is recorded once it has been handed over.
 */
export function useFormDownload(opportunityId: string) {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [saved, setSaved] = useState<File | null>(() => localForm(opportunityId));
  const [downloading, setDownloading] = useState(false);

  async function download(target: FormTarget) {
    if (!target.form_url) {
      Alert.alert('No form available', "This opportunity doesn't have a downloadable form yet.");
      return;
    }
    setDownloading(true);
    try {
      if (deviceFilesSupported) {
        const file = await downloadForm(target.id, target.form_url);
        setSaved(file);
        await recordFormDownload(target.id);
        Alert.alert('Form downloaded', 'It is saved in Profile → Saved Downloads. Open it to print, fill in or share.', [
          { text: 'Later', style: 'cancel' },
          { text: 'Open form', onPress: () => openFile(file, target.title).catch(() => {}) },
        ]);
      } else {
        await openRemote(target.form_url);
        await recordFormDownload(target.id);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.savedDownloads(session!.user.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunity(target.id) });
    } catch (err) {
      // Nothing is recorded when the file didn't arrive.
      Alert.alert('Download failed', errorMessage(err, 'Check your connection and try again.'));
    } finally {
      setDownloading(false);
    }
  }

  async function open(title: string) {
    if (!saved) return;
    try {
      await openFile(saved, title);
    } catch (err) {
      Alert.alert("Couldn't open the form", errorMessage(err, 'Try downloading it again.'));
    }
  }

  return { saved, downloading, download, open };
}
