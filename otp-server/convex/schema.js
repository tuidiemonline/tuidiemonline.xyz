import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/* 4 bảng. Mọi record tiến trình đều có `day` (YYYY-MM-DD giờ VN)
   nên sang 00:00 tự động reset mà không cần xoá dữ liệu. */
export default defineSchema({
  users_coins: defineTable({
    uid: v.string(),
    coins: v.number(),
    today: v.number(),
    todayDate: v.string(),
    tickets: v.number(),
    streak: v.number(),
    lastLoginDay: v.string(),
  }).index("by_uid", ["uid"]),

  coin_task_claims: defineTable({
    uid: v.string(),
    taskId: v.string(),
    day: v.string(),
    reward: v.number(),
    claimedAt: v.number(),
  }).index("by_uid_day", ["uid", "day"]),

  task_state: defineTable({
    uid: v.string(),
    taskId: v.string(),
    day: v.string(),
    progress: v.number(),
    games: v.number(),
    gameElapsed: v.number(),
    lastReportAt: v.optional(v.number()),  // nhịp tim do SERVER ghi
    lastGameAt: v.number(),
    shareVerified: v.boolean(),
    spinDone: v.boolean(),
    updatedAt: v.number(),
  }).index("by_uid_task_day", ["uid", "taskId", "day"]),

  ticket_claims: defineTable({
    uid: v.string(),
    kind: v.string(),
    day: v.string(),
    amount: v.number(),
    claimedAt: v.number(),
  }).index("by_uid_day", ["uid", "day"]),
});
