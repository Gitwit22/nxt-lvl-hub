import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

export function validateRequest(schema: ZodTypeAny) {
  return (request: Request, _response: Response, next: NextFunction) => {
    const parsed = schema.parse({
      body: request.body,
      query: request.query,
      params: request.params,
    }) as {
      body?: Request["body"];
      query?: Request["query"];
      params?: Request["params"];
    };

    if (parsed.body) {
      request.body = parsed.body;
    }

    if (parsed.query) {
      Object.assign(request.query as Record<string, unknown>, parsed.query);
    }

    if (parsed.params) {
      Object.assign(request.params as Record<string, string>, parsed.params);
    }

    next();
  };
}