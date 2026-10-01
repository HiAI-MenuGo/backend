import { Response } from 'express';

export class ApiResponse {
  static success<T>(res: Response, data?: T, message: string = 'Success', statusCode: number = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static error(res: Response, errorCode: string, message: string, statusCode: number = 400, details?: unknown) {
    return res.status(statusCode).json({
      success: false,
      errorCode,
      message,
      ...(details !== undefined ? { details } : {}),
    });
  }
}

export default ApiResponse;
