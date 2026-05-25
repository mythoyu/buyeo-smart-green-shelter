import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function isUbuntu(): Promise<{ isUbuntu: boolean; version?: string }> {
  try {
    const { stdout } = await execAsync('cat /etc/os-release');
    const lines = stdout.split('\n');
    let isUbuntu = false;
    let version = '';

    for (const line of lines) {
      if (line.startsWith('NAME=') && line.toLowerCase().includes('ubuntu')) {
        isUbuntu = true;
      }
      if (line.startsWith('VERSION_ID=')) {
        version = line.split('=')[1].replace(/"/g, '');
      }
    }

    return { isUbuntu, version };
  } catch {
    return { isUbuntu: false };
  }
}

export { execAsync };
