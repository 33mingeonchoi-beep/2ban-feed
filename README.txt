2반피드 설치 안내

1) app.js 파일을 메모장 또는 VS Code로 엽니다.
2) 아래 두 줄을 본인의 값으로 바꿉니다.
   const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co";
   const SUPABASE_PUBLISHABLE_KEY = "YOUR_SUPABASE_PUBLISHABLE_KEY";
   URL은 https://fiagrhzcvxpqwguyneck.supabase.co
   Publishable key는 사용자가 제공한 sb_publishable_... 값입니다.
3) Secret key(sb_secret_...)는 절대 입력하지 마세요.
4) GitHub 저장소 2ban-feed의 Add file > Upload files에서
   index.html, style.css, app.js, README.txt를 업로드하고 Commit changes를 누릅니다.
5) Settings > Pages에서 main / (root) 설정을 저장하면 배포됩니다.

중요:
- Supabase 테이블과 RLS 정책, 2ban-images Storage 버킷 및 Storage 정책이 먼저 준비되어 있어야 합니다.
- 이 앱은 profiles.nickname, posts.image_url/caption, stories.expires_at, class_board.category/title/content/due_date 컬럼을 사용합니다.
- 테이블 컬럼이나 정책이 다르면 오류가 날 수 있습니다. 오류 화면을 보내면 맞춰 수정할 수 있습니다.
- 공개 버킷의 이미지는 URL을 아는 사람이 볼 수 있습니다.
- Publishable key는 브라우저에 들어가도 되지만, 보안은 Supabase RLS 정책으로 강제해야 합니다.
