declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    MASTER_BOOTSTRAP_TOKEN?: string;
  }
}
