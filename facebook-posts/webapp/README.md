# Facebook Creative Uploader

Local webapp untuk upload creative gambar/video + salespage link, kemudian publish terus ke Facebook Page menggunakan `../facebook.env` dan `../post_to_facebook.sh`.

## Run

```bash
cd "/Users/abdussomad/Documents/Abdussomad's Buddy"
facebook-posts/webapp/run.sh
```

Buka:

```text
http://127.0.0.1:8787
```

## Security

Default server bind ke `127.0.0.1`, jadi hanya boleh dibuka dari Mac ini. Kalau mahu expose ke LAN atau tunnel, copy `.env.example` ke `.env` dan set `WEBAPP_UPLOAD_PASSWORD`.

## Output

Runtime files disimpan di:

- `facebook-posts/webapp/uploads/`
- `facebook-posts/webapp/posts/`

Setiap post ada metadata JSON dengan post ID, permalink, comment ID, dan response Graph API.
