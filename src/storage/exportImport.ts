import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { parseScenarioFile, serializeScenarioFile } from '@/domain/migrate';
import type { Scenario } from '@/domain/types';

function fileName(): string {
  return `finance-chart-${new Date().toISOString().slice(0, 10)}.json`;
}

export async function exportScenario(scenario: Scenario): Promise<void> {
  const json = serializeScenarioFile(scenario);
  if (Capacitor.isNativePlatform()) {
    // В нативной сборке скачивания нет — пишем файл в кэш и открываем системный share sheet.
    const { uri } = await Filesystem.writeFile({
      path: fileName(),
      data: json,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({ title: 'Finance Chart', url: uri });
    return;
  }
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName();
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function importScenarioFromFile(file: File): Promise<Scenario> {
  return parseScenarioFile(await file.text());
}
