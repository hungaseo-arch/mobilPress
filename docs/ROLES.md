# 계정 권한 관리 SQL

Neon 콘솔 → **SQL Editor** 에서 실행합니다.

> ⚠️ 콘솔 Auth → Users 의 "Admin" 배지(Make admin)는 로그인 시스템(Better Auth) 내부 역할이며
> **앱 권한과 무관합니다.** 앱 권한은 아래의 `public.user_roles` 테이블로만 관리합니다.

## 역할별 권한

| 역할 | 조회 | 등록·수정 | 삭제 |
|---|---|---|---|
| admin | ✅ | ✅ | ✅ |
| staff | ✅ | ✅ | ❌ |
| user (가입 기본값) | ✅ | ❌ | ❌ |

권한 변경 후 앱을 **새로고침**하면 반영됩니다.

## 이메일로 권한 부여 (권장)

`'admin'` 자리를 `'staff'` 로 바꾸면 staff 부여입니다.

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from neon_auth."user" where email = 'jhseo@ptascendo.com'
on conflict (user_id) do update set role = excluded.role;
```

### 운영팀 staff 일괄 부여 (2026-07-13)

```sql
insert into public.user_roles (user_id, role)
select id, 'staff' from neon_auth."user"
where email in (
  'firmanoey99@gmail.com',
  'arunzaelani26@gmail.com',
  'likevape8@gmail.com',
  'harunallrasyid123@gmail.com'
)
on conflict (user_id) do update set role = excluded.role;
```

### admin 부여 (2026-07-13)

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from neon_auth."user" where email = 'wisnunu354@gmail.com'
on conflict (user_id) do update set role = excluded.role;
```

> ⚠️ 대상 4명이 **먼저 앱에서 회원가입**되어 있어야 `neon_auth."user"` 에 존재합니다.
> 아직 가입 전이면 이 쿼리는 해당 계정을 건너뜁니다(가입 후 재실행). 실행 후 아래 현황 조회로 4명이 `staff` 인지 확인하세요.

## USER ID 로 권한 부여

콘솔 Auth → Users → 사용자 클릭 → User Details 의 **ID** 복사:

```sql
insert into public.user_roles (user_id, role)
values ('<USER_ID>', 'staff')
on conflict (user_id) do update set role = excluded.role;
```

## 권한 회수 (조회 전용으로 되돌리기)

```sql
update public.user_roles set role = 'user'
where user_id = (select id from neon_auth."user" where email = '대상이메일');
```

## 현재 권한 현황 조회

```sql
select u.email, u.name, coalesce(r.role, 'user') as role, u."createdAt" as joined
from neon_auth."user" u
left join public.user_roles r on r.user_id = u.id
order by u."createdAt";
```

## 참고

- 가입만 하고 `user_roles` 에 행이 없는 계정은 자동으로 `user`(조회 전용) 취급됩니다.
- 계정을 삭제 후 재가입하면 USER ID 가 바뀌므로 권한 SQL 을 다시 실행해야 합니다
  (이메일 기준 SQL 을 쓰면 새 ID 가 자동 반영됩니다).
- 모든 데이터 변경 이력은 `public.audit_logs` 에서 확인:
  ```sql
  select changed_at, changed_by, table_name, action from public.audit_logs
  order by changed_at desc limit 30;
  ```
