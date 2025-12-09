import { FastifyRequest, FastifyReply } from 'fastify';

import { logInfo } from '../../logger';

export async function requestLogger(request: FastifyRequest, _reply: FastifyReply) {
  const { method, url } = request;
  const { body: _body } = request;
  const { query: _query } = request;
  const { params: _params } = request;

  logInfo(`API 요청: ${method} ${url}`);
}
