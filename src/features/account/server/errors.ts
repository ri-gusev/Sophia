export class AccountError extends Error {
  readonly status: number;
  readonly retryAfter?: number;

  constructor(status: number, message: string, retryAfter?: number) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

export const accountUnavailable = () => new AccountError(503, "Сервис аккаунтов временно недоступен. Попробуй позже.");
