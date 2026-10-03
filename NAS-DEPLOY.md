# Synology NAS 배포

1. DSM의 Container Manager에서 이 소스를 프로젝트로 등록하거나 NAS에서 `docker compose up -d --build`를 실행합니다.
2. 데이터 유지를 위해 `party-data` 볼륨을 그대로 보존합니다.
3. 같은 네트워크에서 `http://NAS_IP:3000/api/state`와 행사 화면을 확인합니다.
4. 외부 접속이 필요하면 Synology DDNS, Let's Encrypt 인증서, HTTPS 역방향 프록시를 구성합니다. 프록시 대상은 NAS의 HTTP 3000 포트입니다.
5. 해당 도메인 서비스 항목에 도메인 인증서를 지정하고, 브라우저에서 HTTPS 인증서가 정상인지 확인합니다.
6. `PUBLIC_URL=https://example.synology.me`를 설정하거나 진행자 화면에서 QR 접속 주소를 저장합니다.
7. 휴대폰의 모바일 데이터에서 `/join` 화면을 확인한 후 새 QR 이미지를 배포합니다.

관리자 암호, 실제 참석자 명단, 얼굴 사진, SQLite 데이터베이스, `.env` 파일은 공개 저장소에 포함하지 마세요.
