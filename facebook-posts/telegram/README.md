# Telegram approval setup

This folder lets the daily Facebook promo workflow send approval drafts to Telegram.

Required private config:

```bash
TELEGRAM_BOT_TOKEN=your_botfather_token
TELEGRAM_CHAT_ID=your_chat_id
```

Save those values in `telegram.env` beside these scripts. Keep `telegram.env` private.

How to get a chat ID:

1. Create a Telegram bot with BotFather and copy the bot token.
2. Put the token in `telegram.env`.
3. Open the bot in Telegram and send `/start`.
4. Run `get_chat_id.sh`.
5. Copy the `chat.id` value into `TELEGRAM_CHAT_ID` in `telegram.env`.

Send a test:

```bash
./send_approval_to_telegram.sh "Test approval message"
```

Approval buttons:

```bash
./send_approval_to_telegram.sh "Draft text" "../assets/example.png" "draft-id"
./check_buttons.sh
```

Button behavior:

- `Approve`: attempts to publish the matching draft to Facebook.
- `Reject`: confirms the draft will not be posted.
- `Edit`: asks Abdussomad to reply with requested changes.

Facebook posting requires `facebook-posts/facebook.env`:

```bash
FACEBOOK_PAGE_ID=your_page_id
FACEBOOK_PAGE_ACCESS_TOKEN=your_page_access_token
```
