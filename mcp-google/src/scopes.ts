// The broadest reasonable set of scopes for "mostly all services the
// account allows" without requesting anything destructive-by-default (e.g.
// we ask for gmail.modify, which covers read/send/label, rather than the
// full-mailbox-including-delete `mail.google.com` scope).
export const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/tasks",
  "https://www.googleapis.com/auth/contacts.readonly",
];
