import { FastifyRequest, FastifyReply } from 'fastify';

import { logDebug } from '../../logger';

export async function requestLogger(request: FastifyRequest, _reply: FastifyReply) {
  const { method, url } = request;
  const { body: _body } = request;
  const { query: _query } = request;
  const { params: _params } = request;

  logDebug(`API 요청: ${method} ${url}`);
}
