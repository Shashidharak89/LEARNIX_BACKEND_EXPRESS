export class ApiResponse {
  constructor(statusCode, data, message = "Success", pagination = null) {
    this.success = statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    if (pagination) {
      this.pagination = pagination;
    }
  }

  static success(res, { statusCode = 200, data, message = "Success", pagination = null, extra = {} }) {
    const payload = {
      success: true,
      statusCode,
      message,
      data,
      ...(pagination && { pagination }),
      ...extra,
    };
    return res.status(statusCode).json(payload);
  }
}
