/* ================================================================
   BẢO MẬT TUYỆT ĐỐI (làm SAU khi web đã chạy ổn):
   1. Thay REPLACE_WITH_FIREBASE_PROJECT_ID bằng Project ID thật
      (Firebase Console -> Project settings -> General).
   2. Trong index.html đổi: window.TD_CONVEX_AUTH = true;
      (khi đó mọi RPC tự đính kèm Authorization: Bearer <idToken>).
   3. Deploy + chạy: npx convex env set STRICT_AUTH 1
      -> server BỎ QUA p_uid, chỉ tin identity.subject.

   CHƯA làm 3 bước trên: vẫn deploy được, web vẫn chạy,
   nhưng UID lấy từ p_uid (có thể giả qua DevTools).
   Reward / ngày / tiến trình game VẪN được server chốt sẵn.
   ================================================================ */
const PROJECT_ID = "REPLACE_WITH_FIREBASE_PROJECT_ID";

export default {
  providers: [
    {
      domain: `https://securetoken.google.com/${PROJECT_ID}`,
      applicationID: PROJECT_ID,
    },
  ],
};
