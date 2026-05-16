import { spawn } from 'child_process';

export class OpenClawHandler {
  static async handle(action: string, params: any) {
    if (action === 'whatsapp:send') {
      return this.sendMessage(params.to, params.message);
    }
    throw new Error(`Unsupported WhatsApp action: ${action}`);
  }

  private static async sendMessage(to: string, message: string): Promise<any> {
    // 1. Normalização do número
    let normalizedTo = to.replace(/\D/g, ''); // Remove tudo que não for dígito

    // Se tiver 10 ou 11 dígitos, assumimos que é Brasil e falta o 55
    if (normalizedTo.length === 10 || normalizedTo.length === 11) {
      normalizedTo = '55' + normalizedTo;
    }

    console.log(`[Bridge] Processing message to: ${normalizedTo}`);

    // 2. Estratégia de Envio
    const targets = [normalizedTo];

    // Se for Brasil (55) e tiver 13 dígitos (incluindo o 9 adicional)
    // Adicionamos a versão sem o dígito 9 para garantir a entrega
    if (normalizedTo.startsWith('55') && normalizedTo.length === 13) {
      const withoutNine = normalizedTo.substring(0, 4) + normalizedTo.substring(5);
      targets.push(withoutNine);
      console.log(`[Bridge] Brazilian number detected. Will also attempt send to: ${withoutNine}`);
    }

    // 3. Execução dos comandos (Sequencial para não sobrecarregar o CLI)
    const results = [];
    for (const target of targets) {
      try {
        const result = await this.executeOc(target, message);
        results.push(result);
      } catch (err: any) {
        console.error(`[Bridge] Error sending to ${target}: ${err.message}`);
        results.push({ target, status: 'error', error: err.message });
      }
    }

    return {
      status: 'completed',
      results
    };
  }

  private static executeOc(target: string, message: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const args = [
        'message',
        'send',
        '--channel', 'whatsapp',
        '--target', target,
        '--message', message
      ];

      // Path to the binary configured for openclaw user
      const child = spawn('/home/openclaw/.nvm/versions/node/v24.15.0/bin/openclaw', args);

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => { stdout += data.toString(); });
      child.stderr.on('data', (data) => { stderr += data.toString(); });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ target, status: 'success', output: stdout.trim() });
        } else {
          reject(new Error(`Exit code ${code}: ${stderr.trim()}`));
        }
      });

      child.on('error', (err) => {
        reject(new Error(`Spawn error: ${err.message}`));
      });
    });
  }
}
