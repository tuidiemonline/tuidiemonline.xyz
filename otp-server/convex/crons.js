import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();
/* 00:00 giờ Việt Nam (UTC+7) = 17:00 UTC ngày hôm trước.
   Thực chất nhiệm vụ đã tự reset nhờ lọc theo `day`; cron chỉ dọn record cũ. */
crons.daily("reset nhiem vu 00:00 VN", { hourUTC: 17, minuteUTC: 0 }, api.tasks.resetDailyTasks);
export default crons;
