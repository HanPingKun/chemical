import request from "@/utils/request";

// 批量产率预测任务的基础URL
const YIELD_BATCH_BASE_URL = "/yield-task/predict";

// 固定的用户信息，保持一致
const fixedUserInfo = {
  userId: "12345",
  username: "testuser",
  email: "testuser@example.com",
  phone: "1234567890",
};

const YieldBatchAPI = {
  /**
   * 提交批量产率预测任务
   * @param {FormData} formData - 包含任务名称和Excel文件的表单数据
   */
  create(formData) {
    return request({
      url: `${YIELD_BATCH_BASE_URL}/create-batch`,
      method: "post",
      data: formData,
      headers: {
        "Content-Type": undefined, // 让浏览器自动设置 multipart/form-data
        USER_ID: fixedUserInfo.userId,
        USERNAME: fixedUserInfo.username,
        EMAIL: fixedUserInfo.email,
        PHONE: fixedUserInfo.phone,
        Authorization:
          "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsImRlcHRJZCI6MSwiZGF0YVNjb3BlIjoxLCJ1c2VySWQiOjIsImlhdCI6MTcyODE5MzA1MiwiYXV0aG9yaXRpZXMiOlsiUk9MRV9BRE1JTiJdLCJqdGkiOiJhZDg3NzlhZDZlYWY0OWY3OTE4M2ZmYmI5OWM4MjExMSJ9.58YHwL3sNNC22jyAmOZeSm-7MITzfHb_epBIz7LvWeA",
      },
    });
  },

  /**
   * 分页查询批量产率预测历史记录
   * @param {object} queryParams - 分页和查询参数
   */
  getPage(queryParams) {
    return request({
      url: `${YIELD_BATCH_BASE_URL}/query-page-batch`,
      method: "get",
      params: queryParams,
      headers: {
        USER_ID: fixedUserInfo.userId,
        USERNAME: fixedUserInfo.username,
        EMAIL: fixedUserInfo.email,
        PHONE: fixedUserInfo.phone,
        Authorization:
          "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsImRlcHRJZCI6MSwiZGF0YVNjb3BlIjoxLCJ1c2VySWQiOjIsImlhdCI6MTcyODE5MzA1MiwiYXV0aG9yaXRpZXMiOlsiUk9MRV9BRE1JTiJdLCJqdGkiOiJhZDg3NzlhZDZlYWY0OWY3OTE4M2ZmYmI5OWM4MjExMSJ9.58YHwL3sNNC22jyAmOZeSm-7MITzfHb_epBIz7LvWeA",
      },
    });
  },

  /**
   * 根据ID列表删除批量产率预测任务
   * @param {Array<number>} ids - 要删除的任务ID数组
   */
  deleteByIds(ids) {
    return request({
      url: `${YIELD_BATCH_BASE_URL}/delete-batch`,
      method: "delete",
      data: ids, // 后端 @RequestBody 接收
      headers: {
        USER_ID: fixedUserInfo.userId,
        USERNAME: fixedUserInfo.username,
        EMAIL: fixedUserInfo.email,
        PHONE: fixedUserInfo.phone,
        Authorization:
          "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsImRlcHRJZCI6MSwiZGF0YVNjb3BlIjoxLCJ1c2VySWQiOjIsImlhdCI6MTcyODE5MzA1MiwiYXV0aG9yaXRpZXMiOlsiUk9MRV9BRE1JTiJdLCJqdGkiOiJhZDg3NzlhZDZlYWY0OWY3OTE4M2ZmYmI5OWM4MjExMSJ9.58YHwL3sNNC22jyAmOZeSm-7MITzfHb_epBIz7LvWeA",
      },
    });
  },
};

export default YieldBatchAPI;
