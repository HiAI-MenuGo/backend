import { Response } from 'express';

export class ApiResponse {
  static success<T>(res: Response, data?: T, message: string = 'Success', statusCode: number = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static error(res: Response, errorCode: string, message: string, statusCode: number = 400) {
    return res.status(statusCode).json({
      success: false,
      errorCode,
      message,
    });
  }
}

export default ApiResponse;
