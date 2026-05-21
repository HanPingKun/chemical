import request from "@/utils/request";

const CLASSIFY_BATCH_BASE_URL = "/classify-task/predict";

const ClassifyBatchAPI = {
  /**
   * 提交批量反应分类任务
   * @param {FormData} formData - 包含任务名称、模型信息和文件的表单数据
   */
  create(formData) {
    return request({
      url: `${CLASSIFY_BATCH_BASE_URL}/create-batch`,
      method: "post",
      data: formData,
    });
  },

  /**
   * 分页查询批量反应分类历史记录
   * @param {object} queryParams - 分页和查询参数 (current, size, taskName)
   */
  getPage(queryParams) {
    return request({
      url: `${CLASSIFY_BATCH_BASE_URL}/query-page-batch`,
      method: "get",
      params: queryParams,
    });
  },

  /**
   * 根据 ID 列表批量删除任务
   * @param {Array<number>} ids - 要删除的任务ID数组
   */
  deleteByIds(ids) {
    return request({
      url: `${CLASSIFY_BATCH_BASE_URL}/delete-batch`,
      method: "delete",
      data: ids,
    });
  },
};

export default ClassifyBatchAPI;
