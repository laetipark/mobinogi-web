# systemd 기반 WAR 자동 배포

이 구성은 `/home/laeti/mobinogi/target` 경로를 감시하고, WAR 파일 변경 시 `docker compose up -d --build app`를 자동으로 실행합니다.

## 구성 파일

- `deploy-war.sh`: 실제 배포 실행 스크립트
- `mobinogi-war-deploy.service`: oneshot 서비스 유닛
- `mobinogi-war-deploy.path`: 파일 변경 감시 유닛
- `install-war-autodeploy.sh`: 설치 스크립트

## 설치

```bash
cd /home/laeti/mobinogi
bash deploy/systemd/install-war-autodeploy.sh /home/laeti/mobinogi
```

## 상태 확인

```bash
systemctl status mobinogi-war-deploy.path
journalctl -u mobinogi-war-deploy.service -f
```

## 동작 트리거

아래 경로에 새 WAR 파일이 생성/교체되면 자동 배포가 실행됩니다.

`/home/laeti/mobinogi/target/`

## 참고 사항

- `Dockerfile`은 `target/*.war` 파일이 정확히 1개일 때를 기준으로 동작합니다.
- 배포 스크립트는 가장 최신 WAR 1개만 남기고 나머지는 정리합니다.
- `.war.original` 파일은 배포 대상에서 제외됩니다.
