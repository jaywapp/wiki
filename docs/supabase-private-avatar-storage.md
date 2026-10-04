# Private Storage에 프로필 사진을 안전하게 저장하기

프로필 사진은 파일 업로드와 DB의 현재 사진 참조를 함께 관리해야 한다. 업로드가 성공해도 프로필 저장이 실패할 수 있고, 서버 저장이 성공해도 응답만 유실될 수 있다. 파일마다 새로운 경로를 만들고, DB의 참조 전환을 조건부로 처리하며, 현재 참조 중인 파일은 삭제하지 못하게 구성하면 이러한 실패를 복구하기 쉽다.

확인일: 2026-10-05. 특정 서비스의 운영 설정이 아닌 일반 설계 패턴이다. 아래의 경합·복구 전략은 공식 Storage 권한 모델과 PostgreSQL 트랜잭션 동작을 바탕으로 한 설계 권고이며, Supabase가 여러 API 요청을 하나의 트랜잭션으로 묶어 준다는 의미가 아니다.

## Private bucket과 새 경로를 사용한다

접근 범위를 로그인 사용자로 제한해야 한다면 private bucket을 선택한다. 공개 URL을 만드는 대신 인증 다운로드나 짧은 수명의 서명 URL을 사용한다. Public bucket의 파일 제공은 조회 RLS를 우회하므로 개인정보 노출 범위와 먼저 맞춰야 한다. [공식 bucket 접근 모델](https://supabase.com/docs/guides/storage/buckets/fundamentals)

객체 경로는 `authenticated-user-id/random-object-id.jpg`처럼 소유자 폴더와 새 UUID를 조합한다. 이름·이메일·전화번호를 경로에 넣지 않는다. 매번 다른 경로로 `upsert: false` 업로드하면 이전 파일을 유지하면서 새 파일을 준비할 수 있고, 같은 URL의 덮어쓰기로 인한 CDN 캐시 문제도 피할 수 있다. [공식 업로드 및 덮어쓰기 안내](https://supabase.com/docs/guides/storage/uploads/standard-uploads)

DB에는 만료되는 서명 URL 대신 객체의 상대 경로를 저장한다. 사진이 없는 상태는 nullable 참조로 표현하고, 읽기 실패 시 이니셜 같은 대체 표시를 제공한다.

## 소유권과 서비스 접근 권한을 함께 검사한다

Storage의 `owner_id`는 업로드 JWT의 사용자 식별자를 바탕으로 설정되는 소유권 값이다. 이 값이 있다는 사실만으로 접근이 제한되지는 않는다. `owner`는 deprecated 필드이므로 새 정책에서는 `owner_id`를 사용한다. 서버 관리자 키로 만든 객체에는 소유자가 없을 수 있으므로 null 소유자를 허용하는 비교를 피한다. [공식 객체 소유권 안내](https://supabase.com/docs/guides/storage/security/ownership)

| 작업 | 일반적인 권한 조건 |
| --- | --- |
| INSERT | 유효한 로그인 계정, 현재 서비스 이용 가능 상태, 본인 폴더, 본인 `owner_id` |
| SELECT | 요청자의 현재 이용 가능 상태와 본인 객체 또는 공개 범위에 포함된 현재 참조 사진 |
| DELETE | 본인 폴더·소유권·현재 이용 가능 상태이며 어떤 현재 사진 참조에도 사용되지 않는 객체 |
| UPDATE | 매번 새 파일을 올리는 설계라면 허용 정책을 만들지 않음 |

`TO authenticated`는 로그인 역할만 제한하므로 폴더·소유권·현재 계정 상태를 추가로 확인해야 한다. 객체 키를 임의로 지정해 다른 사용자의 파일을 현재 사진으로 연결하지 못하도록 DB 저장 경로도 별도로 검사한다. 활성 상태나 계정 제한은 변경될 수 있으므로 사용자 metadata나 오래된 JWT 값만으로 판단하지 않는다.

SDK 작업마다 필요한 RLS를 확인한다. 새 업로드는 INSERT가 필요하고 덮어쓰기는 SELECT·INSERT·UPDATE가 필요하다. 삭제도 SDK 문서에 기재된 SELECT와 DELETE 권한을 함께 고려한다. 현재 파일 삭제만 제한하더라도 본인의 파일 조회까지 막아 정상적인 SDK 흐름을 깨뜨리지 않도록 한다. [공식 Storage RLS 안내](https://supabase.com/docs/guides/storage/security/access-control), [공식 remove 권한 안내](https://supabase.com/docs/reference/javascript/storage-from-remove)

## 입력 사진을 재인코딩하고 서버 제한도 둔다

확장자만 바꾸거나 요청의 `contentType`만 바꿔서는 이미지가 JPEG로 변환되지 않는다. 입력을 디코딩하고 필요한 crop·resize를 적용한 뒤 새 JPEG를 인코딩한다. 크기 제한은 입력 파일과 최종 업로드 바이트에 각각 적용한다.

Expo에서는 시스템 사진 선택기와 ImageManipulator의 crop·resize 및 JPEG 저장 기능을 사용할 수 있다. 사용 중인 Expo SDK에 맞는 패키지 버전을 선택하고 Android와 iOS를 각각 검증한다. 원본 EXIF/GPS를 다시 복사하지 않으며, 메타데이터 제거가 요구사항이라면 실제 출력 파일을 검사한다. 이미지 선택기의 `exif` 반환 옵션을 끄는 것만으로 원본 파일 메타데이터 제거를 보장하지 않는다. [공식 ImagePicker 안내](https://docs.expo.dev/versions/latest/sdk/imagepicker/), [공식 ImageManipulator 저장 형식 안내](https://docs.expo.dev/versions/latest/sdk/imagemanipulator/)

React Native 업로드에서는 로컬 URI 문자열을 이미지 본문으로 전달하지 않는다. Supabase의 JavaScript 안내는 base64 이미지 데이터에서 만든 `ArrayBuffer` 업로드 예제를 제공한다. 실제 업로드 인수가 변환된 JPEG의 바이트인지 확인한다. [공식 ArrayBuffer 업로드 예제](https://supabase.com/docs/reference/javascript/storage-from-upload)

Bucket에도 `allowedMimeTypes`와 `fileSizeLimit`을 설정한다. DB의 참조 저장 시에는 완료된 객체의 bucket·경로·소유자·MIME·크기를 다시 확인한다. 업로드 사전 권한검사와 업로드 완료 후 객체 metadata는 다를 수 있으므로 SDK 구현과 정책의 호환성을 시험해야 한다. MIME metadata는 바이트 내용의 진위를 증명하는 값이 아니며, 강한 파일 검증이 필요하면 신뢰할 수 있는 처리 단계에서 이미지 디코딩을 검증한다. [공식 bucket 업로드 제한](https://supabase.com/docs/guides/storage/buckets/creating-buckets), [공식 업로드 권한검사 구현](https://github.com/supabase/storage/blob/master/src/storage/uploader.ts)

## 업로드, 조건부 참조 전환, 이전 파일 삭제 순으로 처리한다

다음 순서는 여러 저장소에 걸친 변경을 복구하기 위한 애플리케이션 설계다.

1. 현재 사용자와 DB의 기존 사진 경로를 확인한다.
2. 변환한 사진을 새 경로로 업로드한다.
3. 서버에서 본인 계정과 새 객체를 재확인하고, 기존 경로가 예상값과 일치할 때만 DB 참조를 새 경로로 전환한다.
4. 참조 전환이 확인되면 이전 파일을 Storage SDK로 삭제한다.
5. 사진 제거는 DB 참조를 먼저 null로 전환한 뒤 해당 파일을 SDK로 삭제한다.

조건부 갱신(CAS)의 핵심은 다른 요청이 저장한 새 값을 덮어쓰지 않는 것이다. PostgreSQL에서 null까지 비교하는 조건은 `IS NOT DISTINCT FROM`으로 표현할 수 있다. 아래는 조건부 갱신만 보여 주는 일반 예제이며, 완성된 인가 RPC가 아니다. `$1`은 서버가 검증한 현재 계정, `$2`는 새 경로, `$3`은 클라이언트가 읽었던 이전 경로다.

```sql
update app_user_profile
set photo_key = $2
where account_id = $1
  and photo_key is not distinct from $3
returning photo_key;
```

반환 행이 없으면 충돌 또는 대상 없음으로 처리하고 최신 상태를 다시 읽는다. 인증·계정 상태·객체 검증과 참조 갱신을 하나의 서버 DB 트랜잭션 안에서 수행한다. 일반 테이블 API로 사진 경로를 직접 지정할 수 있으면 RPC의 검증을 우회할 수 있으므로 column 권한 또는 trigger로 별도 경계를 둔다. Definer helper가 필요하면 비노출 스키마에 두고 고정 `search_path`, 최소 EXECUTE ACL과 함수 내부 인가를 적용한다. [공식 DB 보안 안내](https://supabase.com/docs/guides/database/postgres/row-level-security), [공식 null 비교 연산자](https://www.postgresql.org/docs/current/functions-comparison.html)

Storage 파일 삭제는 SDK/API로 수행한다. `storage.objects`의 metadata 행만 SQL로 지우면 실제 객체 저장소의 파일이 남아 접근할 수 없는 데이터와 비용을 만들 수 있다. [공식 Storage schema 주의사항](https://supabase.com/docs/guides/storage/schema/design)

## 응답 유실은 저장 실패와 구분한다

RPC의 네트워크 오류가 서버의 rollback을 뜻하지는 않는다. 오류 직후 새 파일을 무조건 삭제하면 이미 저장된 현재 사진을 지울 수 있다. 권장 복구는 DB의 현재 참조를 다시 읽는 것이다.

| 재조회 결과 | 처리 |
| --- | --- |
| 현재 참조가 새 파일 | 저장이 반영된 것으로 처리하고 새 파일 유지 |
| 현재 참조가 다른 파일 | 경합 결과를 화면에 반영하고, 참조되지 않는 새 파일만 정리 |
| 재조회도 실패 | 결과 불명 상태로 두고 새 파일 유지, 상태 조회·정리를 나중에 재시도 |

이를 클라이언트의 판단에만 맡기지 않는다. Storage DELETE 정책 또는 guarded helper에서 현재 사진 참조가 존재하면 삭제 영향이 0이 되도록 막는다. 현재 파일은 사진 제거·교체로 참조를 먼저 해제한 뒤에만 삭제한다.

## 삭제와 저장은 같은 프로필 잠금으로 직렬화한다

참조 여부를 잠금 없이 조회하는 것만으로는 충분하지 않다. 사진 저장과 정리가 동시에 실행되면 삭제 쪽의 오래된 snapshot에는 아직 참조가 없을 수 있다.

서버 참조 전환과 DELETE guard가 같은 본인 프로필 행에 `FOR UPDATE` 잠금을 사용하도록 설계할 수 있다. DELETE guard는 잠금 후 읽은 행의 현재 경로 자체를 검사해야 한다. 바깥 DELETE 문장의 snapshot만으로 현재 참조를 판정하지 않는다. 이 방식은 사진 소유자를 바꾸는 일반 UPDATE가 차단되고, 모든 참조 변경·삭제가 같은 경계를 따를 때 성립한다. [공식 Read Committed와 행 재확인 설명](https://www.postgresql.org/docs/current/transaction-iso.html)

두 자원을 잠그는 순서도 대조한다. 참조 전환이 `profile → object`를 잠그고 Storage 삭제가 `object → profile`을 잠그면 서로 기다리는 상황을 만들 수 있다. 같은 순서를 보장하거나, 프로필 잠금과 삭제 guard로 무결성을 보장할 수 있는 설계에서는 불필요한 객체 잠금을 제거한다. 이는 모든 Storage 구현에 그대로 적용할 수 있는 처방이 아니므로 사용 버전의 삭제 구현과 실제 PostgreSQL 복수 세션 시험으로 확인한다. 교착 상태가 감지되면 PostgreSQL은 한 트랜잭션을 중단하므로 재시도도 고려한다. [공식 행 잠금 및 deadlock 안내](https://www.postgresql.org/docs/current/explicit-locking.html)

현재 참조 역조회가 반복된다면 사진 경로의 nonnull partial index도 검토한다. CAS 충돌 순서 검사와 실제 독립 세션 잠금 검사는 서로 다른 증거다. 한 연결에서 순서만 바꾼 테스트를 병렬 경합 검증으로 표시하지 않는다.

## 서명 URL과 계정 전환을 별도로 다룬다

서명 URL은 발급 후 만료까지 접근 수단이 된다. Supabase는 Storage 서명용 내부 키를 Auth JWT 키와 분리하며, Auth 키 회전·폐기만으로 기존 서명 URL이 취소되지 않는다고 명시한다. 로그아웃이나 화면 캐시 삭제만으로 이미 공유된 URL을 즉시 회수했다고 설명하지 않는다. 짧은 만료 시간을 선택하고 URL을 로그나 영구 DB 필드에 저장하지 않는다. [공식 서명 URL 수명 안내](https://supabase.com/docs/guides/storage/serving/downloads)

여러 아바타는 필요한 경로를 모아 일괄 서명하고 만료보다 짧게 캐시할 수 있다. 로그아웃·계정 전환·현재 이용 권한 상실 시 화면과 캐시는 즉시 비우며, 이전 계정으로 시작한 늦은 응답은 무시한다. 업로드·저장·정리 단계마다 현재 계정을 재확인하고, 계정이 바뀌면 새 계정의 자격 증명으로 이전 계정 파일을 정리하려 하지 않는다. [공식 일괄 서명 API](https://supabase.com/docs/reference/javascript/storage-from-createsignedurls)

## 최소 검증 시나리오

- 본인 업로드·교체·제거와 읽기 실패 대체 표시
- 타인 폴더·소유권 위조·소유자 없는 객체·비활동 또는 미연결 계정 거절
- 직접 사진 경로 수정 차단과 MIME·최종 바이트 크기 제한
- 같은 이전 경로로 시작한 두 요청 중 충돌한 요청의 현재 사진 보존
- 저장 성공 응답 유실 후 현재 파일 정리 요청의 삭제 영향 0
- 저장·삭제 동시 실행의 잠금 순서와 결과, SDK 삭제 후 실제 객체 정리
- 계정 전환 뒤 늦은 응답·서명 URL 캐시·이전 계정 정리 요청 차단
