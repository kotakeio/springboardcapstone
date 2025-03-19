// services/gmail.service.js

const { google } = require("googleapis");
const { GmailToken } = require("../models"); // Adjust path if needed

// We'll create a helper function to get a valid OAuth2 client for a given email inbox
async function getOAuth2ClientForEmail(email) {
  // 1. Find the row in DB by googleEmail
  const tokenRow = await GmailToken.findOne({ where: { googleEmail: email } });
  if (!tokenRow) {
    throw new Error(`No tokens found for email: ${email}`);
  }

  // 2. Create an OAuth2 client
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GMAIL_OAUTH_REDIRECT
  );

  // 3. Set existing credentials
  oAuth2Client.setCredentials({
    access_token: tokenRow.accessToken,
    refresh_token: tokenRow.refreshToken,
    scope: tokenRow.scope,
    token_type: tokenRow.tokenType,
    expiry_date: tokenRow.expiryDate,
  });

  // 4. Check if we need to refresh the token
  //    If expiry_date is in the past, or there's no valid access token, refresh it
  const now = Date.now();
  if (!tokenRow.accessToken || (tokenRow.expiryDate && tokenRow.expiryDate < now)) {
    // Attempt to refresh
    const newTokens = await oAuth2Client.refreshAccessToken();
    const { access_token, refresh_token, scope, token_type, expiry_date } = newTokens.credentials;

    // Update DB record
    tokenRow.accessToken = access_token || tokenRow.accessToken;
    tokenRow.refreshToken = refresh_token || tokenRow.refreshToken;
    tokenRow.scope = scope || tokenRow.scope;
    tokenRow.tokenType = token_type || tokenRow.tokenType;
    tokenRow.expiryDate = expiry_date || tokenRow.expiryDate;
    await tokenRow.save();

    // Update the client
    oAuth2Client.setCredentials({
      access_token: tokenRow.accessToken,
      refresh_token: tokenRow.refreshToken,
      scope: tokenRow.scope,
      token_type: tokenRow.tokenType,
      expiry_date: tokenRow.expiryDate,
    });
  }

  return oAuth2Client;
}

// A function to list unread messages for a given email
async function listUnreadMessages(email) {
  // 1. Get a valid OAuth2 client with up-to-date tokens
  const auth = await getOAuth2ClientForEmail(email);

  // 2. Create the gmail instance
  const gmail = google.gmail({ version: "v1", auth });

  // 3. List messages (labelIds=UNREAD)
  const res = await gmail.users.messages.list({
    userId: "me",
    labelIds: ["UNREAD"],
    maxResults: 10, // just an example, fetch up to 10 messages
  });

  const messages = res.data.messages || [];
  return messages; // e.g. [ { id, threadId }, { id, threadId }, ... ]
}

// A function to get the full contents of a given message
async function getMessageDetails(email, messageId) {
  const auth = await getOAuth2ClientForEmail(email);
  const gmail = google.gmail({ version: "v1", auth });

  // "format: full" will return the entire email, including body content
  const res = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  return res.data; // contains payload, headers, snippet, etc.
}

module.exports = {
  listUnreadMessages,
  getMessageDetails,
};
