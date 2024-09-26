import type { NextApiRequest, NextApiResponse } from 'next';
import net from 'net';

async function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => {
      resolve(false);
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port);
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const port3001Available = await checkPort(3001);
  res.status(200).json({ port3001Available });
}
