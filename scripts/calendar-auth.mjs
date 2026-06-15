import { google } from "googleapis";
import { config } from "./config.mjs";
import readline from "readline";

const oAuth2Client = new google.auth.OAuth2(
  config.OPENAI_API_KEY,
  config.SUPABASE_URL,
  "urn:ietf:wg:oauth:2.0:oob"
);
