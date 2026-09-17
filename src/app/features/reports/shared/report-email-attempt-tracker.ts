type IdempotencyKeyFactory = () => string;

export class ReportEmailAttemptTracker {
  private signature = '';
  private idempotencyKey = '';

  constructor(private readonly createKey: IdempotencyKeyFactory = () => crypto.randomUUID()) {}

  keyFor(payload: unknown): string {
    const signature = JSON.stringify(payload);
    if (!this.idempotencyKey || signature !== this.signature) {
      this.signature = signature;
      this.idempotencyKey = this.createKey();
    }
    return this.idempotencyKey;
  }

  clear(): void {
    this.signature = '';
    this.idempotencyKey = '';
  }
}
