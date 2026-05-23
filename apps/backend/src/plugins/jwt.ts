// ============================================================================
// JWT PLUGIN (@fastify/jwt)
// ============================================================================
// WHAT:  Registers sign + verify helpers on the Fastify app.
// WHY:   Login creates a token; protected routes verify it.
// SKIP:  Without fastify-plugin wrapper, jwtSign/jwtVerify stay trapped in this
//        plugin scope and auth routes get "jwtSign is not a function".
// HOW:   fp() lifts decorators to the root app; reply.jwtSign + request.jwtVerify work everywhere.
// ============================================================================

import jwt from "@fastify/jwt";
import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { env } from "../config/env";

const jwtPluginImpl: FastifyPluginAsync = async (fastify) => {
  await fastify.register(jwt, {
    secret: env.jwtSecret,
    sign: {
      expiresIn: env.jwtExpiresIn,
    },
  });
};

export const jwtPlugin = fp(jwtPluginImpl);
