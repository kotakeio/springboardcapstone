// ------------------------------------------------------------------
// Module:    services/gmail.service.js
// Author:    John Gibson
// Created:   2025-04-21
// Purpose:   Helper functions to authenticate with Gmail and
//            list or retrieve message details via Google APIs.
// ------------------------------------------------------------------

/**
 * @module services/gmail.service.js
 * @description
 *   - Obtains OAuth2 clients for Gmail using stored tokens in the database.
 *   - Fetches up to 10 unread messages for a given inbox.
 *   - Retrieves full details of a specified message.
 */

// ─────────────── Dependencies ───────────────

const { google } = require("googleapis");
const { GmailToken } = require("../models");

// ─────────────── Utility Functions ───────────────

/**
 * Get a valid OAuth2 client for a given email, refreshing tokens if needed.
 *
 * @param {string} email  User's Google email address.
 * @returns {Promise<google.auth.OAuth2>} OAuth2 client with valid credentials.
 * @throws {Error} If no token record exists for the given email.
 */
async function getOAuth2ClientForEmail(email) {
  // (1) Retrieve token record from DB by googleEmail
  const tokenRow = await GmailToken.findOne({ where: { googleEmail: email } });
  if (!tokenRow) {
    throw new Error(`No tokens found for email: ${email}`);
  }

  // (2) Initialize OAuth2 client
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GMAIL_OAUTH_REDIRECT
  );

  // (3) Apply stored credentials
  oAuth2Client.setCredentials({
    access_token:  tokenRow.accessToken,
    refresh_token: tokenRow.refreshToken,
    scope:         tokenRow.scope,
    token_type:    tokenRow.tokenType,
    expiry_date:   tokenRow.expiryDate
  });

  // (4) Refresh token if missing or expired
  const now = Date.now();
  if (!tokenRow.accessToken || (tokenRow.expiryDate && tokenRow.expiryDate < now)) {
    // using refreshAccessToken to maintain valid credentials
    const newTokens = await oAuth2Client.refreshAccessToken();
    const creds     = newTokens.credentials;

    // Update DB record with any new values
    tokenRow.accessToken  = creds.access_token  || tokenRow.accessToken;
    tokenRow.refreshToken = creds.refresh_token || tokenRow.refreshToken;
    tokenRow.scope        = creds.scope         || tokenRow.scope;
    tokenRow.tokenType    = creds.token_type    || tokenRow.tokenType;
    tokenRow.expiryDate   = creds.expiry_date   || tokenRow.expiryDate;
    await tokenRow.save();

    // Re‑apply refreshed credentials to client
    oAuth2Client.setCredentials({
      access_token:  tokenRow.accessToken,
      refresh_token: tokenRow.refreshToken,
      scope:         tokenRow.scope,
      token_type:    tokenRow.tokenType,
      expiry_date:   tokenRow.expiryDate
    });
  }

  return oAuth2Client;
}

// ─────────────── Core Functions ───────────────

/**
 * List up to 10 unread messages for a given Gmail inbox.
 *
 * @param {string} email  User's Google email address.
 * @returns {Promise<Array<{id: string, threadId: string}>>}
 *   Array of message identifier objects.
 */
async function listUnreadMessages(email) {
  // (1) Acquire OAuth2 client with valid tokens
  const auth = await getOAuth2ClientForEmail(email);

  // (2) Instantiate Gmail API client
  const gmail = google.gmail({ version: "v1", auth });

  // (3) Fetch UNREAD messages, limited to 10
  const res = await gmail.users.messages.list({
    userId:   "me",
    labelIds: ["UNREAD"],
    maxResults: 10
  });

  // Return message list or empty array
  return res.data.messages || [];
}

/**
 * Retrieve full details of a specific Gmail message.
 *
 * @param {string} email      User's Google email address.
 * @param {string} messageId  Gmail message ID to fetch.
 * @returns {Promise<Object>} Full message resource including payload, headers, and snippet.
 */
async function getMessageDetails(email, messageId) {
  // Acquire OAuth2 client with valid tokens
  const auth  = await getOAuth2ClientForEmail(email);
  const gmail = google.gmail({ version: "v1", auth });

  // Fetch message in full format
  const res = await gmail.users.messages.get({
    userId: "me",
    id:     messageId,
    format: "full"
  });

  return res.data;
}

// ─────────────── Exports ───────────────

module.exports = {
  listUnreadMessages,
  getMessageDetails
};
