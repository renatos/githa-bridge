import { FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../config/index.js';

export const authMiddleware = async (request: FastifyRequest, reply: FastifyReply) => {
  const apiKey = request.headers['x-api-key'];

  if (!apiKey || apiKey !== env.BRIDGE_API_KEY) {
    reply.status(401).send({ error: 'Unauthorized: Invalid or missing API Key' });
  }
};
