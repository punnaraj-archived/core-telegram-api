// Wraps a single Google OAuth2 identity (one refresh token = one Google
// account, authorized for whatever scopes were granted during
// `npm run oauth-setup`) and exposes both:
//  - typed googleapis service clients for the common services (Gmail,
//    Calendar, Drive, Sheets, Docs, Tasks, People), and
//  - a generic authorized-request escape hatch for any other Google REST
//    API the granted scopes cover, so this server isn't limited to the
//    services we bothered to write dedicated tools for.
import { google } from "googleapis";
import type { Config } from "./config.js";

// Deliberately typed off googleapis's own re-exported OAuth2 constructor
// rather than importing `google-auth-library` directly: googleapis vendors
// its own copy of that package, and mixing a top-level dependency on it
// with googleapis' nested copy produces structurally-incompatible
// `OAuth2Client` types even though they're the same class at runtime.
type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

export class GoogleClient {
  readonly auth: OAuth2Client;

  constructor(config: Config) {
    this.auth = new google.auth.OAuth2(
      config.googleClientId,
      config.googleClientSecret,
      config.googleRedirectUri,
    );
    this.auth.setCredentials({ refresh_token: config.googleRefreshToken });
  }

  get gmail() {
    return google.gmail({ version: "v1", auth: this.auth });
  }

  get calendar() {
    return google.calendar({ version: "v3", auth: this.auth });
  }

  get drive() {
    return google.drive({ version: "v3", auth: this.auth });
  }

  get sheets() {
    return google.sheets({ version: "v4", auth: this.auth });
  }

  get docs() {
    return google.docs({ version: "v1", auth: this.auth });
  }

  get tasks() {
    return google.tasks({ version: "v1", auth: this.auth });
  }

  get people() {
    return google.people({ version: "v1", auth: this.auth });
  }

  /**
   * Makes an arbitrary authorized request against any Google API endpoint,
   * for services without a dedicated tool. `path` is relative to
   * https://www.googleapis.com (e.g. "/photoslibrary/v1/albums") unless it's
   * already an absolute URL.
   */
  async request<T = unknown>(options: {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    path: string;
    params?: Record<string, unknown>;
    body?: unknown;
  }): Promise<T> {
    const url = /^https?:\/\//.test(options.path)
      ? options.path
      : `https://www.googleapis.com${options.path.startsWith("/") ? "" : "/"}${options.path}`;

    const response = await this.auth.request<T>({
      url,
      method: options.method,
      params: options.params,
      data: options.body,
    });
    return response.data;
  }
}
