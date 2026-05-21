import request from "@/utils/request";

const CLASSIFY_SINGLE_BASE_URL = "/classify-task/predict";

const ClassifySingleAPI = {
  // 提交反应分类任务
  createSingleTask(formData) {
    return request({
      url: `${CLASSIFY_SINGLE_BASE_URL}/create-single`,
      method: "post",
      data: formData,
      // FormData 的 Content-Type 由 request.js 拦截器自动处理
    });
  },

  // 分页查询反应分类历史记录
  getPage(queryParams) {
    return request({
      url: `${CLASSIFY_SINGLE_BASE_URL}/query-page`,
      method: "get",
      params: queryParams,
    });
  },

  // 删除反应分类任务
  deleteByIds(ids) {
    return request({
      url: `${CLASSIFY_SINGLE_BASE_URL}/delete`,
      method: "delete",
      data: ids,
    });
  },
};

export default ClassifySingleAPI;
