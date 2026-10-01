import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import ApiResponse from '../utils/response';

/**
 * Middleware validate request data using Zod schema.
 * Supports validating body, query, and params.
 */
export function validate(schema: AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      // Replace req properties with parsed/sanitized versions
      req.body = parsed.body ?? req.body;
      req.query = parsed.query ?? req.query;
      req.params = parsed.params ?? req.params;
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.errors.map((e) => ({
          field: e.path.join('.').replace(/^(body|query|params)\.?/, ''),
          message: e.message,
        }));
        return ApiResponse.error(res, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ', 400, issues);
      }
      return ApiResponse.error(res, 'INTERNAL_SERVER_ERROR', 'Lỗi xác thực dữ liệu', 500);
    }
  };
}

export default validate;
