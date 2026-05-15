import { spawn } from 'child_process';

export class OpenClawHandler {
  static async handle(action: string, params: any) {
    if (action === 'whatsapp:send') {
      return this.sendMessage(params.to, params.message);
    }
    throw new Error(`Unsupported WhatsApp action: ${action}`);
  }

  private static async sendMessage(to: string, message: string): Promise<any> {
    return new Promise((resolve, reject) => {
      console.log(`Executing OpenClaw CLI for target: ${to}`);
      
      const args = [
        'message',
        'send',
        '--channel', 'whatsapp',
        '--target', to,
        '--message', message
      ];

      // Direct path to the binary, no sudo needed as we will run the service as 'openclaw' user
      const child = spawn('/home/openclaw/.nvm/versions/node/v24.15.0/bin/openclaw', args);

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ status: 'success', output: stdout.trim() });
        } else {
          reject(new Error(`OpenClaw CLI failed with code ${code}. Error: ${stderr.trim()}`));
        }
      });

      child.on('error', (err) => {
        reject(new Error(`Failed to start OpenClaw process: ${err.message}`));
      });
    });
  }
}
