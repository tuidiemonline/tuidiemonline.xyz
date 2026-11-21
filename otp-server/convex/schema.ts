/* ================================================================
convex/schema.ts  ·  BẢN SỬA LỖI CONVEX_ERROR (copy đè vào project)
  cd ~/td-convex/tuidiemonline_termux
  cp ~/storage/downloads/schema.ts convex/schema.ts
  npx convex deploy      (hỏi Y/n -> gõ Y)

Lý do: server mới GHI thêm field (checkinDoneDay / diamonds /
gameTimes / doneGames...) và bảng diamond_logs, nhưng deployment prod
vẫn giữ schema CŨ -> Convex từ chối ghi -> web báo CONVEX_ERROR.
Mọi field để OPTIONAL nên dữ liệu cũ KHÔNG bị lỗi khi deploy.
KHÔNG cần sửa index.html, KHÔNG cần đổi CONVEX_URL, KHÔNG cần build.
================================================================ */
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  /* Tài sản: coins (tổng 4.774) / today (coin hôm nay) / tickets / diamonds */
  users_coins: defineTable({
    uid: v.string(),
    coins: v.optional(v.number()),
    today: v.optional(v.number()),
    todayDate: v.optional(v.string()),
    tickets: v.optional(v.number()),
    diamonds: v.optional(v.number()),
    streak: v.optional(v.number()),
    lastLoginDay: v.optional(v.string()),
    checkinStreak: v.optional(v.number()),
    lastCheckinDay: v.optional(v.string()),
    checkinDoneDay: v.optional(v.string()),
    streak7Day: v.optional(v.string()),
  }).index("by_uid", ["uid"]),

  /* Tiến trình RIÊNG cho từng (uid, taskId, day) */
  task_state: defineTable({
    uid: v.string(),
    taskId: v.string(),
    day: v.string(),
    progress: v.optional(v.number()),
    games: v.optional(v.number()),
    gameElapsed: v.optional(v.number()),
    lastReportAt: v.optional(v.number()),
    lastGameAt: v.optional(v.number()),
    shareVerified: v.optional(v.boolean()),
    spinDone: v.optional(v.boolean()),
    updatedAt: v.optional(v.number()),
    currentGame: v.optional(v.string()),
    gameTimes: v.optional(v.any()),
    doneGames: v.optional(v.array(v.string())),
  }).index("by_uid_task_day", ["uid", "taskId", "day"]),

  /* Chống nhận 2 lần + nguồn LỊCH SỬ coin hôm nay */
  coin_task_claims: defineTable({
    uid: v.string(),
    taskId: v.string(),
    day: v.string(),
    reward: v.optional(v.number()),
    claimedAt: v.optional(v.number()),
  }).index("by_uid_day", ["uid", "day"]),

  /* Lịch sử nhận vé: login3 / checkin1 / streak7 */
  ticket_claims: defineTable({
    uid: v.string(),
    kind: v.string(),
    day: v.string(),
    amount: v.optional(v.number()),
    claimedAt: v.optional(v.number()),
  }).index("by_uid_day", ["uid", "day"]),

  /* BẢNG BỊ THIẾU Ở BẢN TRƯỚC -> exchangeDiamonds insert bị từ chối */
  diamond_logs: defineTable({
    uid: v.optional(v.string()),
    day: v.optional(v.string()),
    amount: v.optional(v.number()),
    points: v.optional(v.number()),
    reason: v.optional(v.string()),
    at: v.optional(v.number()),
  }).index("by_uid_day", ["uid", "day"]),
});
