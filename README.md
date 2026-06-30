# 테트리스 (교육용)

HTML, CSS, JavaScript만 사용하는 브라우저 테트리스 게임입니다.  
빌드 도구와 외부 라이브러리 없이 동작하며, 입문자가 웹 게임 구조를 학습하기 위한 프로젝트입니다.

## 구현 기능

- 10열 × 20행 CSS Grid 보드
- 7종 테트로미노 (I, O, T, S, Z, J, L)
- 자동 낙하, 충돌 판정, 블록 고정
- 키보드 조작 (이동·회전·소프트/하드 드롭)
- 라인 삭제 및 점수 계산
- 게임 오버 및 재시작

## 실행 방법

### 온라인 (GitHub Pages)

배포 후 아래 URL에서 바로 플레이할 수 있습니다.

**https://chang-jin.github.io/tetris-cursor/**

### 로컬 개발

`type="module"`을 사용하므로 **`http://` 로컬 서버**로 실행해야 합니다.  
`file://`로 열면 CORS 오류가 발생합니다.

#### Live Server (권장)

1. Cursor/VS Code에서 **Live Server** 확장 설치
2. `index.html` 우클릭 → **Open with Live Server**

#### Python 내장 서버

```bash
python -m http.server 5500
```

브라우저에서 [http://localhost:5500](http://localhost:5500) 접속

## 조작법

| 키 | 동작 |
|----|------|
| `ArrowLeft` (←) | 왼쪽 이동 |
| `ArrowRight` (→) | 오른쪽 이동 |
| `ArrowDown` (↓) | 한 칸 빠르게 내리기 (소프트 드롭) |
| `ArrowUp` (↑) | 블록 회전 (충돌 시 취소, 벽 킥 지원) |
| `Space` | 즉시 바닥까지 낙하 (하드 드롭) |

모든 조작은 `canMove` 충돌 판정을 통과할 때만 적용됩니다.

## 점수 규칙

| 한 번에 삭제한 줄 수 | 점수 |
|---------------------|------|
| 1줄 | 100 |
| 2줄 | 300 |
| 3줄 | 500 |
| 4줄 | 800 |

## 게임 오버

- 새 블록을 스폰 위치에 둘 수 없으면 게임 오버입니다.
- 낙하·키보드 조작이 중지되고 **게임 오버** 메시지가 표시됩니다.
- **재시작** 버튼으로 보드·점수·타이머·상태를 초기화합니다.

## 품질 점검 방법

1. `http://` 환경에서 게임 로드 (로컬 서버 또는 GitHub Pages)
2. 개발자 도구(F12) → Console에 빨간 에러 없는지 확인
3. 자동 낙하, 좌우 이동, 회전, 소프트/하드 드롭 동작 확인
4. 한 줄을 가득 채워 라인 삭제 및 점수 증가 확인
5. 보드를 채워 게임 오버 후 **재시작** 동작 확인

## GitHub Pages 배포 방법

1. 이 저장소를 GitHub에 push합니다.
2. 저장소 **Settings → Pages** 이동
3. **Source**: Deploy from a branch
4. **Branch**: `main` / **Folder**: `/ (root)` 선택 후 Save
5. 1~3분 후 **https://chang-jin.github.io/tetris-cursor/** 에서 확인

### 배포 URL 형식

| 저장소 유형 | URL 형식 |
|-------------|----------|
| 프로젝트 사이트 | `https://<username>.github.io/<repository>/` |
| 사용자 사이트 | `https://<username>.github.io/` |

## 프로젝트 구조

```
tetris-cursor/
├── index.html   # 게임 화면 구조
├── style.css    # 레이아웃·스타일
├── script.js    # 게임 로직
└── README.md    # 문서
```

## 보드 크기 변경

- `script.js`의 `COLS`, `ROWS` 상수
- `style.css`의 `:root` 변수 `--cols`, `--rows`

`script.js`가 실행 시 `--cols`, `--rows` CSS 변수를 갱신합니다.
