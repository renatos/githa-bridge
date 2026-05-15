import WebSocket from 'ws';
import { env } from '../config/index.js';

export class OpenClawHandler {
  static async handle(action: string, params: any) {
    if (action === 'whatsapp:send') {
      return this.sendMessage(params.to, params.message);
    }
    throw new Error(`Unsupported WhatsApp action: ${action}`);
  }

  private static async sendMessage(to: string, message: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(env.OPENCLAW_WS_URL, {
        headers: {
          'Authorization': `Bearer ${env.OPENCLAW_TOKEN}`
        }
      });

      const timeout = setTimeout(() => {
        ws.terminate();
        reject(new Error('OpenClaw timeout after 15 seconds'));
      }, 15000);

      ws.on('open', () => {
        const payload = {
          type: 'call',
          method: 'node.invoke',
          params: {
            method: 'message.send',
            params: {
              channel: 'whatsapp',
              target: to,
              message: message
            }
          },
          id: `bridge-${Date.now()}`
        };

        ws.send(JSON.stringify(payload));
      });

      ws.on('message', (data) => {
        clearTimeout(timeout);
        const response = JSON.parse(data.toString());
        ws.close();
        
        if (response.error) {
          reject(new Error(response.error.message || 'Unknown OpenClaw error'));
        } else {
          resolve(response.result);
        }
      });

      ws.on('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket error: ${err.message}`));
      });

      ws.on('close', (code) => {
        clearTimeout(timeout);
        if (code !== 1000 && code !== 1005) {
          reject(new Error(`WebSocket closed unexpectedly with code ${code}`));
        }
      });
    });
  }
}
