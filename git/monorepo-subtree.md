# Git Subtree로 모노레포 구성하기

여러 레포를 하나의 모노레포로 통합할 때 사용하는 패턴.

## 초기 설정

```bash
# 1. 모노레포 생성 및 초기 커밋
gh repo create jaywapp/[monorepo-name] --public
git clone https://github.com/jaywapp/[monorepo-name].git
cd [monorepo-name]
# README.md, .gitignore 작성 후
git add . && git commit -m "chore: init monorepo" && git push origin master
```

## 레포 편입 (subtree add)

```bash
git subtree add --prefix=[prefix-path] https://github.com/[org]/[repo].git [branch] --squash
# 예: git subtree add --prefix=src/Jaywapp.Wpf https://github.com/jaywapp/Jaywapp.Wpf.git master --squash
```

- `--squash`: 원본 커밋 히스토리를 하나로 압축 (모노레포 히스토리 오염 방지)
- `[prefix-path]`: 모노레포 내 서브디렉터리 경로

## 이름 변경하여 편입

원본 레포명과 다른 이름으로 편입할 때:

```bash
# AgentTeam → software-engineering-team 으로 편입
git subtree add --prefix=teams/software-engineering-team https://github.com/jaywapp/AgentTeam.git master --squash
```

## 이후 업데이트 (subtree pull)

편입된 서브디렉터리를 원본 레포 최신으로 동기화:

```bash
git subtree pull --prefix=[prefix-path] https://github.com/[org]/[repo].git [branch] --squash -m "chore: sync [repo]"
```

## 기존 레포 아카이브

편입 완료 후 원본 레포 아카이브:

```bash
gh repo archive [org]/[repo] --yes
```

## 주의사항

- `working tree has modifications` 오류 시: 미커밋 변경사항 먼저 커밋 후 subtree add
- 원본 레포에 `master`가 없고 `develop`만 있는 경우: branch를 `develop`으로 지정
