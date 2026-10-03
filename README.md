# 돌잡이 QR 웹게임

돌잔치 참석자가 QR 코드로 접속해 예상 물품을 고르고, 진행자가 실제 결과를 입력하면 우승자를 발표하는 웹게임입니다. Node.js와 SQLite로 동작하며, 사진은 서버의 데이터베이스에 별도로 저장됩니다.

## 실행

Node.js 24 이상에서:

```sh
npm ci
npm start
```

- 행사 화면: `http://localhost:3000/`
- 참여 화면: `http://localhost:3000/join`
- 진행자 화면: `http://localhost:3000/admin`

처음 실행하면 `data/admin-password.txt`에 임의의 관리자 암호가 생성됩니다. `ADMIN_PASSWORD` 환경변수로 초기 암호를 지정할 수도 있습니다. 기존 데이터베이스가 있으면 환경변수 변경만으로 암호가 바뀌지 않습니다.

이 공개 저장소에는 예시 참석자 17명이 들어 있습니다. 개인 행사에 사용할 때는 `lib/game.mjs`의 예시 명단을 별도의 비공개 사본에서 수정하세요. 실제 이름이나 얼굴 사진이 들어간 사본은 공개 저장소에 커밋하지 마세요.

## NAS 배포

`docker compose up -d --build`로 실행할 수 있습니다. `party-data` 볼륨에 행사 데이터가 유지됩니다. 외부 접속을 사용할 때는 HTTPS 역방향 프록시를 구성하고 `PUBLIC_URL=https://example.synology.me`를 지정하거나 진행자 화면에서 QR 주소를 저장하세요. [NAS 배포 안내](NAS-DEPLOY.md)를 참고하세요.

## 개인정보

참석자 이름, 사진, 투표, 세션, 관리자 암호는 `data/` 또는 Docker 볼륨에 저장되며 Git에서 제외됩니다. 공개 배포 전 `git status`와 `git ls-files`로 포함 파일을 확인하세요.
